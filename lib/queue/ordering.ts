import { parseTimeBlock } from "./time";

/**
 * Urutan panggil antrean menunggu — satu-satunya sumber kebenaran.
 *
 * Dipakai tombol "Panggil Antrean Berikutnya" (`callNextQueue`), kartu
 * "Selanjutnya" / "Sisa Antrean" di dasbor, dan "Antrean Berikutnya" di layar TV.
 *
 * Prioritas pemanggilan:
 * 1. Prioritas khusus (is_priority: lansia/disabilitas/ibu hamil) selalu lebih dulu.
 * 2. Tiket yang belum pernah dimundurkan dulu; yang dimundurkan paling belakang,
 *    di belakang semua orang termasuk yang belum check-in.
 * 3. Sesama dimundurkan: yang dimundurkan lebih dulu dipanggil lebih dulu.
 * 4. Tiket reschedule hasil no-show tidak boleh menyalip tiket reguler (time_block: null)
 *    yang sudah menunggu tepat waktu.
 * 5. Sesi jam yang lebih awal; tiket tanpa sesi paling belakang.
 * 6. Nomor antrean: diurutkan secara numerik berdasarkan urutan angka (seq.num),
 *    baru prefiks huruf sebagai tie-breaker (sehingga B-001 dipanggil sebelum A-002,
 *    dan A-11 dipanggil sebelum A-100).
 */
export type WaitingTicket = {
  status: string;
  postponed?: boolean | null;
  postponed_at?: string | null;
  time_block: string | null;
  queue_number: string;
  is_priority?: boolean | null;
  created_at?: string | null;
  rescheduled_from?: string | null;
};

export function parseQueueSequence(queueNumber: string): { prefix: string; num: number } {
  const match = queueNumber.match(/^([A-Za-z]+)-?(\d+)$/);
  if (!match) {
    return { prefix: queueNumber, num: Number.MAX_SAFE_INTEGER };
  }
  return { prefix: match[1].toUpperCase(), num: Number.parseInt(match[2], 10) };
}

function sessionStart(block: string | null): number {
  if (!block) return Number.MAX_SAFE_INTEGER;
  return parseTimeBlock(block)?.startMinutes ?? Number.MAX_SAFE_INTEGER;
}

export function compareWaiting(a: WaitingTicket, b: WaitingTicket): number {
  // 1. Prioritas Khusus
  const priorityA = Boolean(a.is_priority);
  const priorityB = Boolean(b.is_priority);
  if (priorityA !== priorityB) return priorityA ? -1 : 1;

  // 2. Postponed (Dimundurkan)
  const postponedA = Boolean(a.postponed);
  const postponedB = Boolean(b.postponed);
  if (postponedA !== postponedB) return postponedA ? 1 : -1;

  if (postponedA && postponedB && a.postponed_at && b.postponed_at) {
    const diff = new Date(a.postponed_at).getTime() - new Date(b.postponed_at).getTime();
    if (diff !== 0) return diff;
  }

  // 3. Rescheduled No-Show Guard:
  // Tiket hasil reschedule no-show selalu ditaruh di urutan belakang setelah seluruh tiket reguler.
  const isRescheduledA = Boolean(a.rescheduled_from);
  const isRescheduledB = Boolean(b.rescheduled_from);

  if (isRescheduledA !== isRescheduledB) {
    return isRescheduledA ? 1 : -1;
  }

  // 4. Sesi Jam (Time Block)
  const sessionDiff = sessionStart(a.time_block) - sessionStart(b.time_block);
  if (sessionDiff !== 0) return sessionDiff;

  // 5. Waktu Pembuatan (Created At jika tersedia dan berbeda)
  if (a.created_at && b.created_at) {
    const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (timeDiff !== 0) return timeDiff;
  }

  // 6. Urutan Nomor Antrean (Numerik sequence, lalu prefix)
  const seqA = parseQueueSequence(a.queue_number);
  const seqB = parseQueueSequence(b.queue_number);

  const numDiff = seqA.num - seqB.num;
  if (numDiff !== 0) return numDiff;

  return seqA.prefix.localeCompare(seqB.prefix);
}

/** Salinan terurut; array aslinya tidak diubah. */
export function sortWaiting<T extends WaitingTicket>(tickets: readonly T[]): T[] {
  return [...tickets].sort(compareWaiting);
}

/**
 * Tiket yang paling akhir diselesaikan, untuk kartu "Sebelumnya" di dasbor loket.
 */
export function latestCompleted<T extends { completed_at: string | null }>(
  tickets: readonly T[],
): T | undefined {
  let latest: T | undefined;
  for (const ticket of tickets) {
    if (!latest || (ticket.completed_at ?? "") >= (latest.completed_at ?? "")) latest = ticket;
  }
  return latest;
}
