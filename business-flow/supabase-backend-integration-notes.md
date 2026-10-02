# CiviGo — Supabase & Backend Integration Handover Notes

Dokumen ini ditulis sebagai catatan resmi serah-terima teknis pengerjaan **Supabase Database, Migrasi CLI, dan Backend Services** agar rekan tim berikutnya memahami arsitektur, skema data terbaru, dan endpoint API yang telah disediakan.

---

## 1. Lingkungan Database & Supabase CLI

- **Project Ref**: `pcaadxclrsrdeutcwtsp` (Nama Proyek: `civigo`, Region: `ap-northeast-1` Tokyo)
- **Status Link**: Proyek lokal telah terhubung (`linked`) dengan Supabase remote.
- **Manajemen Migrasi**: Seluruh migrasi dikelola menggunakan **Supabase CLI** pada direktori `supabase/migrations/`.
- **Sinkronisasi Tipe Data**:
  Untuk meregenerasi tipe TypeScript otomatis dari database live, jalankan:
  ```bash
  pnpm run db:types
  ```
  *(Perintah ini menjalankan `npx supabase gen types typescript --linked > lib/supabase/database.types.ts`)*.

---

## 2. Riwayat Migrasi SQL yang Telah Diterapkan (Applied 100%)

Semua migrasi berikut telah berhasil di-push ke database Supabase remote:

| No | File Migrasi | Deskripsi & Dampak Skema |
|---|---|---|
| 1 | `20260918220000_add_output_documents_to_services.sql` | Penambahan kolom `output_documents text[]` pada tabel `public.services`. |
| 2 | `20260918231500_create_locations_and_branch_support.sql` | Arsitektur multi-cabang instansi (`locations`, `agency_locations`, `location_id` pada `users`, `counters`, dan `queues`). |
| 3 | `20260927201500_clean_counter_names.sql` | Pembersihan teks dalam kurung pada `counter_name` di tabel `counters` (misal `"Loket 1 (Perekaman)"` $\rightarrow$ `"Loket 1"`). |
| 4 | `20260927201600_enable_realtime_for_queues.sql` | Mengaktifkan `supabase_realtime` publikasi pada tabel `public.queues` dengan `REPLICA IDENTITY FULL` untuk layar display real-time. |
| 5 | `20260927201700_make_time_block_nullable.sql` | Mengubah kolom `time_block` pada `public.queues` menjadi `NULLABLE` (opsional) untuk mendukung dynamic pooling, serta menambah kolom `postponed boolean` dan `postponed_at timestamptz`. |
| 6 | `20260927201800_create_service_documents.sql` | Pembuatan tabel katalog master dokumen `public.service_documents` dan relasi array ID (`requirement_doc_ids` & `output_doc_ids`) pada `public.services`. |
| 7 | `20260927201900_analytics_functions.sql` | Fungsi SQL RPC: `get_agency_satisfaction_analytics` dan `get_agency_queue_analytics`. |
| 8 | `20260927204800_add_family_member_to_queues.sql` | Penambahan kolom `family_member_id integer REFERENCES public.family_members(id) ON DELETE SET NULL` pada tabel `public.queues` untuk relasi antrean perwakilan anggota keluarga. |

---

## 3. Catatan Sangat Penting: Pemisahan Tabel `service_documents` vs `documents`

> [!IMPORTANT]
> **JANGAN mengubah nama atau menghapus tabel `documents`!**
> - Tabel **`public.documents`** (`[id, content, metadata, embedding]`) digunakan secara aktif oleh sistem **AI Chatbot RAG** (`app/api/chatbot/route.tsx` dan `scripts/ingest.ts`) menggunakan RPC `match_documents` dan vector similarity OpenAI.
> - Oleh karena itu, katalog dokumen persyaratan dan output layanan publik ditempatkan pada tabel baru bernama **`public.service_documents`**:
>   - Kolom: `id (serial pk)`, `name (text unique)`, `description (text)`, `agency_id (integer fk)`, `created_at (timestamptz)`.
>   - Tabel `public.services` kini memiliki `requirement_doc_ids integer[]` dan `output_doc_ids integer[]` yang mereferensikan ID dari `service_documents`.

---

