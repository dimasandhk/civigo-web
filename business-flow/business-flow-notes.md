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
  - Terikat pada cabang fisik lokasi bertugas via `location_id` (`location_id IS NOT NULL`).
  - NIK bersifat opsional (karena mewakili akun instansi/loket).
  - Kebijakan akun: Akun operator dibuat dedicated per cabang/lokasi (misal: `agency_id = 1, location_id = 1` untuk Disdukcapil MPP, dan `agency_id = 1, location_id = 2` untuk Disdukcapil Kantor Induk).
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
2. Dashboard admin menyajikan rekap total ulasan, rata-rata skor, tingkat kepuasan, rata-rata bulan berjalan (WIB), dan filter per layanan/loket/rating (lihat poin 5.8).

---

## 4. Struktur Database & Entitas Utama

- **`agencies`**: Data instansi induk pemerintah (id, nama, deskripsi). Tetap bersih hanya berisi instansi induk (1 = Disdukcapil, 2 = Samsat, 3 = Imigrasi) tanpa menduplikasi nama instansi per cabang.
- **`locations`**: Master lokasi fisik/gedung pelayanan (id, name, address, city, type: 'mpp' | 'kantor_induk'). Contoh: ID 1 = MPP Grha Sawala, ID 2 = Kantor Disdukcapil Jl. Ambon.
- **`agency_locations`**: Relasi instansi dengan lokasi cabang fisiknya (many-to-many: Disdukcapil ada di MPP & Kantor Induk).
- **`users`**: Mirror dari `auth.users` Supabase (id, nik, full_name, email, role, agency_id, location_id).
- **`services`**: Katalog layanan per instansi (nama, requirements JSONB, output_documents, estimasi waktu, info_procedure).
- **`counters`**: Loket fisik layanan per instansi dan lokasi cabang (counter_name, status, agency_id, location_id).
- **`queues`**: Transaksi antrean (nomor antrean, schedule_date, time_block, status, user_id, nik, service_id, counter_id, location_id).
- **`reviews`**: Ulasan dan penilaian kepuasan layanan warga (rating 1-5, comment, agency_id, service_id, counter_id, queue_id, user_id).
- **`family_members`**: Anggota keluarga warga untuk pendaftaran antrean perwakilan.

---

## 5. Keputusan & Catatan Arsitektur Terbaru
1. **Supabase SSR**: Menggunakan `@supabase/ssr` dengan penanganan sesi token di `proxy.ts` (Next.js 16 proxy convention).
2. **Composite Foreign Keys**: `queues` memiliki composite FK ke `services(id, agency_id)` dan `counters(id, agency_id)` untuk menjamin integritas relasi antar-instansi di tingkat database.
3. **Trigger Keamanan**: `handle_new_user()` berjalan di level database dengan `security definer` untuk membuat baris di `public.users` dengan role default `user`, mencegah eskalasi hak akses dari payload client.
4. **Arsitektur Multi-Cabang & Pemisahan Instansi vs Lokasi**:
   - **Tabel `agencies`** tetap bersih hanya berisi master instansi induk:
     - `id = 1`: Disdukcapil
     - `id = 2`: Samsat
     - `id = 3`: Imigrasi
     *(Tidak menduplikasi instansi menjadi "Disdukcapil MPP", "Disdukcapil Induk", dsb. karena katalog layanannya sama-sama milik Disdukcapil).*
   - **Tabel `locations`** mendefinisikan lokasi fisik gedungnya:
     - `id = 1`: Mall Pelayanan Publik (MPP) Grha Sawala
     - `id = 2`: Kantor Disdukcapil (Kantor Induk)
     - `id = 3`: Kantor Samsat Bandung Timur
     - `id = 4`: Kantor Imigrasi Kelas I TPI Bandung
   - **Tabel `users`** menyimpan akun operator:
     - Akun MPP: `agency_id = 1`, `location_id = 1`
     - Akun Kantor Induk: `agency_id = 1`, `location_id = 2`
   - **Isolasi Dashboard Admin**: Saat petugas login, `resolveAgencyContext()` otomatis membaca `agency_id` dan `location_id`. Antrean di `/admin/antrean`, daftar loket, dan antrean berikutnya yang dipanggil (`callNextQueue`) otomatis terfilter khusus untuk lokasi cabang tersebut.
