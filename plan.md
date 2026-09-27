# Plan: Supabase & Backend Development (CiviGo)

## 1. Pembersihan Nama Loket (`counters`)
- [x] Buat file migrasi SQL `supabase/migrations/20260927201500_clean_counter_names.sql` untuk menghapus teks dalam kurung pada `counter_name`
- [x] Eksekusi pembersihan nama di live database Supabase via script Node.js menggunakan service role key

## 2. Realtime Broadcast Antrean untuk Layar Display
- [x] Buat file migrasi SQL `supabase/migrations/20260927201600_enable_realtime_for_queues.sql` (`ALTER PUBLICATION supabase_realtime ADD TABLE public.queues;`)

## 3. Opsionalkan `time_block` pada Tabel `queues`
- [x] Buat file migrasi SQL `supabase/migrations/20260927201700_make_time_block_nullable.sql` (`ALTER TABLE public.queues ALTER COLUMN time_block DROP NOT NULL;`)

## 4. Master Dokumen Layanan (`service_documents`) & Relasi Array ID
- [x] Buat file migrasi SQL `supabase/migrations/20260927201800_create_service_documents.sql`:
  - Tabel `public.service_documents` (id, name, description, agency_id, created_at)
  - Seed master dokumen standar dari layanan yang ada
  - Tambah kolom `requirement_doc_ids integer[]` dan `output_doc_ids integer[]` di tabel `services`
  - Migrasikan data relasi ID
- [x] Buat endpoint REST API `app/api/documents/route.ts` dan pastikan `cross-agency.ts` tetap backward-compatible

## 5. Backend Forgot Password
- [x] Buat API Route `app/api/auth/forgot-password/route.ts` (menerima email, memanggil `supabase.auth.resetPasswordForEmail`) untuk konsumsi Mobile App
- [x] Buat API Route `app/api/auth/reset-password/route.ts` (untuk update user password setelah token reset terverifikasi)
- [x] Tambahkan Server Action `requestPasswordReset` di `lib/auth/actions.ts`

## 6. Backend Analytics
- [x] Buat file migrasi SQL `supabase/migrations/20260927201900_analytics_functions.sql` (RPC / View untuk analitik kepuasan & antrean)
- [x] Buat API Route `app/api/analytics/route.ts` yang mendukung filter `agency_id` & `location_id`
  - Ringkasan kepuasan warga (rating rata-rata, total ulasan, breakdown bintang 1-5, persentase sangat puas)
  - Metrik operasional antrean (total hari ini, selesai, dilewati/hangus, menunggu, rata-rata waktu layanan)
  - Tren mingguan & distribusi antrean per layanan

## 7. Verifikasi & Local Commit
- [x] Jalankan lint & build test
- [x] Simpan commit lokal (JANGAN PUSH KE REMOTE)