## 4. Perubahan Fungsional untuk Tim Frontend (Mobile & Kiosk)

### A. Blok Waktu (`time_block`) Bersifat Opsional (Dynamic Pooling)
- Ketika warga membuat antrean via Kiosk atau Mobile (`POST /api/queue/book`), kolom `time_block` **tidak wajib diisi** (boleh bernilai `null` atau string kosong).
- Sistem CiviGo menerapkan *Dynamic Pooling*: antrean dipanggil berdasarkan kehadiran warga (`present`), jam kedatangan, dan ketersediaan loket tanpa membatasi sesi jam kaku.

### B. Fitur "Mundurkan Antrean" (Postpone Queue) untuk Petugas Loket
- Petugas loket dapat memundurkan nomor antrean warga yang belum siap berkas atau sedang izin sebentar via `POST /api/queue/{id}/postpone`.
- **Mekanisme**: Tiket diberi tanda `postponed = true`, `postponed_at = now()`, dan status tetap `present`.
- **Pengurutan Prioritas**: Fungsi `callNextQueue` mendahulukan seluruh antrean reguler terlebih dahulu. Antrean yang dimundurkan ditempatkan di paling akhir antrean menunggu dan dilayani secara FIFO berdasarkan jam dimundurkannya (`postponed_at`).

### C. Modul Anggota Keluarga (Family Members)
- Warga dapat mendaftarkan anggota keluarga (ayah, ibu, anak, istri, suami) melalui `POST /api/family-members` (validasi format NIK 16 digit).
- Saat melakukan booking tiket (`POST /api/queue/book`), kirimkan `family_member_id`. Sistem otomatis mengaitkan tiket ke anggota keluarga tersebut dan mengisi NIK-nya jika tidak disertakan secara manual.

### D. Riwayat Antrean Warga (`/api/queue/my`)
- Endpoint `GET /api/queue/my` mengembalikan tiket antrean warga yang dipisahkan secara otomatis:
  - `active_tickets`: Tiket aktif hari ini atau masa depan (`scheduled`, `present`, `served`).
  - `history_tickets`: Tiket selesai (`completed`), dibatalkan (`cancelled`), atau tiket hangus/dilewati (`skipped`).
- Tiket yang hangus (`skipped`) pada hari ini memiliki flag `can_reschedule: true` yang siap dihubungkan langsung ke tombol *Reschedule* pada aplikasi mobile.

### E. 3 Kondisi Kelengkapan Dokumen (Tersedia, Belum Memiliki, Hilang/Rusak)
- Endpoint `POST /api/services/cross-agency` dan `POST /api/services/{id}/prerequisites` mendukung 3 kondisi dokumen pemohon:
  1. `sudah_tersedia` / `tersedia`: Dokumen sudah di tangan pemohon (terpenuhi).
  2. `belum_memiliki`: Dokumen belum dimiliki (direkomendasikan layanan CiviGo atau eksternal).
  3. `hilang_rusak`: Dokumen pernah dimiliki namun hilang/rusak. Sistem menandai `requires_police_report: true` dan menyisipkan langkah awal pembuatan Surat Tanda Penerimaan Laporan Kehilangan (SKTLK) di Polsek atau membawa fisik bukti rusak ke dalam `suggested_flow`.

### F. Display Antrean Real-Time (`/display/[agencyId]/antrean`)
- Layar TV Display menggunakan komponen `QueueDisplayLive.tsx` yang berlangganan langsung ke WebSocket Supabase (`postgres_changes` pada tabel `queues`).
- Begitu petugas di loket memanggil, memundurkan, atau menyelesaikan antrean, layar display publik langsung memperbarui antrean secara instan tanpa perlu polling manual.

---

## 5. Dokumentasi API Interaktif (Scalar API Reference)

Seluruh spesifikasi API CiviGo telah didokumentasikan lengkap menggunakan standar OpenAPI 3.1 dan dapat diakses secara interaktif melalui browser:

- **Scalar API Documentation Viewer**:  
  Buka di browser: **`http://localhost:3000/docs`**
  - Dilengkapi fitur pencarian endpoint (`CMD/CTRL + K`).
  - Fitur *Test Request / Try it out* langsung dari browser.
  - Tampilan tema modern dengan dukungan Dark/Light mode.
