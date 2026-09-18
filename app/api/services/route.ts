import type { NextRequest } from "next/server";
import { getAllServices } from "@/lib/queue/cross-agency";
import { internalErrorResponse } from "@/lib/queue/http";

/**
 * GET /api/services
 *
 * Mengambil daftar katalog seluruh layanan yang tersedia di CiviGo,
 * lengkap dengan instansi pengampu, daftar persyaratan (requirements),
 * dan dokumen output yang diterbitkan.
 *
 * Query params (opsional):
 *   ?agency_id=1  -> memfilter layanan berdasarkan ID instansi
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyIdParam = searchParams.get("agency_id");

    const allServices = await getAllServices();

    let filtered = allServices;
    if (agencyIdParam) {
      const aid = Number(agencyIdParam);
      if (!Number.isNaN(aid)) {
        filtered = allServices.filter((s) => s.agency_id === aid);
      }
    }

    return Response.json(
      {
        ok: true,
        count: filtered.length,
        services: filtered,
      },
      { status: 200 }
    );
  } catch (error) {
    return internalErrorResponse("GET /api/services", error);
  }
}