5. **Integrasi Supabase & Scalar API Docs (Terbaru)**:
   - Migrasi resmi via Supabase CLI telah berhasil diterapkan ke remote DB `pcaadxclrsrdeutcwtsp`.
   - Nama loket di tabel `counters` dibersihkan tanpa tanda kurung (`Loket 1`, `Loket 2`, dst.).
   - Layar display antrean kini berstatus real-time WebSocket (`supabase_realtime` publikasi pada tabel `queues`).
   - Kolom `time_block` pada `queues` telah dijadikan opsional (nullable) untuk dynamic pooling.
   - Master dokumen persyaratan dan output dipisahkan ke tabel **`service_documents`** untuk melindungi tabel `documents` milik AI Chatbot RAG.
   - Dokumentasi API interaktif Scalar dapat diakses di `/docs`, dan raw spec di `/api/openapi.json`.
   - Selengkapnya baca: [`business-flow/supabase-backend-integration-notes.md`](./supabase-backend-integration-notes.md).
6. **Display TV live lewat Broadcast, bukan postgres_changes (27/09/2026)**:
   - Temuan: publikasi `supabase_realtime` pada `queues` tidak pernah sampai ke display. Display tidak login (anon), dan postgres_changes mengikuti RLS — policy `queues` cuma `auth.uid() = user_id`, jadi anon menerima 0 event. Display sebenarnya hanya update dari polling 10 detik.
   - Solusi: migrasi `20260927162830_broadcast_queue_changes_to_display` menambah trigger `queues_broadcast_to_display` (insert/update/delete, hanya antrean hari ini) yang memanggil `realtime.send()` ke topic publik `display:agency:<agency_id>` dengan event `queue_changed`.
   - Payload sengaja tanpa data tiket (hanya `agency_id`), jadi topic publik aman dan `queues` tetap tertutup untuk anon — NIK tidak ikut terbuka.
   - `QueueDisplayLive` subscribe ke topic tersebut lalu `router.refresh()`; data tetap dibaca server lewat service_role. Polling diturunkan jadi 60 detik sebagai jaring pengaman.
   - Publikasi `queues` tetap dipertahankan untuk klien yang login (mis. mobile warga), karena RLS mengizinkan mereka melihat tiket sendiri.
7. **Manajemen loket dibatasi instansi + cabang petugas (28/09/2026)**:
   - Temuan: server action loket (`lib/data/counter-actions.ts`) menerima `counterId` dari client tanpa cek kepemilikan. Petugas Samsat bisa mengubah nama, menonaktifkan, atau menghapus loket Disdukcapil cukup dengan mengirim id-nya — server action adalah endpoint POST yang bisa dipanggil tanpa lewat UI.
   - Sekarang setiap toggle/ubah nama/hapus mencari loketnya dulu di cakupan yang sama dengan halaman `/admin/loket`: `agency_id` petugas, plus `location_id` kalau akunnya terikat cabang. Loket di luar cakupan ditolak dengan "Loket tidak ditemukan di instansi atau cabang Anda." tanpa menulis apa pun.
   - Tambah loket tidak lagi diam-diam menaruh loket di lokasi 1 kalau akun petugas tidak punya `location_id`; aksinya ditolak dengan pesan agar admin mengisi lokasi cabang akun.
   - Loket tidak punya jam operasional — jam operasional diatur per instansi (`agencies.open_time/close_time/operating_days`). Kolom "Jadwal Buka" yang isinya hardcoded "Senin - Jumat / 08:00 - 16:00" dihapus dari tabel loket.
   - Sesi yang habis saat menekan tombol loket kini benar-benar di-redirect ke halaman login (`unstable_rethrow`), bukan muncul sebagai pesan error "NEXT_REDIRECT".