- **OpenAPI 3.1 JSON Specification**:  
  Dapat diunduh atau di-import ke Postman/Insomnia: **`http://localhost:3000/api/openapi.json`**

---

## 6. Ringkasan Endpoint REST API CiviGo

### A. Autentikasi & Akun (Mobile & Web)
- `POST /api/auth/register`: Mendaftarkan warga baru dengan email, password, NIK 16 digit, dan nama lengkap. Mengembalikan session token dan profil warga.
- `POST /api/auth/login`: Login universal untuk warga (via email atau NIK 16 digit) dan petugas (via username). Mengembalikan JWT token (`access_token`, `refresh_token`) dan profil akun.
- `GET /api/auth/me`: Mengambil profil akun user yang sedang login menggunakan header `Authorization: Bearer <token>` atau Cookie session.
- `POST /api/auth/forgot-password`: Kirim link/token reset kata sandi ke email warga.
- `POST /api/auth/reset-password`: Setel kata sandi baru dalam sesi pemulihan (mendukung Bearer token dari mobile).

### B. Master Instansi & Lokasi Cabang
- `GET /api/agencies`: Mengambil seluruh daftar instansi pemerintah, jam kerja, hari operasional, dan lokasi cabang MPP (filter: `?location_id=...`, `?q=...`).
- `GET /api/agencies/{id}`: Detail lengkap satu instansi beserta daftar loket pelayanan aktif, lokasi cabang, dan katalog layanan.

### C. Master Dokumen & Katalog Layanan
- `GET /api/documents`: Mengambil daftar master dokumen (`service_documents`), mendukung query param `?agency_id=...`.
- `GET /api/services`: Mengambil seluruh katalog layanan instansi beserta persyaratan dan jam kerja.
- `GET /api/services/{id}`: Mengambil detail layanan spesifik berdasarkan ID.
- `GET /api/services/{id}/prerequisites`: Evaluasi kelayakan booking layanan & daftar ringkas prasyarat untuk Mobile App (menghasilkan array `requirements` berisi `name`, `agency_id`, dan `type`: `'dokumen' | 'kondisi'`).
- `POST /api/services/cross-agency`: Menyusun rencana layanan multi-instansi cross-agency dengan dukungan 3 state dokumen (`sudah_tersedia`, `belum_memiliki`, `hilang_rusak`).

### D. Anggota Keluarga (Family Members)
- `GET /api/family-members`: Mengambil daftar anggota keluarga pengguna yang login (opsional `?user_id=...`).
- `POST /api/family-members`: Menambahkan anggota keluarga baru (`full_name`, `nik` 16 digit, `relationship`).
- `DELETE /api/family-members/{id}`: Menghapus data anggota keluarga.

### E. Antrean (Queues)
- `GET /api/queue/my`: Mengambil riwayat tiket antrean warga (dibagi menjadi `active_tickets` dan `history_tickets`, dengan flag `can_reschedule`).
- `POST /api/queue/book`: Mengambil nomor antrean baru (menerima `{ service_id, schedule_date, nik, time_block?, location_id?, family_member_id? }`).
- `GET /api/queue/{id}/status`: Memeriksa status tiket terkini.
- `PATCH /api/queue/{id}/status`: Mengubah status tiket (`present`, `served`, `completed`, `skipped`).
- `POST /api/queue/{id}/postpone`: Memundurkan nomor antrean ke urutan paling akhir dalam pool menunggu.
- `POST /api/queue/{id}/reschedule`: Menjadwalkan ulang tiket yang hangus (`skipped`).
- `POST /api/queue/check-in`: Check-in tiket saat warga tiba di lokasi fisik kios.
- `POST /api/queue/call-next`: Panggilan tiket berikutnya oleh petugas loket (`{ counter_id }`).

