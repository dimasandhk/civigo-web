import { createServiceClient } from "@/lib/supabase/service";
import { loadTicketContext, requireAgencyAccess, resolveCaller } from "./authz";
import {
  fail,
  isQueueStatus,
  isUuid,
  WAITING_STATUSES,
  type Failure,
  type QueueStatus,
} from "./shared";
import { parseTimeBlock, todayInJakarta } from "./time";

/**
 * Ticket lifecycle, driven by the buttons in the admin dashboard.
 *
 *   scheduled ──check-in──> present ──dipanggil──> served ──> completed
 *       │                      │                     │
 *       └──────────────────────┴─────────────────────┴──────> skipped
 *
 * `completed` and `skipped` are terminal. A skipped ticket does not go back to
 * `scheduled` — the citizen books a replacement through the reschedule
 * endpoint, which leaves the skip on the record.
 */
const TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  scheduled: ["present", "served", "skipped"],
  present: ["served", "skipped"],
  served: ["completed", "skipped"],
  completed: [],
  skipped: [],
};

const STATUS_LABEL: Record<QueueStatus, string> = {
  scheduled: "terjadwal",
  present: "hadir",
  served: "dilayani",
  completed: "selesai",
  skipped: "hangus",
};

export type TicketSummary = {
  id: string;
  queue_number: string;
  status: QueueStatus;
  schedule_date: string;
  time_block: string;
  counter_id: number | null;
  counter_name: string | null;
  service: { id: number; name: string };
  agency: { id: number; name: string };
};

export type StatusResult = { ok: true; ticket: TicketSummary } | Failure;

/**
 * Checks that a counter can actually take a call: it must exist, be active, and
 * belong to the same agency as the ticket. Without the last check an officer
 * could park a ticket at another agency's counter.
 */
async function resolveCounter(
  db: ReturnType<typeof createServiceClient>,
  counterId: number,
  agencyId: number,
): Promise<{ id: number; counter_name: string } | Failure> {
  const { data: counter } = await db
    .from("counters")
    .select("id, counter_name, status, agency_id")
    .eq("id", counterId)
    .maybeSingle();

  if (!counter) {
    return fail(404, "COUNTER_NOT_FOUND", `Loket dengan id ${counterId} tidak ditemukan.`);
  }

  if (counter.agency_id !== agencyId) {
    return fail(403, "WRONG_AGENCY", "Loket tersebut milik instansi lain.");
  }

  if (counter.status !== "active") {
    return fail(422, "COUNTER_INACTIVE", `Loket ${counter.counter_name} sedang tidak aktif.`);
  }

  return { id: counter.id, counter_name: counter.counter_name };
}

export type UpdateStatusInput = {
  status: unknown;
  counter_id?: unknown;
};

export async function updateQueueStatus(
  ticketId: string,
  raw: unknown,
): Promise<StatusResult> {
  if (!isUuid(ticketId)) {
    return fail(400, "INVALID_TICKET_ID", "Id tiket harus berupa UUID.");
  }

  if (typeof raw !== "object" || raw === null) {
    return fail(400, "INVALID_BODY", "Body harus berupa objek JSON.");
  }

  const body = raw as UpdateStatusInput;

  if (!isQueueStatus(body.status)) {
    return fail(
      400,
      "INVALID_STATUS",
      "Status harus salah satu dari: scheduled, present, served, completed, skipped.",
    );
  }

  const target = body.status;

  if (body.counter_id !== undefined && body.counter_id !== null) {
    if (typeof body.counter_id !== "number" || !Number.isInteger(body.counter_id)) {
      return fail(400, "INVALID_BODY", "counter_id harus berupa angka bulat.");
    }
  }

  const caller = await resolveCaller();

  // Reject non-officers before touching the database, so an outsider cannot
  // tell an existing ticket from a missing one by the 403-versus-404.
  if (caller.kind === "anonymous") {
    return fail(401, "UNAUTHENTICATED", "Silakan login sebagai petugas instansi terlebih dahulu.");
  }

  if (caller.kind === "citizen") {
    return fail(403, "OFFICER_ONLY", "Aksi ini hanya untuk petugas instansi.");
  }

  const db = createServiceClient();

  const context = await loadTicketContext(db, ticketId);
  if ("ok" in context) return context;

  const { ticket, service, agency } = context;

  const denied = requireAgencyAccess(caller, agency.id);
  if (denied) return denied;

  if (ticket.status === target) {
    return fail(
      409,
      "ALREADY_IN_STATUS",
      `Tiket ${ticket.queue_number} sudah berstatus ${STATUS_LABEL[target]}.`,
    );
  }

  if (!TRANSITIONS[ticket.status].includes(target)) {
    const allowed = TRANSITIONS[ticket.status];
    return fail(
      409,
      "INVALID_TRANSITION",
      allowed.length === 0
        ? `Tiket ${ticket.queue_number} sudah ${STATUS_LABEL[ticket.status]} dan tidak bisa diubah lagi.`
        : `Tiket ${ticket.queue_number} berstatus ${STATUS_LABEL[ticket.status]}, hanya bisa pindah ke: ${allowed
            .map((s) => STATUS_LABEL[s])
            .join(", ")}.`,
    );
  }

  const update: { status: QueueStatus; counter_id?: number } = { status: target };
  let counterName: string | null = null;

  if (target === "served") {
    // Serving without a counter would leave the display board unable to say
    // where the citizen should go.
    const counterId = typeof body.counter_id === "number" ? body.counter_id : ticket.counter_id;

    if (counterId === null || counterId === undefined) {
      return fail(400, "COUNTER_REQUIRED", "counter_id wajib diisi saat memanggil ke loket.");
    }

    const counter = await resolveCounter(db, counterId, agency.id);
    if ("ok" in counter) return counter;

    update.counter_id = counter.id;
    counterName = counter.counter_name;
  }

  const { data: updated, error } = await db
    .from("queues")
    .update(update)
    .eq("id", ticket.id)
    // Optimistic guard: if another officer moved the ticket between our read
    // and this write, match zero rows instead of clobbering their change.
    .eq("status", ticket.status)
    .select("id, queue_number, status, schedule_date, time_block, counter_id")
    .maybeSingle();

  if (error) {
    return fail(500, "INTERNAL_ERROR", error.message);
  }

  if (!updated) {
    return fail(
      409,
      "CONCURRENT_UPDATE",
      "Status tiket baru saja diubah petugas lain. Muat ulang lalu coba lagi.",
    );
  }

  return {
    ok: true,
    ticket: {
      id: updated.id,
      queue_number: updated.queue_number,
      status: updated.status as QueueStatus,
      schedule_date: updated.schedule_date,
      time_block: updated.time_block,
      counter_id: updated.counter_id,
      counter_name: counterName,
      service: { id: service.id, name: service.name },
      agency: { id: agency.id, name: agency.name },
    },
  };
}

