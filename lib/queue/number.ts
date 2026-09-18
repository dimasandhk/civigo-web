import type { createServiceClient } from "@/lib/supabase/service";
import { fail, type Failure } from "./shared";

/**
 * Ticket numbering, shared by booking and reschedule.
 *
 * Allocation is read-then-write, so it is inherently racy. The real guard lives
 * in the database: `queues_number_per_service_day_idx`. When a concurrent
 * insert claims the number first, Postgres raises 23505 and we recompute — so
 * the whole allocate-and-insert cycle has to sit in one place rather than being
 * copied into each caller.
 */

const MAX_ALLOCATION_ATTEMPTS = 5;

/**
 * `A` for service 1, `B` for 2, and so on — matching the numbers already in the
 * table. Wraps at 26; a `services.queue_prefix` column is the real fix.
 */
export function queuePrefix(serviceId: number): string {
  return String.fromCharCode(64 + ((serviceId - 1) % 26) + 1);
}

/** `"A-07"` -> `7`. Returns 0 for anything unparseable, so it cannot poison MAX. */
function sequenceOf(queueNumber: string): number {
  const suffix = queueNumber.slice(queueNumber.lastIndexOf("-") + 1);
  const parsed = Number(suffix);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export type NewTicket = {
  serviceId: number;
  locationId?: number | null;
  scheduleDate: string;
  timeBlock: string;
  userId: string | null;
  nik: string | null;
  /** Set when this ticket replaces a skipped one. */
  rescheduledFrom?: string | null;
};

export type InsertedTicket = {
  id: string;
  queue_number: string;
  status: string;
};

export async function insertTicketWithNumber(
  db: ReturnType<typeof createServiceClient>,
  ticket: NewTicket,
): Promise<{ ok: true; row: InsertedTicket } | Failure> {
  const prefix = queuePrefix(ticket.serviceId);

  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    // Read every number for the day rather than sorting in Postgres: the sort
    // would be lexicographic, which puts "A-99" above "A-100".
    const { data: taken, error: readError } = await db
      .from("queues")
      .select("queue_number")
      .eq("schedule_date", ticket.scheduleDate)
      .eq("service_id", ticket.serviceId);

    if (readError) {
      return fail(500, "INTERNAL_ERROR", "Gagal membaca nomor antrean yang sudah terpakai.");
    }

    const nextSequence =
      (taken ?? []).reduce((max, row) => Math.max(max, sequenceOf(row.queue_number)), 0) + 1;
    const queueNumber = `${prefix}-${String(nextSequence).padStart(2, "0")}`;

    const { data: inserted, error: insertError } = await db
      .from("queues")
      .insert({
        user_id: ticket.userId,
        nik: ticket.nik,
        service_id: ticket.serviceId,
        location_id: ticket.locationId ?? 1,
        queue_number: queueNumber,
        schedule_date: ticket.scheduleDate,
        time_block: ticket.timeBlock,
        status: "scheduled",
        rescheduled_from: ticket.rescheduledFrom ?? null,
      })
      .select("id, queue_number, status")
      .single();

    if (!insertError && inserted) {
      return { ok: true, row: inserted };
    }

    if (insertError?.code !== "23505") {
      return fail(500, "INTERNAL_ERROR", insertError?.message ?? "Gagal menyimpan antrean.");
    }

    // 23505 can also come from queues_rescheduled_from_unique, which means this
    // skipped ticket already has a replacement. Retrying would never succeed.
    if (insertError.message.includes("queues_rescheduled_from_unique")) {
      return fail(
        409,
        "ALREADY_RESCHEDULED",
        "Tiket ini sudah pernah dijadwalkan ulang sebelumnya.",
      );
    }
  }

  return fail(
    503,
    "NUMBER_ALLOCATION_FAILED",
    "Antrean sedang sangat ramai, nomor gagal dialokasikan. Silakan coba lagi.",
  );
}