8. **CRUD layanan & filter ulasan di dashboard instansi (28/09/2026)**:
   - **`/admin/layanan` kini bisa tambah, lihat detail, ubah, hapus, dan cari.** Aksinya di `lib/data/service-actions.ts` (server action, service_role) dan setiap tulisan dibatasi `agency_id` petugas — petugas tidak bisa mengubah layanan instansi lain lewat id.
   - **Dokumen dipilih dari master `service_documents`**, bukan diketik bebas. Kalau belum ada, petugas bisa menambah dokumen baru dari pemilih (nama unik global; nama yang sudah ada langsung dipilih, tidak diduplikasi). Katalognya global karena dokumen dipakai lintas instansi (mis. "KTP Asli" milik Disdukcapil jadi syarat Samsat & Imigrasi).
   - **Id dan nama dokumen selalu ditulis berpasangan.** Server menerima id saja (`requirement_doc_ids` / `output_doc_ids`), lalu mengambil nama dari `service_documents` dan menulis `requirements` / `output_documents` dengan urutan yang sama. API mobile tetap membaca nama teks, jadi `/api/services` tidak berubah.
   - **Hapus layanan ditolak kalau sudah dipakai.** `services` tidak punya kolom status, jadi layanan tidak bisa "dinonaktifkan" seperti loket (keputusan 28/09/2026: tanpa migrasi). `queues.service_id` tanpa ON DELETE (hapus akan gagal FK) dan `reviews.service_id` ON DELETE SET NULL (ulasan kehilangan layanannya diam-diam), jadi aksi hapus mengecek keduanya dan menolak dengan jumlah antrean/ulasan. Layanan yang belum pernah dipakai dihapus permanen.
   - Badge status "Aktif" di tabel layanan dihapus — nilainya selama ini hardcoded, tidak ada kolomnya di database.
   - **`/admin/ulasan` memakai filter asli.** Opsi layanan & loket diambil dari data instansi; pilihan disimpan di URL (`?layanan=&loket=&rating=`) dan menyaring statistik, rincian rating, dan daftar sekaligus. Nilai URL yang bukan milik instansi dianggap "Semua". Tidak ada filter per lokasi (tidak diperlukan).
   - **"Bulan Ini" = rata-rata ulasan bulan berjalan WIB** (`startOfMonthInJakarta()` di `lib/queue/time.ts`), bukan lagi rata-rata keseluruhan. Waktu ulasan juga ditampilkan dalam WIB.
   - **Fallback data karangan ulasan dihapus** (500 ulasan, 4.6/5, komentar contoh). Query gagal dilempar seperti loader admin lain; instansi tanpa ulasan melihat angka nol dan empty state.
   - Temuan data: ulasan Samsat id 8 menunjuk `counter_id = 4` (Loket 3 milik Disdukcapil). Filter loket Samsat karenanya tidak menemukan ulasan itu. Dikoreksi 28/09/2026 ke `counter_id = 3` (Loket 1, satu-satunya loket Samsat); sekarang 0 ulasan dengan relasi lintas instansi. Sumbernya tiket antrean B-001 (20/09/2026) yang juga tercatat di loket 4, dan ada satu tiket lain yang serupa (B-01, 11/09/2026: layanan Disdukcapil di loket Samsat). Dua tiket itu juga dikoreksi 28/09/2026: B-001 → loket 3 (Loket 1 Samsat), B-01 → loket 2 (Loket 2 Disdukcapil, loket yang dipakai ulasan layanan KK). Sekarang 0 tiket dan 0 ulasan dengan relasi lintas instansi. Database belum mencegah ini untuk `queues` — yang menjaga baru kode pemanggil.
   - **`POST /api/reviews` kini menolak relasi lintas instansi.** Layanan, loket, dan antrean (dari `queue_id`) harus milik `agency_id` ulasan; kalau tidak → `422` `SERVICE_/COUNTER_/QUEUE_AGENCY_MISMATCH`. Id yang tidak ada dijawab `404` (`SERVICE_/COUNTER_/QUEUE_NOT_FOUND`) dan id yang bukan bilangan bulat `400 INVALID_ID` — sebelumnya keduanya jadi `500` dari foreign key / query. `agency_id` dan `service_id` tetap boleh diturunkan dari `queue_id`.
