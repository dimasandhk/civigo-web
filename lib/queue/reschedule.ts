import { createServiceClient } from "@/lib/supabase/service";
import { loadTicketContext, resolveCaller, type Caller } from "./authz";
import { insertTicketWithNumber } from "./number";
import { fail, isUuid, type Failure } from "./shared";
import {
  formatTimeBlock,
  minutesToTime,
  nextSessionAfter,
  nowMinutesInJakarta,
  parseTimeBlock,
  sessionGrid,
  timeToMinutes,
  todayInJakarta,
} from "./time";

/**
 * "Digeser ke bawah": a skipped ticket is replaced by a fresh one in the next
 * session of the same day.
 *
 * The skipped ticket is never edited. The replacement points back at it through
 * `rescheduled_from`, so the no-show stays on the record and the chain can be
 * followed. A unique index on that column means one skipped ticket can only
 * ever produce one replacement, which is also what stops a double-clicked
 * button from issuing two tickets.
 */

const DEFAULT_ESTIMATED_MINUTES = 15;

export type RescheduleResult =
  | {
      ok: true;
      ticket: {
        id: string;
        queue_number: string;
        schedule_date: string;
        time_block: string;
        status: string;
        estimated_finish: string;
        service: { id: number; name: string };
        agency: { id: number; name: string };
        rescheduled_from: { id: string; queue_number: string; time_block: string };
      };
    }
  | Failure;

/**
 * A citizen may move their own ticket; an officer may move any ticket in their
 * agency — which is the only route open to walk-in tickets, since those have no
 * account to log in with.
 */
function authorize(caller: Caller, ownerId: string | null, agencyId: number): Failure | null {
  if (caller.kind === "superAdmin") return null;

  if (caller.kind === "officer") {
    return caller.agencyId === agencyId
      ? null
      : fail(403, "WRONG_AGENCY", "Tiket ini milik instansi lain.");
  }

  if (caller.kind === "citizen") {
    return ownerId === caller.userId
      ? null
      : fail(403, "NOT_TICKET_OWNER", "Tiket ini bukan milik Anda.");
  }

  return fail(
    401,
    "UNAUTHENTICATED",
    "Silakan login terlebih dahulu, atau minta petugas loket menggeser antrean Anda.",
  );
}

export async function rescheduleQueue(ticketId: string): Promise<RescheduleResult> {
  if (!isUuid(ticketId)) {
    return fail(400, "INVALID_TICKET_ID", "Id tiket harus berupa UUID.");
  }

  const caller = await resolveCaller();

  // Same reasoning as the status endpoint: no database work for a caller who
  // could not be authorized for any ticket.
  if (caller.kind === "anonymous") {
    return fail(
      401,
      "UNAUTHENTICATED",
      "Silakan login terlebih dahulu, atau minta petugas loket menggeser antrean Anda.",
    );
  }

  const db = createServiceClient();

  const context = await loadTicketContext(db, ticketId);
  if ("ok" in context) return context;

  const { ticket, service, agency } = context;

  const denied = authorize(caller, ticket.user_id, agency.id);
  if (denied) return denied;

  if (ticket.status !== "skipped") {
    return fail(
      409,
      "NOT_SKIPPED",
      `Hanya tiket hangus yang bisa dijadwalkan ulang. Tiket ${ticket.queue_number} berstatus ${ticket.status}.`,
    );
  }

  // The unique index is the real guard, but checking first gives a clear answer
  // instead of a failed insert.
  const { data: existing } = await db
    .from("queues")
    .select("queue_number, time_block")
    .eq("rescheduled_from", ticket.id)
    .maybeSingle();

  if (existing) {
    return fail(
      409,
      "ALREADY_RESCHEDULED",
      `Tiket ${ticket.queue_number} sudah digeser ke ${existing.queue_number} (${existing.time_block}).`,
    );
  }

  const today = todayInJakarta();

  if (ticket.schedule_date !== today) {
    return fail(
      422,
      "NOT_TODAY",
      `Tiket ini dijadwalkan ${ticket.schedule_date}, bukan hari ini. Silakan booking ulang.`,
    );
  }

  const grid = sessionGrid(agency.open_time, agency.close_time);
  const currentStart = parseTimeBlock(ticket.time_block)?.startMinutes ?? -1;
  const closeMinutes = timeToMinutes(agency.close_time);
  const estimatedTime = service.estimated_time ?? DEFAULT_ESTIMATED_MINUTES;
  const nowMinutes = nowMinutesInJakarta();

  // Step forward until a session is found that has not started yet and still
  // leaves room for the service before closing.
  let target = nextSessionAfter(grid, Math.max(currentStart, nowMinutes));

  while (target && target.startMinutes + estimatedTime > closeMinutes) {
    target = nextSessionAfter(grid, target.startMinutes);
  }

  if (!target) {
    return fail(
      422,
      "NO_SESSION_LEFT",
      `Tidak ada sesi tersisa hari ini yang cukup untuk ${service.name} ` +
        `(${estimatedTime} menit) sebelum ${agency.name} tutup pukul ${minutesToTime(closeMinutes)}. ` +
        "Silakan booking untuk hari lain.",
    );
  }

  const timeBlock = formatTimeBlock(target);

  const inserted = await insertTicketWithNumber(db, {
    serviceId: service.id,
    scheduleDate: ticket.schedule_date,
    timeBlock,
    userId: ticket.user_id,
    nik: ticket.nik,
    rescheduledFrom: ticket.id,
  });

  if (!inserted.ok) return inserted;

  return {
    ok: true,
    ticket: {
      id: inserted.row.id,
      queue_number: inserted.row.queue_number,
      schedule_date: ticket.schedule_date,
      time_block: timeBlock,
      status: inserted.row.status,
      estimated_finish: minutesToTime(target.startMinutes + estimatedTime),
      service: { id: service.id, name: service.name },
      agency: { id: agency.id, name: agency.name },
      rescheduled_from: {
        id: ticket.id,
        queue_number: ticket.queue_number,
        time_block: ticket.time_block,
      },
    },
  };
}
