-- Prasyarat skema untuk API status & reschedule (Dev 2, Tugas 3).

-- 1. Kunci nilai status.
--    Kolomnya varchar bebas tanpa penjaga apa pun, padahal seluruh alur admin
--    bergantung padanya. Data yang ada sudah memakai kelima nilai ini dan tidak
--    ada yang NULL, jadi constraint langsung valid tanpa backfill.
alter table public.queues alter column status set not null;

alter table public.queues
  add constraint queues_status_valid
  check (status in ('scheduled', 'present', 'served', 'completed', 'skipped'));

-- 2. Jejak reschedule.
--    Tiket hangus tidak diubah; yang dibuat adalah tiket baru yang menunjuk
--    balik ke tiket lamanya. Dengan begitu riwayat "pernah hangus" tetap utuh
--    untuk laporan, dan rantai geser bisa ditelusuri.
--
--    ON DELETE SET NULL: menghapus tiket lama tidak boleh ikut menghapus tiket
--    penggantinya, yang sudah jadi janji temu tersendiri.
alter table public.queues
  add column rescheduled_from uuid references public.queues (id) on delete set null;

-- Satu tiket hangus hanya boleh melahirkan satu pengganti. Tanpa ini, dobel
-- klik pada tombol reschedule menghasilkan dua tiket untuk orang yang sama.
-- Partial index: banyak baris ber-NULL tetap diperbolehkan.
create unique index queues_rescheduled_from_unique
  on public.queues (rescheduled_from)
  where rescheduled_from is not null;