export type CallNextResult =
  | { ok: true; ticket: TicketSummary; remaining: number }
  | Failure;

/**
 * Calls the longest-waiting ticket for the officer's agency to a counter.
 *
 * Ordering puts `present` ahead of `scheduled`: somebody standing in the room
 * should be seen before somebody who has not turned up yet. Within that, the
 * earlier session goes first, then the lower ticket number.
 */
export async function callNextQueue(raw: unknown): Promise<CallNextResult> {
  if (typeof raw !== "object" || raw === null) {
    return fail(400, "INVALID_BODY", "Body harus berupa objek JSON.");
  }

  const counterId = (raw as { counter_id?: unknown }).counter_id;

  if (typeof counterId !== "number" || !Number.isInteger(counterId)) {
    return fail(400, "INVALID_BODY", "counter_id wajib diisi dan harus berupa angka bulat.");
  }

  const caller = await resolveCaller();

  if (caller.kind === "anonymous") {
    return fail(401, "UNAUTHENTICATED", "Silakan login sebagai petugas instansi terlebih dahulu.");
  }

  if (caller.kind === "citizen") {
    return fail(403, "OFFICER_ONLY", "Aksi ini hanya untuk petugas instansi.");
  }

  const db = createServiceClient();

  // A super_admin has no agency of their own, so the counter decides which one
  // this call belongs to.
  const { data: counterRow } = await db
    .from("counters")
    .select("id, counter_name, status, agency_id, location_id")
    .eq("id", counterId)
    .maybeSingle();

  if (!counterRow || counterRow.agency_id === null) {
    return fail(404, "COUNTER_NOT_FOUND", `Loket dengan id ${counterId} tidak ditemukan.`);
  }

  const agencyId = counterRow.agency_id;

  const denied = requireAgencyAccess(caller, agencyId);
  if (denied) return denied;

  const counter = await resolveCounter(db, counterId, agencyId);
  if ("ok" in counter) return counter;

  const today = todayInJakarta();

  let waitingQuery = db
    .from("queues")
    .select("id, queue_number, status, time_block, service:services!inner(id, name, agency_id)")
    .eq("schedule_date", today)
    .eq("service.agency_id", agencyId)
    .in("status", WAITING_STATUSES);

  if (counterRow.location_id) {
    waitingQuery = waitingQuery.eq("location_id", counterRow.location_id);
  }

  const { data: waiting, error } = await waitingQuery;

  if (error) {
    return fail(500, "INTERNAL_ERROR", error.message);
  }

  const queue = (waiting ?? []).slice().sort((a, b) => {
    const priority = (status: string) => (status === "present" ? 0 : 1);
    if (priority(a.status) !== priority(b.status)) return priority(a.status) - priority(b.status);

    const startOf = (block: string) => parseTimeBlock(block)?.startMinutes ?? Number.MAX_SAFE_INTEGER;
    if (startOf(a.time_block) !== startOf(b.time_block)) {
      return startOf(a.time_block) - startOf(b.time_block);
    }

    return a.queue_number.localeCompare(b.queue_number);
  });

  const next = queue[0];

  if (!next) {
    return fail(404, "NO_WAITING_QUEUE", "Tidak ada antrean berikutnya yang menunggu.");
  }

  // Reuse the transition path so the guards and the concurrency check apply
  // here too, rather than being duplicated.
  const result = await updateQueueStatus(next.id, { status: "served", counter_id: counterId });

  if (!result.ok) return result;

  return { ok: true, ticket: result.ticket, remaining: queue.length - 1 };
}
