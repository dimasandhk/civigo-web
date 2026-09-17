import type { NextRequest } from "next/server";
import {
  errorResponse,
  internalErrorResponse,
  invalidJsonResponse,
  readJsonBody,
} from "@/lib/queue/http";
import { updateQueueStatus } from "@/lib/queue/status";

/**
 * PATCH /api/queue/[id]/status — ubah status tiket (tombol admin di web).
 *
 * Body:
 *   { "status": "served", "counter_id": 1 }
 *
 * `counter_id` wajib saat status tujuannya `served`; selain itu diabaikan.
 *
 * Transisi yang diizinkan:
 *   scheduled -> present | served | skipped
 *   present   -> served | skipped
 *   served    -> completed | skipped
 *   completed -> (final)
 *   skipped   -> (final, pakai endpoint reschedule)
 *
 * Hanya untuk akun `instansi` pada instansi yang memiliki tiket, atau
 * `super_admin`.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = await readJsonBody(request);

    if (!parsed) return invalidJsonResponse();

    const result = await updateQueueStatus(id, parsed.body);

    if (!result.ok) return errorResponse(result);

    return Response.json({ ok: true, ticket: result.ticket }, { status: 200 });
  } catch (error) {
    return internalErrorResponse("PATCH /api/queue/[id]/status", error);
  }
}
