-- Migration: Tambah kolom type pada service_documents untuk membedakan 'dokumen' fisik dan 'kondisi' prasyarat
alter table public.service_documents
  add column if not exists type text not null default 'dokumen' check (type in ('dokumen', 'kondisi'));

comment on column public.service_documents.type is 'Kategori prasyarat: dokumen (berkas fisik/digital) atau kondisi (kriteria/syarat non-dokumen seperti umur, smartphone, dll)';

-- Tandai dokumen yang tergolong kondisi / kriteria non-dokumen fisik
update public.service_documents
set type = 'kondisi'
where name in (
  'Berusia 17 Tahun',
  'Smartphone dengan koneksi internet',
  'Email aktif'
);
