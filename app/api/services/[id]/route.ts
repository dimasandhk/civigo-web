import type { NextRequest } from "next/server";
import { getServiceById } from "@/lib/queue/cross-agency";
import { internalErrorResponse } from "@/lib/queue/http";

/**
 * GET /api/services/[id]
 *
 * Mengambil informasi detail satu layanan berdasarkan ID-nya,
 * mencakup requirements dan output_documents.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = Number(id);

    if (!Number.isInteger(serviceId) || serviceId < 1) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "INVALID_SERVICE_ID",
            message: "ID layanan harus berupa angka positif.",
          },
        },
        { status: 400 }
      );
    }

    const service = await getServiceById(serviceId);

    if (!service) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "SERVICE_NOT_FOUND",
            message: `Layanan dengan ID ${serviceId} tidak ditemukan.`,
          },
        },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, service }, { status: 200 });
  } catch (error) {
    return internalErrorResponse("GET /api/services/[id]", error);
  }
}
