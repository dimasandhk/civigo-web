/** Primitives shared by the queue endpoints. */

export const QUEUE_STATUSES = [
  "scheduled",
  "present",
  "served",
  "completed",
  "skipped",
] as const;

export type QueueStatus = (typeof QUEUE_STATUSES)[number];

/** Mirrors the `queues_status_valid` CHECK, so the two cannot drift apart. */
export function isQueueStatus(value: unknown): value is QueueStatus {
  return typeof value === "string" && (QUEUE_STATUSES as readonly string[]).includes(value);
}

/** Tickets in these states are still waiting to be called. */
export const WAITING_STATUSES: QueueStatus[] = ["scheduled", "present"];

export type Failure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export function fail(status: number, code: string, message: string): Failure {
  return { ok: false, status, code, message };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Guards the `[id]` path segment. Without this a malformed id reaches Postgres
 * and comes back as a `22P02` cast error, which would surface as a 500 for what
 * is really a bad request.
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
