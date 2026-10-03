import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateHaversineDistance, cleanCityName } from "@/lib/locations/distance";

interface NominatimResponse {
  display_name?: string;
  address?: {
    city?: string;
    county?: string;
    town?: string;
    municipality?: string;
    state_district?: string;
    state?: string;
    country?: string;
  };
}

/**
 * GET /api/locations/reverse-geocode
 *
 * Menerima koordinat GPS (?lat=-6.9175&lng=107.6191) dan mengembalikan nama kota.
 * Menggunakan OpenStreetMap Nominatim sebagai penyedia utama,
 * dengan fail-safe fallback otomatis ke data kota terdekat di database CiviGo.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
    const lngParam = searchParams.get("lng") ?? searchParams.get("longitude");

    if (!latParam || !lngParam) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MISSING_COORDINATES",
            message: "Parameter koordinat lat dan lng wajib disertakan.",
          },
        },
        { status: 400 }
      );
    }

    const latitude = Number(latParam);
    const longitude = Number(lngParam);

    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_COORDINATES",
            message: "Koordinat latitude atau longitude tidak valid.",
          },
        },
        { status: 400 }
      );
    }

    let detectedCity = "";
    let displayName = "";

    // 1. Coba OpenStreetMap Nominatim
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
      const osmRes = await fetch(osmUrl, {
        headers: {
          "User-Agent": "CiviGo-App/1.0 (contact: admin@civigo.id)",
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (osmRes.ok) {
        const osmData = (await osmRes.json()) as NominatimResponse;
        displayName = osmData.display_name ?? "";
        const rawCity =
          osmData.address?.city ||
          osmData.address?.county ||
          osmData.address?.town ||
          osmData.address?.municipality ||
          osmData.address?.state_district;

        if (rawCity) {
          detectedCity = cleanCityName(rawCity);
        }
      }
    } catch {
      // Abaikan error jaringan OSM dan lanjutkan ke fallback database
    }

    // 2. Fallback: Cari kota terdekat di database CiviGo jika OSM tidak mengembalikan nama kota
    if (!detectedCity) {
      const supabase = createServiceClient();
      const { data: dbCities } = await supabase
        .from("cities")
        .select("name, latitude, longitude");

      let closestCity: string | null = null;
      let minDistance = Infinity;

      if (dbCities && dbCities.length > 0) {
        for (const city of dbCities) {
          if (city.latitude != null && city.longitude != null) {
            const dist = calculateHaversineDistance(
              latitude,
              longitude,
              city.latitude,
              city.longitude
            );
            if (dist < minDistance) {
              minDistance = dist;
              closestCity = city.name;
            }
          }
        }
      }

      if (!closestCity) {
        // Fallback dari locations
        const { data: dbLocs } = await supabase
          .from("locations")
          .select("city, latitude, longitude");

        if (dbLocs && dbLocs.length > 0) {
          for (const loc of dbLocs) {
            if (loc.city && loc.latitude != null && loc.longitude != null) {
              const dist = calculateHaversineDistance(
                latitude,
                longitude,
                loc.latitude,
                loc.longitude
              );
              if (dist < minDistance) {
                minDistance = dist;
                closestCity = loc.city;
              }
            }
          }
        }
      }

      detectedCity = closestCity ?? "Surabaya";
      if (!displayName) {
        displayName = `Wilayah sekitar ${detectedCity}`;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        city: detectedCity,
        display_name: displayName,
        coordinates: {
          latitude,
          longitude,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[REVERSE_GEOCODE_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mendeteksi lokasi kota.",
        },
      },
      { status: 500 }
    );
  }
}