### F. Ulasan Warga (Reviews) & Analitik
- `GET /api/reviews`: Mengambil daftar ulasan dan feedback warga per instansi.
- `POST /api/reviews`: Mengirimkan rating bintang 1-5 dan testimoni warga.
- `GET /api/analytics`: Mengambil analitik komprehensif (`?agency_id=...&location_id=...&date=...`):
  - Ringkasan kepuasan ulasan (rata-rata bintang, total ulasan, persentase kepuasan, breakdown bintang 1-5).
  - Metrik antrean operasional (total tiket hari ini, menunggu, dipanggil, dilayani, selesai, dilewati/hangus, dimundurkan/postponed, rasio kehadiran, jumlah loket aktif).
  - Distribusi popularitas layanan publik.

### G. AI Chatbot
- `POST /api/chatbot`: Asisten virtual berbasis OpenAI embedding dan vector search `match_documents` pada Supabase untuk menjawab pertanyaan prosedur MPP dan persyaratan dokumen warga.

---

## 7. Automated Test Suite (Vitest)

Proyek ini telah dilengkapi dengan test suite terotomatisasi menggunakan **Vitest** dengan jaminan **Zero API Quota / Zero Cost Exhaustion**.

### Cara Menjalankan Tes:
```bash
# Menjalankan seluruh test suite sekali jalan
pnpm test

# Menjalankan test dalam mode watch (interaktif saat development)
pnpm test:watch
```

### Jaminan Keamanan Kuota Layanan Eksternal:
- **OpenAI API (Chatbot RAG)**: Di-mock penuh (`tests/api/chatbot-safety.test.ts`), sehingga 0 token OpenAI terpakai saat menjalankan test.
- **Supabase Auth Mailer (Forgot Password)**: Fungsi pengiriman email di-mock penuh (`tests/api/auth.test.ts`), sehingga tidak ada email yang terkirim atau menghabiskan kuota rate limit SMTP.
- **Database Supabase**: Menggunakan mock service client terisolasi untuk tes unit dan integrasi, menjamin data remote live tidak tercemar data testing.

### Cakupan 10 Test Suite (39 Tests 100% Pass):
1. `tests/unit/cross-agency.test.ts` (Evaluasi 3 kondisi dokumen: sudah_tersedia, belum_memiliki, hilang_rusak $\rightarrow$ SKTLK).
2. `tests/unit/queue-postpone.test.ts` (Logika memundurkan antrean dan pengurutan prioritas).
3. `tests/api/postpone.test.ts` (Endpoint `POST /api/queue/[id]/postpone`).
4. `tests/api/cross-agency-route.test.ts` (Endpoint `POST /api/services/cross-agency`).
5. `tests/api/agencies.test.ts` (Endpoint `GET /api/agencies` & `GET /api/agencies/[id]`).
6. `tests/api/family-members.test.ts` (Endpoint `GET`, `POST`, `DELETE /api/family-members`).
7. `tests/api/queue-my.test.ts` (Endpoint `GET /api/queue/my` pemisahan tiket aktif vs riwayat).
8. `tests/api/auth.test.ts` (Endpoint forgot password & reset password).
9. `tests/api/analytics.test.ts` (Endpoint analitik kepuasan dan antrean operasional).
10. `tests/api/chatbot-safety.test.ts` (Endpoint chatbot AI).

---

## 8. Data Dummy Siap Pakai & Script Seeder

Database Supabase remote telah diisi dengan data dummy realistis agar tim Web, Mobile, dan Kiosk dapat langsung melakukan pengujian fitur.

### A. Perintah Re-seed Data:
Jika data terhapus atau ingin di-reset kembali, cukup jalankan:
```bash
pnpm run seed
```

### B. Akun Pengujian yang Tersedia:
- **Akun Warga**: `warga1@civigo.com` | Password: `Password123!` (User ID: `842f8f38-e83a-48c9-b4f8-96d0789f5832`, NIK: `0000999999999999`)
- **Akun Petugas Disdukcapil**: `disdukcapil@civigo.com` (atau login via username `disdukcapil`) | Password: `Password123!` (Agency ID: 1, Location ID: 1 MPP)
- **Akun Petugas Samsat**: `samsatdimas@gmail.com` | Password: *(Menggunakan kata sandi pribadi pemilik akun)* (Agency ID: 2, Location ID: 1 MPP)

