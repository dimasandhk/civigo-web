# CiviGo — Business Flow & Architecture Notes

Dokumentasi ini merangkum alur bisnis sistem CiviGo, evolusi skema database, dan status implementasi terkini (mengacu pada catatan arsitektur dan migrasi Supabase).

---

## 1. Ikhtisar Sistem (Overview)

CiviGo adalah platform digital pengelolaan antrean dan layanan publik pemerintahan / instansi (seperti Disdukcapil, MPP, Samsat, dll). Sistem mencakup dua sisi utama:
1. **Sisi Kios & Display Publik (`/display`)**:
   - Digunakan oleh warga di lokasi pelayanan fisik (Mall Pelayanan Publik / Kantor Instansi).
   - Mendukung warga yang sudah memiliki kode/tiket antrean (booking online) melalui scan QR / input kode manual (`/display/input-code`).
   - Mendukung warga walk-in (belum mendaftar) untuk memilih kategori layanan secara langsung di mesin kios (`/display/select-layanan`).
   - Layar monitor display publik (`/display/antrean`) menampilkan nomor antrean yang sedang aktif dilayani di tiap loket beserta daftar antrean berikutnya.
2. **Sisi Petugas / Admin Instansi (`/admin`)**:
   - Digunakan oleh petugas loket dan administrator instansi.
   - Pemanggilan antrean (`/admin/antrean`): Selesaikan Layanan, Hanguskan Antrean, nomor saat ini, dsb.
   - Manajemen Loket (`/admin/loket`): buka/tutup loket, status aktif/nonaktif, jam operasional.
   - Manajemen Katalog Layanan (`/admin/layanan`): syarat dokumen, estimasi waktu, status layanan.
   - Monitoring & Analitik Ulasan Warga (`/admin/ulasan`): rating, kepuasan, feedback per layanan/loket.

---

## 2. Peran Pengguna (Roles)

Skema database menggunakan tipe enum `public.user_role`:
- **`user` (Warga / Citizen)**:
  - Wajib memiliki NIK (16 digit angka valid).
  - Tidak terikat pada `agency_id` (`agency_id IS NULL`).
  - Mendaftar mandiri (self-signup) via Supabase Auth.
- **`instansi` (Petugas / Operator Instansi)**:
  - Wajib terikat pada `agency_id` (`agency_id IS NOT NULL`).
  - NIK bersifat opsional (karena mewakili akun instansi/loket).
  - Kebijakan saat ini: 1 akun instansi per agensi (`unique index users_one_account_per_agency`).
- **`super_admin` (Admin Sistem Global)**:
  - Scope global (tidak terikat agensi spesifik, `agency_id IS NULL`).

---

## 3. Alur Bisnis Utama (Core Business Flows)

### A. Alur Registrasi & Booking Antrean oleh Warga
1. Warga melakukan reservasi layanan (via web/mobile app).
2. Sistem menerbitkan nomor antrean, jadwal tanggal (`schedule_date`), dan blok waktu (`time_block`).
3. Warga menerima kode tiket / QR Code.

### B. Alur Check-in di Kios Fisik (`/display`)
1. **Warga Sudah Mendaftar**:
   - Memilih menu "Sudah Mendaftar" -> Scan QR Code atau ketik kode tiket.
   - Tiket divalidasi ke sistem antrean hari tersebut.
2. **Warga Belum Mendaftar (Walk-in)**:
   - Memilih menu "Belum Mendaftar" -> Memilih instansi & jenis layanan.
   - Sistem mencetak/menerbitkan nomor antrean instan sesuai kuota walk-in.

### C. Alur Pelayanan di Loket Petugas (`/admin/antrean`)
1. Petugas login ke dashboard instansi (`/`).
2. Petugas memilih loket aktif yang sedang dijaga (misal Loket 5).
3. Petugas memanggil nomor antrean saat ini.
4. Display publik (`/display/antrean`) terupdate secara realtime.
5. Selesai pelayanan -> Petugas klik "Selesaikan Layanan" (status antrean berubah jadi selesai).
6. Jika warga tidak hadir setelah dipanggil -> Petugas klik "Hanguskan Antrean" (status antrean jadi hangus/skipped).

### D. Alur Ulasan & Feedback (`/admin/ulasan`)
1. Setelah layanan diselesaikan, warga dapat memberikan rating (1-5 bintang) dan komentar.
2. Dashboard admin menyajikan rekap total ulasan, rata-rata skor, tingkat kepuasan, dan filter per loket/layanan.

---

## 4. Struktur Database & Entitas Utama

- **`agencies`**: Data instansi pemerintah (nama, deskripsi).
- **`users`**: Mirror dari `auth.users` Supabase (id, nik, full_name, email, role, agency_id).
- **`services`**: Katalog layanan per instansi (nama, requirements JSONB, estimasi waktu, info_procedure).
- **`counters`**: Loket fisik layanan per instansi (counter_name, status operasional).
- **`queues`**: Transaksi antrean (nomor antrean, schedule_date, time_block, status, user_id, service_id, counter_id, agency_id).
- **`family_members`**: Anggota keluarga warga untuk pendaftaran antrean perwakilan.

---

## 5. Keputusan & Catatan Arsitektur Terbaru
1. **Supabase SSR**: Menggunakan `@supabase/ssr` dengan penanganan sesi token di `proxy.ts` (Next.js 16 proxy convention).
2. **Composite Foreign Keys**: `queues` memiliki composite FK ke `services(id, agency_id)` dan `counters(id, agency_id)` untuk menjamin integritas relasi antar-instansi di tingkat database.
3. **Trigger Keamanan**: `handle_new_user()` berjalan di level database dengan `security definer` untuk membuat baris di `public.users` dengan role default `user`, mencegah eskalasi hak akses dari payload client.