9. **Prasyarat bisa berupa dokumen atau kondisi (03/10/2026)**:
   - Commit `3d06c2d` (Satya) menambah `service_documents.type` (`'dokumen'` | `'kondisi'`, default `'dokumen'`, CHECK constraint). Kondisi = syarat non-berkas: "Berusia 17 Tahun", "Smartphone dengan koneksi internet", "Email aktif". Mobile membacanya lewat array `requirements[]` (`name`, `agency_id`, `type`) di `/api/services/[id]/prerequisites`.
   - Pemilih dokumen di `/admin/layanan` kini membedakannya: kondisi ditandai label "KONDISI" (chip kuning) di pemilih, tabel layanan, dan detail. Tambah dokumen baru di pemilih prasyarat punya dua tombol, "sebagai dokumen" atau "sebagai kondisi" (Enter = dokumen).
   - **Kondisi tidak bisa jadi dokumen output.** Pemilih output menyembunyikan kondisi, dan `toServiceRow()` di server menolak `output_doc_ids` yang berisi kondisi (server action bisa dipanggil tanpa UI).
   - `type` dokumen yang sudah ada tidak bisa diubah dari dashboard: katalognya global, jadi petugas satu instansi tidak boleh mengubah klasifikasi yang dipakai instansi lain. Koreksi lewat migrasi/SQL.
   - Catatan: kalau layanan tidak punya `requirement_doc_ids`, `getServiceRequirements()` (kode Satya) jatuh ke tebakan regex pada nama (`usia|umur|tahun|...|wajib`), bukan kolom `type`. Layanan yang disimpan lewat dashboard selalu punya id, jadi jalur itu hanya untuk data lama.
