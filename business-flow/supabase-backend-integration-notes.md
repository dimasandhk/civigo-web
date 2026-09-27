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

### A. Blok Waktu (`time_block`) Kini Bersifat Opsional
- Ketika warga membuat antrean via Kiosk atau Mobile (`POST /api/queue/book`), kolom `time_block` **tidak wajib diisi** (boleh bernilai `null` atau string kosong).
- Sistem CiviGo menerapkan *Dynamic Pooling*: antrean dipanggil berdasarkan kehadiran warga (`present`), jam kedatangan, dan ketersediaan loket tanpa membatasi sesi jam kaku.

### B. Display Antrean Real-Time (`/display/[agencyId]/antrean`)
- Layar TV Display menggunakan komponen `QueueDisplayLive.tsx` yang berlangganan langsung ke WebSocket Supabase (`postgres_changes` pada tabel `queues`).
- Begitu petugas di loket menekan tombol *Panggil Berikutnya* atau *Selesaikan*, layar display publik langsung memperbarui antrean secara instan tanpa perlu polling manual.

### C. Kompatibilitas Data Dokumen Layanan
- Endpoint `GET /api/services` dan `GET /api/services/[id]` mengembalikan data teks dokumen (`requirements: string[]` dan `output_documents: string[]`) sekaligus referensi ID (`requirement_doc_ids` & `output_doc_ids`).
- Aplikasi mobile temanmu tidak akan mengalami error (*backward compatible 100%*).

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

## 6. Daftar Endpoint REST API CiviGo

### A. Autentikasi & Akun
- `POST /api/auth/forgot-password`: Menerima `{ email, redirectTo? }` untuk mengirim link/token reset password ke email warga via Supabase Auth.
- `POST /api/auth/reset-password`: Menerima `{ password }` untuk memperbarui kata sandi pengguna dalam sesi pemulihan.

### B. Master Dokumen & Katalog Layanan
- `GET /api/documents`: Mengambil daftar master dokumen (`service_documents`), mendukung query param `?agency_id=...`.
- `GET /api/services`: Mengambil seluruh katalog layanan instansi beserta persyaratan dan jam kerja.
- `GET /api/services/{id}`: Mengambil detail layanan spesifik berdasarkan ID.
- `GET /api/services/{id}/prerequisites`: Evaluasi kelayakan booking layanan berdasarkan dokumen yang sudah dimiliki pemohon (`?owned_documents=...`).
- `POST /api/services/cross-agency`: Menyusun rencana layanan multi-instansi cross-agency.

### C. Antrean (Queues)
- `POST /api/queue/book`: Mengambil nomor antrean baru (menerima `{ service_id, schedule_date, nik, time_block?, location_id? }`).
- `GET /api/queue/{id}/status`: Memeriksa status tiket terkini.
- `PATCH /api/queue/{id}/status`: Mengubah status tiket (`present`, `served`, `completed`, `skipped`).
- `POST /api/queue/{id}/reschedule`: Menjadwalkan ulang tiket yang hangus (`skipped`).
- `POST /api/queue/check-in`: Check-in tiket saat warga tiba di lokasi fisik kios.
- `POST /api/queue/call-next`: Panggilan tiket berikutnya oleh petugas loket (`{ counter_id }`).

### D. Ulasan Warga (Reviews) & Analitik
- `GET /api/reviews`: Mengambil daftar ulasan dan feedback warga per instansi.
- `POST /api/reviews`: Mengirimkan rating bintang 1-5 dan testimoni warga.
- `GET /api/analytics`: Mengambil analitik komprehensif (`?agency_id=...&location_id=...&date=...`):
  - Ringkasan kepuasan ulasan (rata-rata bintang, total ulasan, persentase kepuasan, breakdown bintang 1-5).
  - Metrik antrean operasional (total tiket hari ini, menunggu, dipanggil, dilayani, selesai, dilewati/hangus, dimundurkan/postponed, rasio kehadiran, jumlah loket aktif).
  - Distribusi popularitas layanan publik.

### E. AI Chatbot
- `POST /api/chatbot`: Asisten virtual berbasis OpenAI embedding dan vector search `match_documents` pada Supabase untuk menjawab pertanyaan prosedur MPP dan persyaratan dokumen warga.
