import type { Failure } from "./shared";

/** Shared response shapes for the queue endpoints, so they stay identical. */

export function errorResponse(failure: Failure): Response {
  return Response.json(
    { ok: false, error: { code: failure.code, message: failure.message } },
    { status: failure.status },
  );
}

export function invalidJsonResponse(): Response {
  return Response.json(
    { ok: false, error: { code: "INVALID_BODY", message: "Body harus berupa JSON yang valid." } },
    { status: 400 },
  );
}

/**
 * Misconfiguration — a missing `SUPABASE_SECRET_KEY`, most likely — throws
 * rather than returning a failure. Without this the client gets a bare 500 with
 * no body, which is indistinguishable from the server dying.
 */
export function internalErrorResponse(route: string, error: unknown): Response {
  console.error(`[${route}]`, error);

  return Response.json(
    {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Terjadi kesalahan di server. Silakan coba lagi nanti.",
      },
    },
    { status: 500 },
  );
}

/**
 * Reads a JSON body, tolerating an empty one.
 *
 * The reschedule endpoint takes no fields, and `fetch` without a body would
 * otherwise fail to parse and be reported as a malformed request.
 */
export async function readJsonBody(request: Request): Promise<{ ok: true; body: unknown } | null> {
  const raw = await request.text();

  if (raw.trim() === "") return { ok: true, body: {} };

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return null;
  }
}
