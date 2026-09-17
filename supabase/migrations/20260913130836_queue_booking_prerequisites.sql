-- Prasyarat skema untuk POST /api/queue/book (Dev 2, Tugas 1).
--
-- Logika kuota per time-block belum ada tabelnya, jadi penjaga kapasitas
-- sementara adalah jam operasional instansi: booking ditolak kalau jam mulai
-- sesi + estimasi layanan melewati jam tutup.

-- 1. Jam operasional instansi.
--    Default 08:00-16:00 Senin-Jumat menyamai nilai yang selama ini di-hardcode
--    di UI admin (lib/data/admin.ts), jadi 3 baris agencies yang sudah ada
--    langsung valid tanpa backfill manual.
alter table public.agencies
  add column open_time time not null default '08:00',
  add column close_time time not null default '16:00',
  -- ISO day-of-week: Senin=1 .. Minggu=7, sesuai extract(isodow from date).
  add column operating_days smallint[] not null default '{1,2,3,4,5}';

alter table public.agencies
  add constraint agencies_hours_ordered check (close_time > open_time);

-- 2. NIK pemohon pada tiket.
--    Kiosk walk-in tidak punya sesi, jadi identitasnya cuma NIK yang diketik.
--    Kalau NIK itu cocok dengan sebuah akun, user_id ikut diisi; kalau tidak,
--    user_id tetap null dan NIK ini satu-satunya jejak pemohon.
--
--    Nullable karena 11 baris queues yang sudah ada tidak punya nilai ini.
--    CHECK-nya lolos saat NULL, mengikuti pola users_nik_format.
alter table public.queues add column nik varchar(16);

alter table public.queues
  add constraint queues_nik_format
  check (nik is null or nik ~ '^[0-9]{16}$');

-- 3. Penjaga sebenarnya untuk nomor antrean.
--    Endpoint mengalokasikan nomor dengan membaca MAX lalu menulis. Tanpa index
--    ini, dua request bersamaan membaca MAX yang sama dan sama-sama menulis
--    A-05. Dengan index ini yang kalah kena 23505 lalu menghitung ulang.
create unique index queues_number_per_service_day_idx
  on public.queues (schedule_date, service_id, queue_number);

-- 4. Jadikan endpoint satu-satunya jalur tulis.
--    Sebelum ini seorang warga login bisa INSERT langsung ke /rest/v1/queues --
--    policy "Warga kelola antrean sendiri" mengizinkan selama user_id = dirinya
--    sendiri -- sehingga seluruh validasi jam operasional bisa dilewati begitu
--    saja. Endpoint menulis pakai service_role, jadi tidak terpengaruh.
--
--    SELECT sengaja TIDAK dicabut: pembacaan queues sudah bermasalah sendiri
--    (policy yang sama membuat admin & display membaca 0 baris), dan mencabut
--    SELECT hanya menambah kerusakan tanpa menutup celah apa pun.
revoke insert, update, delete on public.queues from anon, authenticated;
