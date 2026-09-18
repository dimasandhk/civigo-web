# Plan: Multi-Cabang & Entitas Lokasi (Locations & Branch Support)

## 1. File Migrasi SQL
- [x] Buat file migrasi `supabase/migrations/20260918231500_create_locations_and_branch_support.sql`:
  - Tabel `public.locations` (id, name, address, city, type, latitude, longitude, created_at)
  - Tabel `public.agency_locations` (agency_id, location_id)
  - Tambah kolom `location_id` pada tabel `counters`, `queues`, dan `users`
  - Index & RLS policies untuk `locations` dan `agency_locations`
  - Seed awal 4 lokasi (1 Gedung MPP + 3 Kantor Induk) & relasi dinas
  - Backfill aman data eksisting ke `location_id = 1` (MPP)

## 2. Sinkronisasi Tipe Database & Sesi
- [x] Update `lib/supabase/database.types.ts`:
  - Tambahkan tipe `locations` dan `agency_locations`
  - Tambahkan `location_id: number | null` pada `counters`, `queues`, dan `users`
- [x] Update `lib/auth/session.ts`:
  - Tambahkan `location_id: number | null` pada tipe `Profile`
  - Ambil `location_id` saat membaca profil akun petugas

## 3. Integrasi Web Dashboard Admin
- [x] Update `lib/data/admin.ts`:
  - Dukung isolasi antrean per lokasi cabang (`location_id`) pada `getTodayQueues` dan `getAdminDashboardStats`
- [x] Update tampilan admin agar menampilkan informasi cabang/lokasi yang sedang aktif

## 4. Verifikasi & Local Commit (Tanpa Push)
- [x] Jalankan `pnpm run lint`
- [x] Jalankan `pnpm run build`
- [x] Simpan commit lokal (JANGAN PUSH)
