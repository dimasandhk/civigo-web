/**
 * Utility perhitungan jarak geografis (Haversine formula).
 */

/**
 * Menghitung jarak garis lurus antara dua titik koordinat dalam satuan kilometer (km).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Memformat jarak dalam bentuk teks yang ramah pengguna.
 * Contoh: 0.8 km -> "800 m", 1.43 km -> "1.4 km"
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Membersihkan awalan nama kota administratif Indonesia.
 * Contoh: "Kota Bandung" -> "Bandung", "Kota Administrasi Jakarta Pusat" -> "Jakarta Pusat"
 */
export function cleanCityName(rawName: string): string {
  if (!rawName) return "";
  return rawName
    .replace(/^Kota Administrasi\s+/i, "")
    .replace(/^Kota\s+/i, "")
    .replace(/^Kabupaten Administrasi\s+/i, "")
    .replace(/^Kabupaten\s+/i, "")
    .replace(/^Kab\.\s+/i, "")
    .trim();
}