10. **Mundurkan antrean & satu urutan panggil (03/10/2026, Web #5)**:
   - Tombol **"Mundurkan Antrean"** di `/admin/antrean` (saat ada tiket dilayani) memanggil `POST /api/queue/[id]/postpone`: tiket kembali `present`, `counter_id = null`, `postponed = true`, `postponed_at = now()`.
   - **Opsi A (keputusan 03/10/2026):** tiket yang dimundurkan dipanggil paling akhir, di belakang semua orang termasuk yang belum check-in (`scheduled`). Sesama dimundurkan: yang lebih dulu dimundurkan dipanggil lebih dulu.
   - **Satu urutan panggil** di `lib/queue/ordering.ts` (`sortWaiting()`), dipakai tombol "Panggil Antrean Berikutnya", kartu "Selanjutnya"/"Sisa Antrean" di dasbor, dan "Antrean Berikutnya" di layar TV. Sebelumnya dasbor dan TV mengurutkan per nomor tiket, jadi setelah ada yang dimundurkan keduanya menampilkan tiket yang salah sebagai "berikutnya".
   - **Hanya tiket `served` yang bisa dimundurkan** (`422 POSTPONE_REQUIRES_SERVED`). Sebelumnya tiket `scheduled` juga diterima dan diubah jadi `present`, sehingga orang yang belum pernah datang tercatat hadir dan kios menjawab "Anda sudah check-in".
   - Detail, simulasi sebelum/sesudah, dan screenshot: [`web5-mundurkan-antrean.md`](./web5-mundurkan-antrean.md).
11. **Perbaikan hasil audit Web #1–#5 (03/10/2026)**:
   - **`queues.completed_at`** (migrasi `20261003115823_add_completed_at_to_queues`): diisi trigger `queues_set_completed_at` saat status berubah jadi `completed`, supaya jalur apa pun (API, SQL manual) ikut tercatat. Kartu "Sebelumnya" di dasbor loket memakai tiket dengan `completed_at` terbaru (`latestCompleted()`), bukan nomor terbesar — yang salah begitu ada tiket dimundurkan. Tiket yang selesai sebelum kolom ini ada tetap `null` dan dianggap paling awal.
   - **Dasbor antrean realtime lewat broadcast**, sama dengan layar TV (poin 6): subscribe `display:agency:<agency_id>` event `queue_changed`. Langganan `postgres_changes` lama tidak pernah menerima tiket warga karena RLS `queues` hanya `auth.uid() = user_id`, jadi dasbor sebenarnya cuma polling 12 detik. Diverifikasi: perubahan dari database muncul dalam ±2 detik. Polling cadangan 30 detik.
   - **Hanya loket aktif sebagai tab di `/admin/antrean`.** Cabang tanpa loket aktif melihat "Belum Ada Loket Aktif" tanpa tombol panggil; dulu dasbor jatuh ke loket id 1 (milik Disdukcapil).
   - Tiket tanpa sesi jam menampilkan "Tanpa sesi"; `QueueItem.time_block` kini `string | null` sesuai kolomnya.
   - Contoh username di form login tidak lagi `disdukcapil.surabaya` (menyiratkan username per cabang berfungsi).
   - Masalah yang masih diketahui dicatat di [`dokumentasi-web-tasks.md`](./dokumentasi-web-tasks.md#masalah-yang-masih-diketahui).
12. **Profil & ubah password tanpa OTP (06/10/2026, daftar baru web-dashboard #4–#5)**:
   - Keputusan: alur lupa password lewat email (Web #6 lama) tidak dilanjutkan. Mailer bawaan Supabase hanya mengirim ke anggota Team project, dan akun instansi `@civigo.com` bukan mailbox sungguhan. Password diubah setelah login; lupa password direset admin.
   - `/admin/profil`: ubah nama lengkap lewat sesi pengguna sendiri (RLS + grant kolom `full_name`), dan ubah password dengan password saat ini + konfirmasi. Password saat ini dicek dengan login sekali pakai yang sesinya dicabut `scope: "local"`; sesi lain tidak dikeluarkan karena satu akun cabang dipakai beberapa loket.
   - `PasswordInput` (tombol tampilkan/sembunyikan) dipakai di login dan Profil.
   - **Logout kini `signOut({ scope: "local" })`.** Default supabase-js adalah `global`, jadi keluar di satu loket dulu mengeluarkan semua loket yang memakai akun cabang yang sama. Penolakan akun warga di portal web juga hanya mengakhiri sesi web, bukan sesi warga di aplikasi mobile.
   - Detail dan semua kasus: [`dokumentasi-web-tasks.md`](./dokumentasi-web-tasks.md#profil--ubah-password-adminprofil-daftar-baru-45-06102026).
13. **Kios walk-in tanpa sesi jam (06/10/2026, daftar baru web-dashboard #2)**:
   - Form walk-in kios tidak lagi meminta "Pilih Sesi Jam Layanan" (termasuk sesi uji coba malam/weekend buatan client). Tiket dibuat tanpa `time_block` dan dilayani sesuai urutan panggil (`sortWaiting()`); struk menampilkan estimasi layanan dan form menampilkan jam layanan instansi.
   - Aturan kapasitas (jam operasional, bukan kuota) dipindah ke server untuk booking tanpa sesi: untuk hari ini, `max(sekarang, jam buka) + estimated_time` tidak boleh melewati `close_time` → `SERVICE_EXCEEDS_CLOSING`, dan setelah tutup → `OUTSIDE_OPERATING_HOURS`. Dulu booking tanpa sesi tidak dicek jam operasional sama sekali.
   - **Kios tahu cabangnya.** Cabang ikut di URL (`/display?locationId=`), dipilih sekali per perangkat atau dibuka dari dialog Display dasbor (yang kini juga membawa cabang ke layar TV). Kios hanya menampilkan instansi yang buka di cabang itu dan mengirim `location_id` saat booking; dulu semua walk-in tercatat di lokasi 1 (MPP). `bookQueue` menolak instansi yang tidak buka di cabang tersebut (`422 AGENCY_NOT_AT_LOCATION`); tanpa `location_id` tetap default MPP.
   - **Pengecualian uji coba di production dihapus.** `bookQueue` dulu melewati cek jam operasional untuk sesi mulai ≥ 18:00 dan untuk booking hari ini di hari libur, juga di production. Sekarang hanya `next dev` dan `ALLOW_OFFHOURS_TESTING="true"` (pasang di deployment kalau demo malam/akhir pekan).
14. **Rentang waktu di Beranda (06/10/2026, daftar baru web-dashboard #3)**:
   - "Tingkat Kehadiran", "Antrean Hangus", dan "Antrean Per Layanan" punya pilihan Hari ini / Minggu ini / Bulan ini, masing-masing di URL (`?kehadiran=`, `?hangus=`, `?layanan=`). Semua rentang berakhir hari ini (WIB); minggu mulai Senin. "Antrean Per Minggu" tanpa dropdown.
   - **Rumus kehadiran diganti:** hadir (`present`/`served`/`completed`) ÷ (hadir + `skipped`); tiket `scheduled` belum punya hasil dan tidak dihitung. Rumus lama (total − hangus) ÷ total menghitung semua booking yang belum datang sebagai hadir.
   - "Antrean Per Layanan" dulu menghitung semua tiket sepanjang masa dan menampilkan layanan 0% saat kosong; sekarang mengikuti rentang dan punya empty state. Dropdown di kartu-kartu ini dulu hanya hiasan.
   - Detail: [`dokumentasi-web-tasks.md`](./dokumentasi-web-tasks.md#beranda-rentang-waktu-admin-daftar-baru-3-06102026).
15. **Urutan panggil sesuai nomor, tanpa mendahulukan yang sudah check-in (06/10/2026, `9c6273d`, Satya)**:
   - Aturan "`present` (sudah check-in) sebelum `scheduled` (belum datang)" dihapus dari `sortWaiting()` (`lib/queue/ordering.ts`). Urutan sekarang: belum dimundurkan dulu (yang dimundurkan paling akhir, FIFO menurut `postponed_at`), lalu sesi jam lebih awal, lalu nomor antrean.
   - **Disengaja (dikonfirmasi 07/10/2026):** antrean dipanggil sesuai nomornya, termasuk warga yang belum check-in di kios. Contoh: B-001 booking tapi belum check-in, B-002 sudah check-in → B-001 dipanggil lebih dulu (dulu B-002). Kalau warganya tidak ada, petugas menghanguskan atau memundurkannya.
   - Berlaku sama untuk tombol "Panggil Antrean Berikutnya", kartu "Selanjutnya"/"Sisa Antrean", dan layar TV, karena ketiganya memakai `sortWaiting()`.
16. **Penanda check-in di dasbor loket diperbaiki (07/10/2026)**:
   - Commit `9c6273d` menambah penanda "Sudah/Belum Check-in" di dasbor loket dan kolom `queues.checked_in_at` (diisi `POST /api/queue/check-in`), tetapi tiket yang sedang dilayani selalu tampil "Belum Check-in" karena dua hal: migrasi `20261006191500_add_checked_in_at_to_queues` belum dijalankan di DB remote (endpoint check-in diam-diam memakai fallback tanpa kolom itu), dan `getTodayQueues()` tidak men-select `checked_in_at` sehingga penanda hanya membaca `status === "present"`.
   - 07/10/2026: migrasi dijalankan di DB remote dan dicatat dengan versi `20261006191500` (sama dengan file repo, seperti `supabase migration repair`), dan `checked_in_at` ditambahkan ke query dasbor.
   - Tiket yang check-in sebelum 07/10/2026 tidak punya `checked_in_at`, jadi kalau sedang dilayani masih tampil "Belum Check-in". Check-in baru tercatat normal.
