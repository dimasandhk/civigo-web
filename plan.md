# Plan: Step 4 — Pembuatan & Integrasi Tabel Reviews (Ulasan)

## 1. Penyempurnaan File Migrasi SQL Reviews
- [x] Koreksi tipe kolom foreign key di `supabase/migrations/20260912020000_create_reviews_table.sql`:
  - `agency_id integer` (bukan bigint)
  - `service_id integer` (bukan bigint)
  - `counter_id integer` (bukan bigint)
  - `queue_id uuid`
  - Policy RLS untuk `select` publik, `insert` (authenticated + anon), dan `service_role`
  - Seed data awal untuk Disdukcapil (agency_id = 1)

## 2. Sinkronisasi Tipe Database
- [x] Update `lib/supabase/database.types.ts` untuk `reviews`:
  - Perbaiki `queue_id: string | null` (tipe UUID)

## 3. Endpoint API Reviews (`/api/reviews`)
- [x] Buat `app/api/reviews/route.ts`:
  - `GET /api/reviews`: Ambil ulasan berdasarkan `agency_id` / `service_id`
  - `POST /api/reviews`: Kirim ulasan baru (rating 1-5, comment, service_id, counter_id, queue_id)

## 4. Integrasi & Fallback Halaman Admin Ulasan
- [x] Verifikasi `lib/data/admin.ts` (`getAdminReviews`) dan `app/admin/ulasan/page.tsx`
  - Fallback anggun jika tabel belum dieksekusi di remote
  - Otomatis menampilkan data nyata begitu tabel di-create di Supabase

## 5. Dokumentasi & Panduan Eksekusi SQL Supabase
- [x] Siapkan panduan jelas beserta SQL siap salin ke Supabase SQL Editor

## 6. Verifikasi & Local Commit (Tanpa Push)
- [x] Jalankan `pnpm run lint` (pass - 0 errors, 0 warnings)
- [x] Jalankan `pnpm run build` (pass - 20/20 routes generated cleanly)
- [x] Simpan commit lokal (JANGAN PUSH)
