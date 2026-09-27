import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/agencies/[id]
 *
 * Mengambil detail lengkap sebuah instansi beserta:
 * - Lokasi kantor/MPP yang terafiliasi
 * - Daftar katalog layanan yang diselenggarakan
 * - Loket-loket pelayanan (counters) yang aktif
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agencyId = Number(id);

    if (!Number.isInteger(agencyId) || agencyId < 1) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_AGENCY_ID",
            message: "ID instansi harus berupa angka integer positif.",
          },
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 1. Ambil data dasar instansi
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("id, name, description, open_time, close_time, operating_days")
      .eq("id", agencyId)
      .maybeSingle();

    if (agencyError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FETCH_FAILED",
            message: agencyError.message,
          },
        },
        { status: 500 }
      );
    }

    if (!agency) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "AGENCY_NOT_FOUND",
            message: `Instansi dengan ID ${agencyId} tidak ditemukan.`,
          },
        },
        { status: 404 }
      );
    }

    // 2. Ambil lokasi terafiliasi
    const { data: agencyLocations } = await supabase
      .from("agency_locations")
      .select("location_id, locations(id, name, address, city, latitude, longitude, type)")
      .eq("agency_id", agencyId);

    const locations = (agencyLocations ?? [])
      .map((item) => item.locations as unknown as {
        id: number;
        name: string;
        address: string;
        city: string | null;
        latitude: number | null;
        longitude: number | null;
        type: string;
      })
      .filter(Boolean);

    // 3. Ambil layanan di bawah instansi ini
    const { data: services } = await supabase
      .from("services")
      .select("id, name, estimated_time, requirements, output_documents, info_procedure")
      .eq("agency_id", agencyId)
      .order("id", { ascending: true });

    // 4. Ambil loket pelayanan di instansi ini
    const { data: counters } = await supabase
      .from("counters")
      .select("id, counter_name, status, location_id")
      .eq("agency_id", agencyId)
      .order("id", { ascending: true });

    return NextResponse.json(
      {
        ok: true,
        agency: {
          ...agency,
          locations,
          services: services ?? [],
          counters: counters ?? [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: (error as Error).message || "Terjadi kesalahan pada server.",
        },
      },
      { status: 500 }
    );
  }
}
