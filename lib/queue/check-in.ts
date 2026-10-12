import { createServiceClient } from "@/lib/supabase/service";
import { fail, isUuid, type Failure } from "./shared";
import { todayInJakarta } from "./time";

/**
 * Kiosk check-in (`POST /api/queue/check-in`).
 *
 * Checking in records that a person has arrived, so a NIK checks in every ticket
 * that NIK holds today at this kiosk's branch — including tickets booked for a
 * family member, which carry the account owner's NIK. A queue number or ticket
 * id names one ticket, so only that one is checked in.
 *
 * Lookups are limited to today (WIB). A ticket that exists today only at another
 * branch is refused with that branch's name rather than checked in here.
 */

type Db = ReturnType<typeof createServiceClient>;

const NIK_PATTERN = /^[0-9]{16}$/;

const TICKET_COLUMNS = `
  id,
  queue_number,
  schedule_date,
  time_block,
  status,
  location_id,
  checked_in_at,
  counter:counters(counter_name),
  service:services(name, agency:agencies(name)),
  location:locations(name),
  family_member:family_members(full_name)
`;

type TicketRow = {
  id: string;
  queue_number: string;
  schedule_date: string;
  time_block: string | null;
  status: string;
  location_id: number | null;
  checked_in_at: string | null;
  counter: { counter_name: string } | null;
  service: { name: string; agency: { name: string } | null } | null;
  location: { name: string } | null;
  family_member: { full_name: string } | null;
};

/**
 * What happened to one ticket:
 *  - `checked_in`: was `scheduled`, now `present`.
 *  - `already_checked_in`: was already `present`.
 *  - `being_served`: is being called at a counter right now.
 *  - `completed` / `skipped`: nothing to do; shown so the person knows why.
 */
export type CheckInOutcome =
  | "checked_in"
  | "already_checked_in"
  | "being_served"
  | "completed"
  | "skipped";

export type CheckInTicket = {
  id: string;
  queue_number: string;
  status: string;
  schedule_date: string;
  /** Null untuk tiket tanpa sesi jam (walk-in kios). */
  time_block: string | null;
  service_name: string;
  counter_name: string | null;
  agency_name: string;
  /** Diisi kalau tiket dibooking untuk anggota keluarga. */
  family_member_name: string | null;
  outcome: CheckInOutcome;
};

export type CheckInResult =
  | {
      ok: true;
      tickets: CheckInTicket[];
      /** Jumlah tiket yang baru di-check-in oleh permintaan ini. */
      checkedInCount: number;
      message: string;
    }
  | Failure;

type CheckInInput = {
  code: string;
  locationId: number | null;
};

type Lookup =
  | { kind: "id"; value: string }
  | { kind: "nik"; value: string }
  | { kind: "queue_number"; value: string };

function parseInput(raw: unknown): CheckInInput | Failure {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!code) {
    return fail(400, "CODE_REQUIRED", "Kode antrean atau NIK wajib diisi.");
  }

  // Opsional supaya pemanggil lama tetap jalan; kios selalu mengirimnya.
  const rawLocation = body.location_id;
  if (rawLocation === undefined || rawLocation === null) return { code, locationId: null };

  const locationId = typeof rawLocation === "string" ? Number(rawLocation) : rawLocation;
  if (typeof locationId !== "number" || !Number.isInteger(locationId) || locationId <= 0) {
    return fail(400, "INVALID_LOCATION", "location_id harus berupa bilangan bulat positif.");
  }

  return { code, locationId };
}

