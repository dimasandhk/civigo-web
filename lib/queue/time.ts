/**
 * Time helpers for the queue engine.
 *
 * Everything here is anchored to Asia/Jakarta. The server may well run in UTC,
 * and `new Date().toISOString().split("T")[0]` — the pattern used elsewhere in
 * this codebase — still reports *yesterday* between 00:00 and 07:00 WIB, since
 * UTC has not crossed midnight yet. For an endpoint that decides whether a
 * session has already passed, that is a real off-by-one-day bug rather than a
 * cosmetic one.
 */

const TIME_ZONE = "Asia/Jakarta";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Today in Jakarta as `YYYY-MM-DD`. `en-CA` formats dates that way natively. */
export function todayInJakarta(): string {
  return DATE_FORMATTER.format(new Date());
}

/** Minutes since midnight, Jakarta time. */
export function nowMinutesInJakarta(): number {
  const [hours, minutes] = TIME_FORMATTER.format(new Date()).split(":");
  return Number(hours) * 60 + Number(minutes);
}

/** `"HH:MM"` or Postgres `time` (`"HH:MM:SS"`) to minutes since midnight. */
export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/** Minutes since midnight back to `"HH:MM"`, for error messages and responses. */
export function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const TIME_BLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-4]):([0-5]\d)$/;

export type TimeBlock = {
  startMinutes: number;
  endMinutes: number;
};

/**
 * Parses `"08:00 - 09:00"`, the exact shape already stored in `queues`.
 *
 * Deliberately strict: `time_block` is a free varchar with no CHECK behind it,
 * so this is the only thing standing between a typo and a permanently
 * unreadable session label. Returns `null` when the input does not match, or
 * when the range runs backwards.
 * Mendukung batas akhir 24:00 untuk sesi malam hari.
 */
export function parseTimeBlock(raw: string): TimeBlock | null {
  const match = TIME_BLOCK_PATTERN.exec(raw);
  if (!match) return null;

  const startMinutes = Number(match[1]) * 60 + Number(match[2]);
  const endHour = Number(match[3]);
  const endMinute = Number(match[4]);

  // Jam 24 hanya valid untuk 24:00 (batas akhir tengah malam)
  if (endHour === 24 && endMinute !== 0) return null;

  const endMinutes = endHour * 60 + endMinute;

  if (endMinutes <= startMinutes) return null;

  return { startMinutes, endMinutes };
}

/** Renders a block back to the `"HH:MM - HH:MM"` label stored in the column. */
export function formatTimeBlock(block: TimeBlock): string {
  return `${minutesToTime(block.startMinutes)} - ${minutesToTime(block.endMinutes)}`;
}

const SESSION_LENGTH_MINUTES = 60;

/**
 * The hourly sessions an agency runs, derived from its opening hours:
 * 08:00-16:00 becomes 08:00-09:00, 09:00-10:00, ... 15:00-16:00.
 *
 * Booking accepts any well-formed `time_block`, so this grid is not enforced
 * there. Reschedule needs it anyway — "the next session" is meaningless without
 * a canonical list to step through. Every `time_block` currently in the table
 * sits on this grid.
 *
 * A trailing remainder shorter than an hour is dropped rather than emitted as a
 * stub session, so a 08:00-16:30 agency still ends at 15:00-16:00.
 */
export function sessionGrid(openTime: string, closeTime: string): TimeBlock[] {
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);
  const sessions: TimeBlock[] = [];

  for (let start = open; start + SESSION_LENGTH_MINUTES <= close; start += SESSION_LENGTH_MINUTES) {
    sessions.push({ startMinutes: start, endMinutes: start + SESSION_LENGTH_MINUTES });
  }

  return sessions;
}

/**
 * First session on the grid that starts strictly after `afterMinutes`.
 *
 * Takes a raw minute rather than a session so it also works for tickets whose
 * `time_block` never matched the grid — booking allows those through.
 */
export function nextSessionAfter(grid: TimeBlock[], afterMinutes: number): TimeBlock | null {
  return grid.find((session) => session.startMinutes > afterMinutes) ?? null;
}

/** Days between two `YYYY-MM-DD` strings. Negative when `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  // Parsed as UTC midnight on both sides, so the offset cancels out and DST
  // cannot shift the result.
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

/**
 * ISO day of week for a `YYYY-MM-DD` string: Monday = 1 ... Sunday = 7.
 * Matches `agencies.operating_days`, which stores Postgres `isodow` values.
 */
export function isoDayOfWeek(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // Sunday = 0
  return day === 0 ? 7 : day;
}
