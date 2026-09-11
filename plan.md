# Plan: Integrasi Menyeluruh Supabase ke CiviGo Web

## 1. Setup Database: Tabel Reviews, Akun Instansi, & Seed Data
- [x] Buat tabel `reviews` migration SQL di `supabase/migrations/20260912020000_create_reviews_table.sql`
- [x] Buat akun auth instansi (`disdukcapil@civigo.com`) di Supabase Auth dan assign ke `public.users` dengan role `'instansi'` dan `agency_id: 1`
- [x] Seed data awal: loket Disdukcapil (Loket 1-8), layanan, dan antrean hari ini di Supabase live
- [x] Perbarui `lib/supabase/database.types.ts` dengan tipe tabel `reviews` dan `users` yang akurat

## 2. Integrasi Autentikasi Login Instansi
- [x] Update form login di `app/page.tsx` menjadi interaktif dengan Server Action
- [x] Dukung input email instansi / username instansi dengan pesan error interaktif
- [x] Pastikan redirect ke `/admin` setelah login berhasil

## 3. Integrasi Data Nyata pada Halaman Admin
- [x] `app/admin/page.tsx` (Beranda): Ambil statistik antrean, sisa antrean, dan loket aktif dari Supabase
- [x] `app/admin/loket/page.tsx`: Tampilkan daftar loket riil dari tabel `counters`
- [x] `app/admin/layanan/page.tsx`: Tampilkan katalog layanan riil dari tabel `services`
- [x] `app/admin/antrean/page.tsx`: Tampilkan antrean aktif per loket, fungsikan tombol "Selesaikan Layanan", "Hanguskan Antrean", dan "Panggil Antrean"
- [x] `app/admin/ulasan/page.tsx`: Tampilkan statistik ulasan dan ulasan terbaru dari tabel `reviews`

## 4. Integrasi Layar Kios & Display TV
- [x] `app/display/select-layanan/page.tsx`: Katalog layanan terintegrasi
- [x] `app/display/antrean/page.tsx`: Tampilkan nomor antrean per loket dari tabel `queues` & aktifkan Supabase Realtime via `QueueDisplayLive`

## 5. Verifikasi & Finalisasi
- [x] Uji alur login instansi
- [x] Uji pemanggilan antrean dan update realtime
- [x] Jalankan `pnpm run lint` dan `pnpm run build` (lulus bersih tanpa error)
- [x] Commit dan push ke repository
