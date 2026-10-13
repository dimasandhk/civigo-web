import type { NextRequest } from "next/server";
import { errorResponse, internalErrorResponse } from "@/lib/queue/http";
import { markReviewLater } from "@/lib/queue/review-later";

/**
 * POST /api/queue/[id]/review-later
 *
 * Menandai tiket yang berstatus completed dengan is_reviewed = false.
 * Digunakan oleh aplikasi mobile saat pengguna memilih "Nanti Saja" pada permintaan ulasan,
 * sehingga tiket antrean tetap berada di `active_tickets` sebagai reminder sampai warga mengulas.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await markReviewLater(id);

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
    return internalErrorResponse("POST /api/queue/[id]/review-later", error);
  }
}
