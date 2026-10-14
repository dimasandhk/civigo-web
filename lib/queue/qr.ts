import { isUuid } from "./shared";

/**
 * Ticket QR codes shown by the mobile app.
 *
 * The QR holds stringified JSON:
 *   { "queue_id": "<uuid>", "queue_number": "A-45", "nik": "3578...", "schedule_date": "2026-10-14", "service_id": 12 }
 *
 * Only `queue_id` is used to find the ticket: it is an unguessable UUID, and the
 * check-in endpoint already checks the date and branch against the database.
 * The other fields are not trusted. A bare UUID is accepted too.
 *
 * No server-only imports: the kiosk scanner uses this to reject unrelated QR
 * codes before calling the API, and the API uses it for text typed in by a
 * USB scanner.
 */

export type TicketQr = {
  queueId: string;
  /** For messages only; may be missing or formatted differently than in the database. */
  queueNumber: string | null;
};

/** True when the text is meant as a QR payload rather than a typed NIK or queue number. */
export function looksLikeTicketQr(text: string): boolean {
  return text.trim().startsWith("{");
}

export function parseTicketQr(text: string): TicketQr | null {
  const trimmed = text.trim();

  if (isUuid(trimmed)) return { queueId: trimmed, queueNumber: null };
  if (!looksLikeTicketQr(trimmed)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;
  const { queue_id, queue_number } = payload as Record<string, unknown>;

  if (typeof queue_id !== "string" || !isUuid(queue_id.trim())) return null;

  return {
    queueId: queue_id.trim(),
    queueNumber: typeof queue_number === "string" && queue_number.trim() ? queue_number.trim() : null,
  };
}
