-- Migration: Master Dokumen Layanan (service_documents) & Relasi Array of IDs
-- Membuat tabel katalog master dokumen persyaratan dan output layanan (khusus CiviGo).
-- Menggunakan nama 'service_documents' agar TIDAK bertabrakan dengan tabel 'documents'
-- yang digunakan oleh AI Chatbot RAG vector database.

-- 1. Buat tabel katalog master dokumen
create table if not exists public.service_documents (
  id serial primary key,
  name text not null unique,
  description text,
  agency_id integer references public.agencies(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS untuk service_documents
alter table public.service_documents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'service_documents' and policyname = 'service_documents_public_read'
  ) then
    create policy "service_documents_public_read"
      on public.service_documents for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'service_documents' and policyname = 'service_documents_auth_write'
  ) then
    create policy "service_documents_auth_write"
      on public.service_documents for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- 2. Tambah kolom array referensi ID pada tabel services
alter table public.services
  add column if not exists requirement_doc_ids integer[] not null default array[]::integer[],
  add column if not exists output_doc_ids integer[] not null default array[]::integer[];

comment on column public.services.requirement_doc_ids is 'Daftar ID service_documents yang menjadi syarat pengajuan layanan.';
comment on column public.services.output_doc_ids is 'Daftar ID service_documents yang diterbitkan sebagai hasil layanan.';

-- 3. Seed data master dokumen standar
insert into public.service_documents (name, agency_id, description)
values
  ('KTP-el Fisik', 1, 'KTP elektronik fisik pemohon'),
  ('KTP Asli', 1, 'KTP asli pemohon'),
  ('Fotokopi KK', 1, 'Fotokopi Kartu Keluarga terbaru'),
  ('Kartu Keluarga (KK)', 1, 'Dokumen Kartu Keluarga resmi'),
  ('KK Asli', 1, 'Kartu Keluarga asli'),
  ('Surat Pengantar RT/RW', 1, 'Surat pengantar resmi dari RT/RW setempat'),
  ('Berusia 17 Tahun', 1, 'Syarat usia minimum pemohon'),
  ('Buku Nikah', 1, 'Buku akta nikah resmi dari KUA/Catatan Sipil'),
  ('KTP Suami Istri', 1, 'KTP asli/fotokopi milik suami dan istri'),
  ('STNK Asli', 2, 'Surat Tanda Nomor Kendaraan asli'),
  ('STNK yang Disahkan (SKPD)', 2, 'Surat Ketetapan Pajak Daerah / Pengesahan STNK'),
  ('BPKB Asli', 2, 'Buku Pemilik Kendaraan Bermotor asli'),
  ('Paspor RI', 3, 'Buku Paspor Republik Indonesia'),
  ('Akta Kelahiran / Ijazah', 1, 'Kutipan Akta Kelahiran atau Ijazah pendidikan terakhir'),
  ('Smartphone dengan koneksi internet', 1, 'Perangkat untuk registrasi akun IKD'),
  ('Email aktif', 1, 'Alamat email aktif pemohon'),
  ('KTP Pemohon', 1, 'Identitas KTP pemohon konsultasi'),
  ('Dokumen berkas terkait', 1, 'Berkas adminduk yang akan dikonsultasikan'),
  ('Identitas Kependudukan Digital (IKD)', 1, 'Aplikasi dan identitas kependudukan digital resmi'),
  ('Surat Rekomendasi Adminduk', 1, 'Surat rekomendasi tindak lanjut adminduk')
on conflict (name) do nothing;

-- 4. Sinkronisasi requirement_doc_ids dan output_doc_ids di tabel services
-- Service 1: Pembuatan KTP Baru
update public.services
set
  requirement_doc_ids = array(
    select id from public.service_documents
    where name in ('Fotokopi KK', 'Surat Pengantar RT/RW', 'Berusia 17 Tahun')
    order by id
  ),
  output_doc_ids = array(
    select id from public.service_documents
    where name in ('KTP-el Fisik', 'KTP Asli')
    order by id
  )
where id = 1;

-- Service 2: Cetak Kartu Keluarga (KK)
update public.services
set
  requirement_doc_ids = array(
    select id from public.service_documents
    where name in ('Buku Nikah', 'KTP Suami Istri')
    order by id
  ),
  output_doc_ids = array(
    select id from public.service_documents
    where name in ('Kartu Keluarga (KK)', 'KK Asli')
    order by id
  )
where id = 2;

-- Service 3: Perpanjangan STNK Tahunan
update public.services
set
  requirement_doc_ids = array(
    select id from public.service_documents
    where name in ('STNK Asli', 'KTP Asli', 'BPKB Asli')
    order by id
  ),
  output_doc_ids = array(
    select id from public.service_documents
    where name in ('STNK yang Disahkan (SKPD)', 'STNK Asli')
    order by id
  )
where id = 3;

-- Service 4: Pembuatan Paspor
update public.services
set
  requirement_doc_ids = array(
    select id from public.service_documents
    where name in ('KTP Asli', 'KK Asli', 'Akta Kelahiran / Ijazah')
    order by id
  ),
  output_doc_ids = array(
    select id from public.service_documents
    where name in ('Paspor RI')
    order by id
  )
where id = 4;

-- Service 5: Aktivasi Identitas Kependudukan Digital
update public.services
set
  requirement_doc_ids = array(
    select id from public.service_documents
    where name in ('KTP-el Fisik', 'Smartphone dengan koneksi internet', 'Email aktif')
    order by id
  ),
  output_doc_ids = array(
    select id from public.service_documents
    where name in ('Identitas Kependudukan Digital (IKD)')
    order by id
  )
where id = 5;

-- Service 6: Konsultasi Administrasi Kependudukan
update public.services
set
  requirement_doc_ids = array(
    select id from public.service_documents
    where name in ('KTP Pemohon', 'Dokumen berkas terkait')
    order by id
  ),
  output_doc_ids = array(
    select id from public.service_documents
    where name in ('Surat Rekomendasi Adminduk')
    order by id
  )
where id = 6;
