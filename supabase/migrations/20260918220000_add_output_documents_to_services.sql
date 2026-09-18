-- Migrasi penambahan kolom output_documents pada tabel public.services (Dev 2, Tugas 2).
--
-- Kolom ini menyimpan daftar dokumen resmi yang diterbitkan/dihasilkan oleh
-- suatu layanan setelah warga menyelesaikan antrean di loket.
-- Digunakan oleh algoritma Cross-Agency Logic untuk memetakan prasyarat
-- antar-layanan (misal: Layanan Paspor butuh KTP & KK, yang dihasilkan oleh
-- layanan di Disdukcapil).

-- 1. Tambah kolom output_documents bertipe text[]
alter table public.services
  add column if not exists output_documents text[] not null default array[]::text[];

-- 2. Seed / backfill dokumen output untuk layanan default
update public.services
set output_documents = array['KTP-el Fisik', 'KTP Asli']
where id = 1 or name = 'Pembuatan KTP Baru';

update public.services
set output_documents = array['Kartu Keluarga (KK)', 'KK Asli']
where id = 2 or name = 'Cetak Kartu Keluarga (KK)';

update public.services
set output_documents = array['STNK yang Disahkan (SKPD)', 'STNK Asli']
where id = 3 or name = 'Perpanjangan STNK Tahunan';

update public.services
set output_documents = array['Paspor RI']
where id = 4 or name = 'Pembuatan Paspor';

update public.services
set output_documents = array['Identitas Kependudukan Digital (IKD)']
where id = 5 or name = 'Aktivasi Identitas Kependudukan Digital';

update public.services
set output_documents = array['Surat Rekomendasi Adminduk']
where id = 6 or name = 'Konsultasi Administrasi Kependudukan';
