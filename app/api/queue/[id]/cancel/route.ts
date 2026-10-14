import type { NextRequest } from "next/server";
import { errorResponse, internalErrorResponse } from "@/lib/queue/http";
import { cancelQueue } from "@/lib/queue/cancel";

/**
 * POST /api/queue/[id]/cancel
 *
 * Membatalkan tiket antrean secara sukarela oleh warga.
 * Hanya dapat dilakukan oleh pemilik tiket sebelum antrean dipanggil ('scheduled' atau 'present').
 * Menerima body opsional { reason?: string }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let reason: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body === "object" && "reason" in body) {
        reason = typeof body.reason === "string" ? body.reason : undefined;
      }
    } catch {
      // Body kosong atau bukan JSON diperbolehkan
    }

    const result = await cancelQueue(id, reason);

    if (!result.ok) {
      return errorResponse(result);
    }

    return Response.json(
      {
        ok: true,
        message: result.message,
        ticket: result.ticket,
      },
      { status: 200 }
    );
  } catch (error) {
    return internalErrorResponse("POST /api/queue/[id]/cancel", error);
  }
}
