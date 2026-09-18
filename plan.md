# Plan: Dev 2 Tugas 2 — Field Dokumen Output Layanan & API Cross-Agency Logic

## 1. File Migrasi SQL
- [x] Buat file migrasi `supabase/migrations/20260918220000_add_output_documents_to_services.sql`
  - Tambah kolom `output_documents text[] default array[]::text[]` pada tabel `services`
  - Seed dokumen output untuk 6 layanan eksisting (Disdukcapil, Samsat, Imigrasi)

## 2. Core Engine Algoritma Cross-Agency
- [x] Buat modul `lib/queue/cross-agency.ts`:
  - Definisi tipe data & `DEFAULT_OUTPUT_DOCUMENTS` (fallback aman jika kolom remote belum dibuat di GUI Supabase)
  - Logika normalisasi teks dan matching dokumen (fuzzy / synonym tags: KTP, KK, STNK, Paspor, dll.)
  - Evaluasi prasyarat: pisahkan `fulfilled` dan `missing`
  - Deteksi cross-agency service: hubungkan missing document ke service penghasilnya
  - Deteksi dokumen eksternal (RT/RW, KUA, Leasing/Polri)
  - Penyusunan roadmap kunjungan antar-instansi (`suggested_flow`)

## 3. Implementasi API Routes untuk Mobile & Web
- [x] `GET /api/services`: Katalog layanan lengkap dengan agensi, requirements, dan output documents
- [x] `GET & POST /api/services/[id]/prerequisites`: Analisis prasyarat per ID layanan
- [x] `POST /api/services/cross-agency`: Endpoint fleksibel cross-agency evaluation

## 4. Tampilan Web Admin Layanan
- [x] Update `lib/data/admin.ts` (`getAdminServices`) untuk memuat `output_documents` dan `requirements`
- [x] Update `app/admin/layanan/page.tsx` untuk menampilkan kolom Dokumen Output & Persyaratan
- [x] Update `app/display/select-layanan/page.tsx` & `KioskServiceSelection.tsx` untuk menampilkan informasi dokumen output & persyaratan di kios

## 5. Dokumentasi Kontrak Bisnis
- [x] Buat `business-flow/dev2-task2-contract.md` melengkapi Task 1 dan Task 3

## 6. Verifikasi & Local Commit (Tanpa Push)
- [x] Uji fungsionalitas algoritma & API via test script
- [x] Jalankan `pnpm run lint` (pass - 0 errors, 0 warnings)
- [x] Jalankan `pnpm run build` (pass - 19/19 routes generated cleanly)
- [x] Simpan commit lokal (JANGAN PUSH)
