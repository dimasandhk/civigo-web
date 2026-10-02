import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { internalErrorResponse } from "@/lib/queue/http";

/**
 * GET /api/documents
 *
 * Mengambil daftar master dokumen layanan (service_documents) di CiviGo.
 * Digunakan oleh mobile app dan kiosk untuk memilih dokumen persyaratan / output.
 *
 * Query params (opsional):
 *   ?agency_id=1  -> memfilter dokumen berdasarkan ID instansi
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyIdParam = searchParams.get("agency_id");

    const supabase = createServiceClient();
    let query = supabase
      .from("service_documents")
      .select("id, name, description, agency_id, type, created_at")
      .order("id", { ascending: true });

    if (agencyIdParam) {
      const aid = Number(agencyIdParam);
      if (!Number.isNaN(aid)) {
        query = query.eq("agency_id", aid);
      }
    }

    const { data, error } = await query;

    if (error) {
      return Response.json(
        {
          ok: true,
          source: "fallback",
          count: 0,
          documents: [],
          message: "Tabel service_documents belum dieksekusi di remote DB. Silakan jalankan file migrasi.",
        },
        { status: 200 }
      );
    }

    return Response.json(
      {
        ok: true,
        count: data?.length ?? 0,
        documents: data ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    return internalErrorResponse("GET /api/documents", error);
  }
}
