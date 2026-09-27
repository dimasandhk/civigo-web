import type { NextRequest } from "next/server";
import { errorResponse, internalErrorResponse } from "@/lib/queue/http";
import { postponeQueue } from "@/lib/queue/status";

/**
 * POST /api/queue/[id]/postpone
 *
 * Memundurkan tiket antrean ke urutan paling akhir dari antrean menunggu.
 * Digunakan oleh petugas loket ketika pemegang tiket no-show sementara tetapi tidak ingin dihanguskan.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await postponeQueue(id);

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
    return internalErrorResponse("POST /api/queue/[id]/postpone", error);
  }
}
