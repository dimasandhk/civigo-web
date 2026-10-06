-- Migration: Tambah kolom checked_in_at pada tabel queues
--
-- Mencatat waktu kapan warga melakukan check-in di kios fisik/mesin mandiri.
-- Jika bernilai NULL, berarti warga belum melakukan check-in (status 'scheduled').
-- Saat warga check-in di kios, kolom ini diisi timestamp waktu kehadiran.

alter table public.queues
  add column if not exists checked_in_at timestamptz;

comment on column public.queues.checked_in_at is
  'Waktu warga melakukan check-in fisik di kios. Null jika belum check-in.';
