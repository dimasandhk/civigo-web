import { getCurrentUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { insertTicketWithNumber } from "./number";
import {
  daysBetween,
  isoDayOfWeek,
  minutesToTime,
  nowMinutesInJakarta,
  parseTimeBlock,
  timeToMinutes,
  todayInJakarta,
} from "./time";

/**
 * Booking use-case, kept separate from the HTTP layer so the status endpoints
 * that come later can reuse the same identity and validation helpers.
 *
 * Capacity is *not* enforced here. The per-time-block quota table does not
 * exist yet, so the only thing limiting a session is the agency's closing time:
 * a booking is refused when the session start plus the service's estimate runs
 * past it. Until quotas land, a single session accepts unlimited tickets.
 */

const MAX_ADVANCE_DAYS = 30;

/** Mirrors the fallback already used in `lib/data/admin.ts` for this column. */
const DEFAULT_ESTIMATED_MINUTES = 15;

/** A ticket in one of these states still occupies its holder's slot. */
const ACTIVE_STATUSES = ["scheduled", "present", "served"];

const NIK_PATTERN = /^[0-9]{16}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type BookingErrorCode =
  | "INVALID_BODY"
  | "NIK_REQUIRED"
  | "ROLE_NOT_ALLOWED"
  | "SERVICE_NOT_FOUND"
  | "SERVICE_HAS_NO_AGENCY"
  | "DATE_IN_PAST"
  | "DATE_TOO_FAR"
  | "AGENCY_CLOSED"
  | "INVALID_TIME_BLOCK"
  | "OUTSIDE_OPERATING_HOURS"
  | "SERVICE_EXCEEDS_CLOSING"
  | "TIME_BLOCK_PASSED"
  | "DUPLICATE_BOOKING"
  | "NUMBER_ALLOCATION_FAILED"
  | "INTERNAL_ERROR";

export type BookingTicket = {
  id: string;
  queue_number: string;
  schedule_date: string;
  time_block: string;
  status: string;
  estimated_finish: string;
  nik: string | null;
  service: { id: number; name: string; estimated_time: number };
  agency: { id: number; name: string };
  linked_account: boolean;
};

export type BookQueueResult =
  | { ok: true; ticket: BookingTicket }
  | { ok: false; status: number; code: BookingErrorCode; message: string };

function fail(
  status: number,
  code: BookingErrorCode,
  message: string,
): Extract<BookQueueResult, { ok: false }> {
  return { ok: false, status, code, message };
}

type BookQueueInput = {
  service_id: number;
  schedule_date: string;
  time_block: string;
  nik: string | null;
};

/**
 * Narrows an untrusted JSON body. Returns `null` on anything unexpected — the
 * caller turns that into a single 400 rather than leaking which field was
 * wrong, because every field here is trivially guessable from the docs anyway.
 */
function parseInput(raw: unknown): BookQueueInput | null {
  if (typeof raw !== "object" || raw === null) return null;

  const body = raw as Record<string, unknown>;

  const serviceId = body.service_id;
  if (typeof serviceId !== "number" || !Number.isInteger(serviceId) || serviceId < 1) {
    return null;
  }

  const scheduleDate = body.schedule_date;
  if (typeof scheduleDate !== "string" || !DATE_PATTERN.test(scheduleDate)) return null;

  // Catches 2026-02-30 and friends, which match the pattern but do not exist.
  const parsed = new Date(`${scheduleDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== scheduleDate) {
    return null;
  }

  const timeBlock = body.time_block;
  if (typeof timeBlock !== "string" || timeBlock.length === 0) return null;

  const nik = body.nik;
  if (nik !== undefined && nik !== null && typeof nik !== "string") return null;

  return {
    service_id: serviceId,
    schedule_date: scheduleDate,
    time_block: timeBlock,
    nik: typeof nik === "string" ? nik.trim() : null,
  };
}

type Identity = {
  userId: string | null;
  nik: string | null;
};

/**
 * Works out who the ticket belongs to.
 *
 * A signed-in citizen books for themselves — the NIK in the body is ignored, so
 * it cannot be used to book onto someone else's account. A kiosk visitor has no
 * session, so they type a NIK: if it matches an existing citizen account the
 * ticket is linked to it, otherwise the ticket carries the NIK alone. An
 * account is never created here.
 */
async function resolveIdentity(
  input: BookQueueInput,
  db: ReturnType<typeof createServiceClient>,
): Promise<Identity | Extract<BookQueueResult, { ok: false }>> {
  const profile = await getCurrentUser();

  if (profile) {
    if (profile.role !== "user") {
      // Jika terdapat NIK warga (kiosk mode atau petugas mendaftarkan antrean walk-in untuk warga):
      if (input.nik && NIK_PATTERN.test(input.nik)) {
        const { data: account } = await db
          .from("users")
          .select("id, role")
          .eq("nik", input.nik)
          .maybeSingle();

        return {
          userId: account && account.role === "user" ? account.id : null,
          nik: input.nik,
        };
      }

      return fail(
        403,
        "ROLE_NOT_ALLOWED",
        "Akun instansi tidak bisa mengambil antrean untuk diri sendiri. Gunakan akun warga atau kiosk.",
      );
    }

    return { userId: profile.id, nik: profile.nik };
  }

  if (!input.nik || !NIK_PATTERN.test(input.nik)) {
    return fail(400, "NIK_REQUIRED", "NIK wajib diisi dan harus berupa 16 digit angka.");
  }

  // RLS would hide this row from the kiosk entirely, hence the service client.
  const { data: account } = await db
    .from("users")
    .select("id, role")
    .eq("nik", input.nik)
    .maybeSingle();

  return {
    userId: account && account.role === "user" ? account.id : null,
    nik: input.nik,
  };
}

export async function bookQueue(raw: unknown): Promise<BookQueueResult> {
  const input = parseInput(raw);

  if (!input) {
    return fail(
      400,
      "INVALID_BODY",
      "Body tidak valid. Wajib: service_id (angka), schedule_date (YYYY-MM-DD), " +
        "time_block (\"HH:MM - HH:MM\"). Opsional: nik (16 digit).",
    );
  }

  const db = createServiceClient();

  const identity = await resolveIdentity(input, db);
  if ("ok" in identity) return identity;

  const { data: service } = await db
    .from("services")
    .select("id, name, estimated_time, agency_id")
    .eq("id", input.service_id)
    .maybeSingle();

  if (!service) {
    return fail(404, "SERVICE_NOT_FOUND", `Layanan dengan id ${input.service_id} tidak ditemukan.`);
  }

  if (service.agency_id === null) {
    return fail(
      422,
      "SERVICE_HAS_NO_AGENCY",
      `Layanan "${service.name}" belum terhubung ke instansi mana pun, jadi jam operasionalnya tidak diketahui.`,
    );
  }

  const { data: agency } = await db
    .from("agencies")
    .select("id, name, open_time, close_time, operating_days")
    .eq("id", service.agency_id)
    .maybeSingle();

  if (!agency) {
    return fail(404, "SERVICE_NOT_FOUND", "Instansi penyelenggara layanan ini tidak ditemukan.");
  }

  const today = todayInJakarta();
  const dayOffset = daysBetween(today, input.schedule_date);

  if (dayOffset < 0) {
    return fail(422, "DATE_IN_PAST", "Tanggal booking sudah lewat.");
  }

  if (dayOffset > MAX_ADVANCE_DAYS) {
    return fail(
      422,
      "DATE_TOO_FAR",
      `Booking paling jauh ${MAX_ADVANCE_DAYS} hari ke depan.`,
    );
  }

  const block = parseTimeBlock(input.time_block);

  if (!block) {
    return fail(
      400,
      "INVALID_TIME_BLOCK",
      'Format sesi harus "HH:MM - HH:MM", contoh "09:00 - 10:00".',
    );
  }

  const estimatedTime = service.estimated_time ?? DEFAULT_ESTIMATED_MINUTES;
  const finishMinutes = block.startMinutes + estimatedTime;

  // Izinkan pengujian di luar jam kerja (misal malam hari atau akhir pekan) saat development
  const isDevTesting = process.env.NODE_ENV !== "production";

  if (!isDevTesting) {
    if (!agency.operating_days.includes(isoDayOfWeek(input.schedule_date))) {
      return fail(422, "AGENCY_CLOSED", `${agency.name} tutup pada tanggal ${input.schedule_date}.`);
    }

    const openMinutes = timeToMinutes(agency.open_time);
    const closeMinutes = timeToMinutes(agency.close_time);

    if (block.startMinutes < openMinutes || block.startMinutes >= closeMinutes) {
      return fail(
        422,
        "OUTSIDE_OPERATING_HOURS",
        `Sesi ${minutesToTime(block.startMinutes)} di luar jam operasional ${agency.name} ` +
          `(${minutesToTime(openMinutes)} - ${minutesToTime(closeMinutes)}).`,
      );
    }

    if (finishMinutes > closeMinutes) {
      return fail(
        422,
        "SERVICE_EXCEEDS_CLOSING",
        `Layanan ${service.name} (${estimatedTime} menit) pada sesi ` +
          `${minutesToTime(block.startMinutes)} diperkirakan selesai ` +
          `${minutesToTime(finishMinutes)}, melewati jam tutup ${minutesToTime(closeMinutes)}.`,
      );
    }

    if (dayOffset === 0 && block.startMinutes <= nowMinutesInJakarta()) {
      return fail(
        422,
        "TIME_BLOCK_PASSED",
        `Sesi ${minutesToTime(block.startMinutes)} hari ini sudah lewat.`,
      );
    }
  }

  // Prevent duplicate booking for the same service and date (by userId or by NIK)
  let duplicateQuery = db
    .from("queues")
    .select("queue_number")
    .eq("service_id", service.id)
    .eq("schedule_date", input.schedule_date)
    .in("status", ACTIVE_STATUSES);

  if (identity.userId && identity.nik) {
    duplicateQuery = duplicateQuery.or(`user_id.eq.${identity.userId},nik.eq.${identity.nik}`);
  } else if (identity.userId) {
    duplicateQuery = duplicateQuery.eq("user_id", identity.userId);
  } else if (identity.nik) {
    duplicateQuery = duplicateQuery.eq("nik", identity.nik);
  }

  const { data: duplicate } = await duplicateQuery.limit(1).maybeSingle();

  if (duplicate) {
    return fail(
      409,
      "DUPLICATE_BOOKING",
      `NIK atau akun ini sudah memiliki antrean aktif (${duplicate.queue_number}) untuk layanan ` +
        `${service.name} pada tanggal ${input.schedule_date}.`,
    );
  }

  const inserted = await insertTicketWithNumber(db, {
    serviceId: service.id,
    scheduleDate: input.schedule_date,
    timeBlock: input.time_block,
    userId: identity.userId,
    nik: identity.nik,
  });

  if (!inserted.ok) {
    return fail(inserted.status, inserted.code as BookingErrorCode, inserted.message);
  }

  return {
    ok: true,
    ticket: {
      id: inserted.row.id,
      queue_number: inserted.row.queue_number,
      schedule_date: input.schedule_date,
      time_block: input.time_block,
      status: inserted.row.status,
      estimated_finish: minutesToTime(finishMinutes),
      nik: identity.nik,
      service: { id: service.id, name: service.name, estimated_time: estimatedTime },
      agency: { id: agency.id, name: agency.name },
      linked_account: identity.userId !== null,
    },
  };
}