### C. Data Anggota Keluarga (`family_members`) Milik `warga1@civigo.com`:
1. **Siti Aminah** (Istri) — NIK: `3578015504850001` (ID: 1)
2. **Budi Santoso** (Anak Kandung) — NIK: `3578011208080002` (ID: 2)
3. **Haji Ahmad Dahlan** (Orang Tua) — NIK: `3578010101500003` (ID: 3)

### D. Data Antrean Testing Hari Ini (`queues`):
1. **`A-001` (Status: `scheduled`)** — ID: `f1a10001-0000-4000-8000-000000000001`
   - *Tujuan Test*: Uji fitur check-in di mesin kios (`/display/input-code`) atau scan QR di lokasi fisik.
2. **`A-002` (Status: `present`)** — ID: `f1a10002-0000-4000-8000-000000000002`
   - *Tujuan Test*: Tiket perwakilan untuk anak (*Budi Santoso*). Cek di `GET /api/queue/my` muncul badge keluarga.
3. **`A-003` (Status: `present`, `postponed: true`)** — ID: `f1a10003-0000-4000-8000-000000000003`
   - *Tujuan Test*: Menguji antrean yang dimundurkan. Tiket ini berada di antrean paling belakang dan dilayani FIFO setelah tiket reguler habis.
4. **`A-004` (Status: `skipped`)** — ID: `f1a10004-0000-4000-8000-000000000004`
   - *Tujuan Test*: **Tes Tombol Reschedule di Mobile!** Tiket ini menghasilkan `can_reschedule: true` pada `GET /api/queue/my`. Klik tombol *Jadwalkan Ulang* di mobile akan menembak `POST /api/queue/[id]/reschedule`.
5. **`B-001` (Status: `completed`)** — ID: `f1a10005-0000-4000-8000-000000000005`
   - *Tujuan Test*: Menguji tab riwayat antrean lampau dan integrasi pengisian rating ulasan di `/admin/ulasan`.
6. **`C-001` (Status: `present`, Walk-in)** — ID: `f1a10006-0000-4000-8000-000000000006`
   - *Tujuan Test*: Tiket walk-in pemohon paspor tanpa akun untuk dipanggil di loket Imigrasi.

---

## 9. Panduan Khusus Checklist Integrasi Rekan Tim

### 📱 Untuk Tim Mobile Dev:
- [x] **Registrasi Akun Warga Baru**: Panggil `POST /api/auth/register` dengan JSON `{ email, password, nik (16 digit), full_name }`. Menerima token session dan profil user.
- [x] **Login Universal**: Panggil `POST /api/auth/login` dengan JSON `{ email, password }` (bisa juga mengirim NIK 16 digit sebagai pengenal). Simpan `session.access_token` ke secure storage mobile.
- [x] **Header Bearer Token**: Setiap request API user (`/api/family-members`, `/api/queue/my`, `/api/auth/me`), sertakan header: `Authorization: Bearer <access_token>`.
- [x] **Pilih Anggota Keluarga**: Panggil `GET /api/family-members` untuk render dropdown/radio anggota keluarga, lalu sertakan `family_member_id` saat `POST /api/queue/book`.
- [x] **3 Tombol Kelengkapan Dokumen**: Tampilkan 3 opsi ("Sudah Tersedia", "Belum Memiliki", "Hilang / Rusak") saat evaluasi prasyarat (`POST /api/services/cross-agency`).
- [x] **Tiket Aktif vs Riwayat**: Panggil `GET /api/queue/my` yang langsung memisahkan `active_tickets` dan `history_tickets`.
- [x] **Tombol Reschedule**: Jika tiket berstatus `skipped` dan memiliki `can_reschedule: true`, tampilkan tombol *"Jadwalkan Ulang"* yang memanggil `POST /api/queue/{id}/reschedule`.

### 💻 Untuk Tim Web & Kiosk Dev:
- [x] **Tombol Mundurkan Antrean (Admin)**: Petugas loket dapat menekan tombol *"Mundurkan"* yang memanggil `POST /api/queue/{id}/postpone`.
- [x] **Display TV Realtime**: Monitor publik di `/display/[agencyId]/antrean` otomatis tersambung ke WebSocket Supabase realtime tanpa polling manual.
- [x] **Check-in Kios**: Gunakan tiket `A-001` untuk uji coba input kode di `/display/input-code`.

