import { createServiceClient } from "@/lib/supabase/service";

/**
 * Lokasi (cabang) tempat perangkat kios/TV dipasang.
 *
 * Kios tidak login, jadi cabangnya ikut di URL (`?locationId=`), sama seperti layar TV.
 * Dibaca dengan service_role karena halaman kios diakses anonim.
 */
export type KioskLocation = { id: number; name: string };

/** `?locationId=2` -> lokasi 2, atau `null` kalau kosong/tidak valid/tidak ada. */
export async function resolveKioskLocation(
  raw: string | string[] | undefined,
): Promise<KioskLocation | null> {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  if (!value || !Number.isInteger(id) || id <= 0) return null;

  const { data } = await createServiceClient()
    .from("locations")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  return data ?? null;
}

/** Semua cabang, untuk memilih lokasi saat kios dibuka tanpa `?locationId=`. */
export async function getKioskLocations(): Promise<KioskLocation[]> {
  const { data, error } = await createServiceClient()
    .from("locations")
    .select("id, name")
    .order("id", { ascending: true });

  if (error) throw new Error(`Gagal memuat lokasi: ${error.message}`);
  return data ?? [];
}

/** Instansi yang membuka layanan di cabang ini (`agency_locations`). */
export async function getAgencyIdsAtLocation(locationId: number): Promise<Set<number>> {
  const { data, error } = await createServiceClient()
    .from("agency_locations")
    .select("agency_id")
    .eq("location_id", locationId);

  if (error) throw new Error(`Gagal memuat instansi di lokasi: ${error.message}`);
  return new Set((data ?? []).map((row) => row.agency_id));
}

/** `/display/select-layanan` + lokasi -> `/display/select-layanan?locationId=2`. */
export function withKioskLocation(path: string, locationId: number): string {
  return `${path}?locationId=${locationId}`;
}
