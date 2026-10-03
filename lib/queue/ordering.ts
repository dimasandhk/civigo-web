import { parseTimeBlock } from "./time";

/**
 * Urutan panggil antrean menunggu — satu-satunya sumber kebenaran.
 *
 * Dipakai tombol "Panggil Antrean Berikutnya" (`callNextQueue`), kartu
 * "Selanjutnya" / "Sisa Antrean" di dasbor, dan "Antrean Berikutnya" di layar TV.
 * Sebelumnya dasbor dan TV mengurutkan per nomor tiket, jadi setelah ada tiket
 * dimundurkan keduanya menampilkan "berikutnya" yang berbeda dari yang dipanggil.
 *
 * 1. Tiket yang belum pernah dimundurkan dulu; yang dimundurkan paling belakang,
 *    di belakang semua orang termasuk yang belum check-in (keputusan 03/10/2026, opsi A).
 * 2. `present` (sudah check-in) sebelum `scheduled` (belum datang).
 * 3. Sesama dimundurkan: yang dimundurkan lebih dulu dipanggil lebih dulu.
 * 4. Sesi jam yang lebih awal, tiket tanpa sesi paling belakang.
 * 5. Nomor antrean.
 *
 * Modul ini tanpa akses server supaya bisa dipakai komponen client.
 */
export type WaitingTicket = {
  status: string;
  postponed?: boolean | null;
  postponed_at?: string | null;
  time_block: string | null;
  queue_number: string;
};

function sessionStart(block: string | null): number {
  if (!block) return Number.MAX_SAFE_INTEGER;
  return parseTimeBlock(block)?.startMinutes ?? Number.MAX_SAFE_INTEGER;
}

export function compareWaiting(a: WaitingTicket, b: WaitingTicket): number {
  const postponedA = Boolean(a.postponed);
  const postponedB = Boolean(b.postponed);
  if (postponedA !== postponedB) return postponedA ? 1 : -1;

  const presence = (status: string) => (status === "present" ? 0 : 1);
  if (presence(a.status) !== presence(b.status)) return presence(a.status) - presence(b.status);

  if (postponedA && postponedB && a.postponed_at && b.postponed_at) {
    const diff = new Date(a.postponed_at).getTime() - new Date(b.postponed_at).getTime();
    if (diff !== 0) return diff;
  }

  const sessionDiff = sessionStart(a.time_block) - sessionStart(b.time_block);
  if (sessionDiff !== 0) return sessionDiff;

  return a.queue_number.localeCompare(b.queue_number);
}

/** Salinan terurut; array aslinya tidak diubah. */
export function sortWaiting<T extends WaitingTicket>(tickets: readonly T[]): T[] {
  return [...tickets].sort(compareWaiting);
}