/** `"a1"`, `"A01"`, `"a-1"` -> `"A-01"`; anything else is returned upper-cased. */
export function normalizeQueueNumber(code: string): string {
  const upper = code.toUpperCase();
  const match = /^([A-Z])-?(\d+)$/.exec(upper);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}` : upper;
}

function classify(code: string): Lookup {
  if (isUuid(code)) return { kind: "id", value: code };

  // NIK sering diketik berkelompok ("3273 0101 ...").
  const digits = code.replace(/\s+/g, "");
  if (NIK_PATTERN.test(digits)) return { kind: "nik", value: digits };

  return { kind: "queue_number", value: normalizeQueueNumber(code) };
}

/** `"2026-10-15"` -> `"15/10/2026"`. */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** For tickets this request did not change. `scheduled` never reaches here: it is either checked in or an error. */
function outcomeFor(status: string): CheckInOutcome {
  switch (status) {
    case "served":
      return "being_served";
    case "completed":
      return "completed";
    case "skipped":
      return "skipped";
    default:
      return "already_checked_in";
  }
}

function toTicket(row: TicketRow, outcome: CheckInOutcome): CheckInTicket {
  return {
    id: row.id,
    queue_number: row.queue_number,
    status: outcome === "checked_in" ? "present" : row.status,
    schedule_date: row.schedule_date,
    time_block: row.time_block,
    service_name: row.service?.name ?? "Layanan",
    counter_name: row.counter?.counter_name ?? null,
    agency_name: row.service?.agency?.name ?? "Instansi Pelayanan",
    family_member_name: row.family_member?.full_name ?? null,
    outcome,
  };
}

/** Being called now first, then waiting tickets, then finished ones; by number within each. */
const OUTCOME_ORDER: Record<CheckInOutcome, number> = {
  being_served: 0,
  checked_in: 1,
  already_checked_in: 1,
  completed: 2,
  skipped: 2,
};

function sortTickets(tickets: CheckInTicket[]): CheckInTicket[] {
  return [...tickets].sort(
    (a, b) =>
      OUTCOME_ORDER[a.outcome] - OUTCOME_ORDER[b.outcome] ||
      a.queue_number.localeCompare(b.queue_number, "id", { numeric: true }),
  );
}

function notFound(code: string): Failure {
  return fail(
    404,
    "TICKET_NOT_FOUND",
    `Tidak ada antrean hari ini dengan kode/NIK "${code}". Pastikan nomor antrean atau NIK Anda sudah terdaftar.`,
  );
}

function dateMismatch(row: TicketRow): Failure {
  return fail(
    422,
    "DATE_MISMATCH",
    `Nomor antrean ${row.queue_number} terdaftar untuk tanggal ${formatDate(row.schedule_date)}. ` +
      "Check-in hanya dapat dilakukan pada tanggal jadwal layanan.",
  );
}

function wrongLocation(rows: TicketRow[]): Failure {
  const names = [...new Set(rows.map((r) => r.location?.name).filter((n): n is string => !!n))];
  const where = names.length > 0 ? names.join(" dan ") : "cabang lain";

  return fail(
    422,
    "WRONG_LOCATION",
    `Antrean Anda hari ini terdaftar di ${where}. Silakan check-in di lokasi tersebut.`,
  );
}

/** Every ticket is finished, so nothing can be checked in. Keeps the single-ticket wording. */
function nothingToCheckIn(tickets: CheckInTicket[]): Failure {
  if (tickets.length === 1) {
    const [ticket] = tickets;
    return ticket.outcome === "completed"
      ? fail(422, "ALREADY_COMPLETED", `Nomor antrean ${ticket.queue_number} sudah selesai dilayani.`)
      : fail(
          422,
          "TICKET_SKIPPED",
          `Nomor antrean ${ticket.queue_number} telah hangus. Silakan hubungi petugas atau ambil antrean baru.`,
        );
  }

  const list = tickets
    .map((t) => `${t.queue_number} (${t.outcome === "completed" ? "selesai" : "hangus"})`)
    .join(", ");

  return fail(
    422,
    "NO_ACTIVE_TICKET",
    `Semua antrean Anda hari ini sudah selesai atau hangus: ${list}. ` +
      "Silakan hubungi petugas atau ambil antrean baru.",
  );
}

function summarize(tickets: CheckInTicket[], checkedInCount: number): string {
  const serving = tickets.find((t) => t.outcome === "being_served");
  const callout = serving
    ? ` Nomor antrean ${serving.queue_number} sedang dipanggil di ${serving.counter_name ?? "loket"}, segera menuju loket.`
    : "";

  if (tickets.length === 1) {
    const [ticket] = tickets;
    if (ticket.outcome === "being_served") return callout.trim();
    if (ticket.outcome === "already_checked_in") {
      return `Anda sudah check-in. Nomor antrean: ${ticket.queue_number}. Silakan menunggu di ruang tunggu.`;
    }
    return `Check-in berhasil! Nomor antrean Anda adalah ${ticket.queue_number}. Silakan menunggu panggilan di ruang tunggu.`;
  }

  const head =
    checkedInCount > 0
      ? `Check-in berhasil untuk ${checkedInCount} antrean.`
      : "Anda sudah check-in untuk antrean hari ini.";

  return `${head}${callout || " Silakan menunggu panggilan di ruang tunggu."}`;
}

async function findTickets(db: Db, lookup: Lookup, today: string) {
  const query = db.from("queues").select(TICKET_COLUMNS);

  const { data, error } =
    lookup.kind === "id"
      ? await query.eq("id", lookup.value)
      : await query.eq(lookup.kind, lookup.value).eq("schedule_date", today);

  if (error) throw new Error(`Gagal mencari tiket: ${error.message}`);
  return (data as unknown as TicketRow[]) ?? [];
}

/** The NIK's next booking, so "no ticket today" can say when it actually is. */
async function findUpcomingByNik(db: Db, nik: string, today: string) {
  const { data } = await db
    .from("queues")
    .select(TICKET_COLUMNS)
    .eq("nik", nik)
    .eq("status", "scheduled")
    .gt("schedule_date", today)
    .order("schedule_date", { ascending: true })
    .limit(1);

  return ((data as unknown as TicketRow[]) ?? [])[0] ?? null;
}

export async function checkInQueue(raw: unknown): Promise<CheckInResult> {
  const input = parseInput(raw);
  if ("ok" in input) return input;

  const db = createServiceClient();
  const today = todayInJakarta();
  const lookup = classify(input.code);

  const found = await findTickets(db, lookup, today);

  if (found.length === 0) {
    if (lookup.kind === "nik") {
      const upcoming = await findUpcomingByNik(db, lookup.value, today);
      if (upcoming) return dateMismatch(upcoming);
    }
    return notFound(input.code);
  }

  // Hanya bisa terjadi lewat id: pencarian NIK/nomor sudah dibatasi hari ini.
  if (found[0].schedule_date !== today) return dateMismatch(found[0]);

  const here =
    input.locationId === null ? found : found.filter((r) => r.location_id === input.locationId);

  if (here.length === 0) return wrongLocation(found);

  const now = new Date().toISOString();
  const scheduledIds = here.filter((r) => r.status === "scheduled").map((r) => r.id);
  // Dipanggil sebelum sempat check-in: catat kedatangannya, status tetap `served`.
  const servedIds = here.filter((r) => r.status === "served" && !r.checked_in_at).map((r) => r.id);

  const newlyCheckedIn = new Set<string>();

  if (scheduledIds.length > 0) {
    // `status = scheduled` lagi supaya tiket yang baru saja dipanggil petugas tidak ditimpa.
    const { data, error } = await db
      .from("queues")
      .update({ status: "present", checked_in_at: now })
      .in("id", scheduledIds)
      .eq("status", "scheduled")
      .select("id");

    if (error) {
      return fail(500, "CHECK_IN_FAILED", `Gagal memperbarui status check-in: ${error.message}`);
    }
    for (const row of data ?? []) newlyCheckedIn.add(row.id);
  }

  if (servedIds.length > 0) {
    const { error } = await db
      .from("queues")
      .update({ checked_in_at: now })
      .in("id", servedIds)
      .eq("status", "served")
      .is("checked_in_at", null);

    if (error) {
      return fail(500, "CHECK_IN_FAILED", `Gagal mencatat waktu check-in: ${error.message}`);
    }
  }

  // Tiket yang statusnya berubah di antara baca dan tulis (mis. baru dipanggil): baca ulang, jangan tebak.
  const raced = scheduledIds.filter((id) => !newlyCheckedIn.has(id));
  let rows = here;
  if (raced.length > 0) {
    const { data, error } = await db.from("queues").select(TICKET_COLUMNS).in("id", raced);
    if (error) throw new Error(`Gagal membaca ulang tiket: ${error.message}`);

    const byId = new Map(((data as unknown as TicketRow[]) ?? []).map((r) => [r.id, r]));
    rows = here.map((r) => byId.get(r.id) ?? r);

    if (rows.some((r) => r.status === "scheduled" && !newlyCheckedIn.has(r.id))) {
      return fail(500, "CHECK_IN_FAILED", "Gagal memperbarui status check-in. Silakan coba lagi.");
    }
  }

  const tickets = sortTickets(
    rows.map((row) => toTicket(row, newlyCheckedIn.has(row.id) ? "checked_in" : outcomeFor(row.status))),
  );

  if (tickets.every((t) => t.outcome === "completed" || t.outcome === "skipped")) {
    return nothingToCheckIn(tickets);
  }

  return {
    ok: true,
    tickets,
    checkedInCount: newlyCheckedIn.size,
    message: summarize(tickets, newlyCheckedIn.size),
  };
}
