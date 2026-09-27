import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/agencies
 *
 * Mengambil daftar seluruh instansi/lembaga yang terdaftar di CiviGo,
 * lengkap dengan lokasi layanan (MPP / Kantor Cabang), jam operasional,
 * dan ringkasan layanan yang diselenggarakan.
 *
 * Query params (opsional):
 *   ?location_id=1  -> Filter instansi yang beroperasi di lokasi tertentu
 *   ?q=dukcapil     -> Pencarian nama/deskripsi instansi
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationIdParam = searchParams.get("location_id");
    const queryParam = searchParams.get("q")?.toLowerCase().trim();

    const supabase = createServiceClient();

    // Ambil semua instansi
    let agenciesQuery = supabase
      .from("agencies")
      .select("id, name, description, open_time, close_time, operating_days")
      .order("id", { ascending: true });

    if (queryParam) {
      agenciesQuery = agenciesQuery.ilike("name", `%${queryParam}%`);
    }

    const { data: rawAgencies, error: agenciesError } = await agenciesQuery;

    if (agenciesError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FETCH_AGENCIES_FAILED",
            message: agenciesError.message,
          },
        },
        { status: 500 }
      );
    }

    // Ambil data relasi lokasi melalui agency_locations
    const { data: agencyLocations, error: locError } = await supabase
      .from("agency_locations")
      .select("agency_id, location_id, locations(id, name, address, city, latitude, longitude, type)");

    if (locError) {
      console.warn("Gagal mengambil agency_locations:", locError.message);
    }

    // Ambil ringkasan layanan per instansi
    const { data: services, error: servError } = await supabase
      .from("services")
      .select("id, agency_id, name, estimated_time")
      .order("id", { ascending: true });

    if (servError) {
      console.warn("Gagal mengambil data services:", servError.message);
    }

    // Map relasi lokasi per agency_id
    const locationMap = new Map<number, Array<{
      id: number;
      name: string;
      address: string;
      city: string | null;
      latitude: number | null;
      longitude: number | null;
      type: string;
    }>>();

    if (agencyLocations) {
      for (const item of agencyLocations) {
        if (!item.locations) continue;
        const loc = item.locations as unknown as {
          id: number;
          name: string;
          address: string;
          city: string | null;
          latitude: number | null;
          longitude: number | null;
          type: string;
        };

        const existing = locationMap.get(item.agency_id) ?? [];
        existing.push({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          city: loc.city,
          latitude: loc.latitude,
          longitude: loc.longitude,
          type: loc.type,
        });
        locationMap.set(item.agency_id, existing);
      }
    }

    // Map layanan per agency_id
    const serviceMap = new Map<number, Array<{
      id: number;
      name: string;
      estimated_time: number | null;
    }>>();

    if (services) {
      for (const s of services) {
        if (!s.agency_id) continue;
        const existing = serviceMap.get(s.agency_id) ?? [];
        existing.push({
          id: s.id,
          name: s.name,
          estimated_time: s.estimated_time,
        });
        serviceMap.set(s.agency_id, existing);
      }
    }

    let agenciesResult = (rawAgencies ?? []).map((agency) => {
      const locs = locationMap.get(agency.id) ?? [];
      const servs = serviceMap.get(agency.id) ?? [];

      return {
        id: agency.id,
        name: agency.name,
        description: agency.description,
        open_time: agency.open_time,
        close_time: agency.close_time,
        operating_days: agency.operating_days,
        locations: locs,
        services_count: servs.length,
        services: servs,
      };
    });

    // Filter berdasarkan location_id jika diminta
    if (locationIdParam) {
      const locId = Number(locationIdParam);
      if (!Number.isNaN(locId)) {
        agenciesResult = agenciesResult.filter((a) =>
          a.locations.some((l) => l.id === locId)
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        count: agenciesResult.length,
        agencies: agenciesResult,
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
