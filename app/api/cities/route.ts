import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface CityItem {
  id: number;
  name: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
}

const DEFAULT_CITIES: CityItem[] = [
  { id: 1, name: "Surabaya", province: "Jawa Timur", latitude: -7.2575, longitude: 112.7521 },
  { id: 2, name: "Bandung", province: "Jawa Barat", latitude: -6.9175, longitude: 107.6191 },
  { id: 3, name: "Serang", province: "Banten", latitude: -6.1104, longitude: 106.164 },
  { id: 4, name: "Jakarta Pusat", province: "DKI Jakarta", latitude: -6.1818, longitude: 106.8223 },
];

/**
 * GET /api/cities
 *
 * Mengambil daftar kota yang tersedia untuk pemilih lokasi di aplikasi mobile.
 * Mendukung query langsung dari tabel `cities`, dengan fallback cerdas ke tabel `locations`.
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    // 1. Coba ambil dari tabel master `cities`
    const { data: dbCities, error: citiesError } = await supabase
      .from("cities")
      .select("id, name, province, latitude, longitude")
      .order("name", { ascending: true });

    if (!citiesError && dbCities && dbCities.length > 0) {
      return NextResponse.json(
        {
          ok: true,
          count: dbCities.length,
          cities: dbCities,
        },
        { status: 200 }
      );
    }

    // 2. Fallback: Ekstraksi kota unik dari tabel `locations`
    const { data: locations } = await supabase
      .from("locations")
      .select("city, latitude, longitude");

    if (locations && locations.length > 0) {
      const cityMap = new Map<string, { latitude: number | null; longitude: number | null }>();
      for (const loc of locations) {
        if (!loc.city) continue;
        const cityName = loc.city.trim();
        if (!cityMap.has(cityName)) {
          cityMap.set(cityName, {
            latitude: loc.latitude ?? null,
            longitude: loc.longitude ?? null,
          });
        }
      }

      if (cityMap.size > 0) {
        let idCounter = 1;
        const extracted: CityItem[] = Array.from(cityMap.entries()).map(([name, coords]) => ({
          id: idCounter++,
          name,
          province: name === "Surabaya" ? "Jawa Timur" : name === "Serang" ? "Banten" : "Jawa Barat",
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));

        return NextResponse.json(
          {
            ok: true,
            count: extracted.length,
            cities: extracted,
          },
          { status: 200 }
        );
      }
    }

    // 3. Fallback default
    return NextResponse.json(
      {
        ok: true,
        count: DEFAULT_CITIES.length,
        cities: DEFAULT_CITIES,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET_CITIES_ERROR]", error);
    return NextResponse.json(
      {
        ok: true,
        count: DEFAULT_CITIES.length,
        cities: DEFAULT_CITIES,
      },
      { status: 200 }
    );
  }
}
