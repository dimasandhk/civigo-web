# Plan: Integrasi Lanjutan Kios, Grafik Beranda, & Manajemen Loket

## 1. Koreksi File Migrasi SQL Reviews
- [x] Perbaiki `queue_id uuid` di `supabase/migrations/20260912020000_create_reviews_table.sql`

## 2. Integrasi Kios Walk-in & Check-in Mandiri
- [x] Implementasi Check-in di `/display/input-code`:
  - [x] Buat form interaktif yang menerima kode/nomor antrean (`CheckInForm.tsx`)
  - [x] Verifikasi tiket antrean hari ini dan ubah status `scheduled` → `present` (`/api/queue/check-in`)
  - [x] Tampilkan kartu/modal sukses check-in dengan nomor antrean dan instruksi ruang tunggu
- [x] Implementasi Pendaftaran Walk-in di `/display/select-layanan`:
  - [x] Ambil layanan aktif dari database Supabase secara dinamis
  - [x] Ketika layanan diklik, buka dialog/modal input NIK dan konfirmasi pendaftaran walk-in (`KioskServiceSelection.tsx`)
  - [x] Panggil `POST /api/queue/book` untuk menerbitkan tiket antrean baru
  - [x] Tampilkan struk tiket nomor antrean hasil booking walk-in

## 3. Integrasi Grafik Beranda Admin Dinamis (`/admin`)
- [x] Hitung data distribusi antrean per layanan dari tabel `queues` untuk `ServiceDonutChart`
- [x] Hitung data tren antrean 7 hari terakhir dari tabel `queues` untuk `WeeklyQueueChart`
- [x] Pasang data dinamis tersebut di `app/admin/page.tsx`

## 4. Manajemen Status Loket di Admin (`/admin/loket`)
- [x] Buat Server Action / handler untuk toggle status loket (`active` ↔ `inactive`) dan tambah loket baru (`counter-actions.ts`)
- [x] Tambahkan modal dialog "Tambah Loket" (`LoketTableManager.tsx`)
- [x] Ubah tombol aksi pada baris loket agar interaktif (toggle status buka/tutup dan edit/hapus loket)

## 5. Verifikasi Menyeluruh (Tanpa Push)
- [x] Jalankan `pnpm run lint` (pass - 0 errors, 0 warnings)
- [x] Jalankan `pnpm run build` (pass - 17/17 routes generated cleanly)
- [x] Verifikasi semua alur berjalan lancar

