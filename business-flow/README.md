# Civigo — Catatan Business Flow

Folder ini menyimpan catatan perubahan alur bisnis Civigo. Dibuat 13/09/2026
karena folder sebelumnya masih kosong — isi di bawah direkonstruksi dari
riwayat git, migrasi database, dan kode yang ada per tanggal tersebut.

Snapshot struktur database terbaru: [`db-structure_2026-09-13.txt`](./db-structure_2026-09-13.txt)

Kontrak API:
- Booking — [`dev2-task1-contract.md`](./dev2-task1-contract.md)
- Status & reschedule — [`dev2-task3-contract.md`](./dev2-task3-contract.md)

> **Keputusan tetap:** kuota (per time-block maupun di `services`) **tidak akan
> pernah** dibuat. Kapasitas dijaga jam operasional, bukan kuota.

---

## Aktor & peran

Enum `public.user_role` (sejak 08/09/2026):

| Role          | Siapa                    | Aturan di DB                                      |
|---------------|--------------------------|---------------------------------------------------|
| `user`        | Warga / pemohon layanan  | Wajib punya NIK 16 digit, tidak punya `agency_id` |
| `instansi`    | Petugas frontdesk/admin instansi | Wajib punya `agency_id`, NIK opsional     |
| `super_admin` | Pengelola platform       | Tidak punya `agency_id` (scope global)            |

Penamaan ini menggantikan `citizen` / `officer` / `admin` yang dipakai sampai
06/09/2026.

## Alur utama saat ini

### 1. Registrasi warga
1. Form signup mengecek ketersediaan NIK lewat RPC `nik_available(text)`
   (bisa dipanggil `anon`, karena akunnya memang belum ada).
2. `signUp()` di `lib/auth/actions.ts` memanggil Supabase Auth.
3. Trigger `on_auth_user_created` menjalankan `handle_new_user()` yang membuat
   baris `public.users` di transaksi yang sama. Role di-hardcode `'user'` —
   tidak pernah dibaca dari metadata client.
4. Kalau NIK duplikat / tidak valid, seluruh signup rollback. Tidak ada akun
   yatim.

### 2. Booking antrean — `POST /api/queue/book`
Dua jalur masuk, satu endpoint:

- **Warga login** memesan untuk dirinya sendiri. `user_id` diambil dari
  `auth.uid()`, tidak pernah dari body.
- **Kiosk walk-in** tidak punya sesi, jadi pengunjung mengetik NIK. Kalau NIK
  cocok dengan akun warga yang ada, tiketnya ditautkan ke akun itu; kalau tidak,
  `user_id` null dan tiket hanya membawa NIK. **Akun tidak pernah dibuat
  otomatis.**

Validasi berurutan: bentuk body → identitas → layanan & instansi → tanggal
(hari ini s/d +30 hari, harus hari operasional) → format sesi → **aturan jam
operasional** → sesi belum lewat → duplikat → alokasi nomor.

Kuota per time block belum ada tabelnya. Sebagai gantinya kapasitas dijaga
aturan jam operasional: **booking ditolak kalau jam mulai sesi + `estimated_time`
melewati `agencies.close_time`.** Selama masih muat, satu sesi menerima tiket
tanpa batas.

Nomor antrean berbentuk `A-01`: prefix per layanan, urut per (tanggal, layanan),
dijaga unique index `queues_number_per_service_day_idx` dengan retry saat bentrok.

### 3. Siklus hidup antrean
Kelima status dikunci CHECK `queues_status_valid` di database:

```
scheduled ──check-in──> present ──dipanggil──> served ──> completed
    │                      │                     │
    └──────────────────────┴─────────────────────┴──────> skipped
```

`completed` dan `skipped` final. Tiket hangus tidak kembali ke `scheduled` —
warga (atau petugas) menembak endpoint reschedule, yang membuat tiket **baru**
di sesi berikutnya dan meninggalkan tiket hangusnya sebagai catatan.

Endpoint: `PATCH /api/queue/[id]/status`, `POST /api/queue/call-next`,
`POST /api/queue/[id]/reschedule`. Detail di
[`dev2-task3-contract.md`](./dev2-task3-contract.md).

### 4. Dashboard instansi (`/admin`)
Halaman: ringkasan, `antrean`, `layanan`, `loket`, `ulasan`.
Data diambil lewat `lib/data/admin.ts`.

### 5. Display publik (`/display`)
Halaman antrean, input code, dan pemilihan layanan untuk layar/kiosk di lokasi.

---

## Riwayat perubahan alur

### 06/09/2026 — pengamanan identitas & akun
- NIK diwajibkan berformat 16 digit; NIK legacy di-pad.
- `role` dikunci: warga hanya boleh mengubah `full_name` miliknya sendiri
  (column grant, bukan sekadar RLS — RLS itu row-level, jadi tanpa ini warga
  masih bisa menulis ulang `role`-nya sendiri).
- Profil `public.users` kini otomatis tersinkron dengan `auth.users`
  (pembuatan + perubahan email).
- Hapus akun jadi mungkin: cascade ke `family_members`, tapi `queues`
  di-`SET NULL` supaya rekaman layanan tetap ada untuk laporan.

### 08/09/2026 — akun instansi
- Role jadi enum `user` / `instansi` / `super_admin`.
- `users.agency_id` ditambahkan: satu akun instansi terikat ke satu agency.
- `services.info_procedure` ditambahkan (info prosedur layanan untuk warga).

### 12/09/2026 — fitur ulasan (BELUM aktif)
Migrasi `20260912020000_create_reviews_table.sql` ada di repo tapi **belum
diterapkan** ke database remote, dan akan gagal kalau dijalankan apa adanya:
`reviews.queue_id` bertipe `bigint` sementara `queues.id` bertipe `uuid`.

Akibatnya `getAdminReviews()` selalu jatuh ke fallback dummy, jadi halaman
`/admin/ulasan` menampilkan angka karangan (Total Ulasan 500, rata-rata 4.6).

### 13/09/2026 — endpoint booking (Dev 2, Tugas 1)
Migrasi `20260913130836_queue_booking_prerequisites`:
- `agencies.open_time` / `close_time` / `operating_days` — jam operasional
  akhirnya punya tempat di database, sebelumnya cuma string hardcoded di UI.
- `queues.nik` — supaya tiket kiosk walk-in punya identitas.
- Unique index `(schedule_date, service_id, queue_number)`.
- `revoke insert, update, delete on queues from anon, authenticated` — endpoint
  jadi satu-satunya jalur tulis, supaya validasi jam operasional tidak bisa
  dilewati dengan INSERT langsung ke PostgREST.

Endpoint `POST /api/queue/book` beserta `lib/queue/{book,time}.ts` dan
`lib/supabase/service.ts` (client service_role, server-only).

**Temuan saat pengerjaan:** `queues` cuma punya satu policy RLS
(`auth.uid() = user_id`, untuk semua command). Sudah diverifikasi: baik `anon`
maupun akun `instansi` membaca **0 baris** dari `queues`. Artinya
`completeQueue` / `skipQueue` / `callNextQueue` meng-update 0 baris tapi tetap
mengembalikan `{ success: true }` — no-op senyap. Ini juga sebabnya dashboard
admin dan display TV jatuh ke data dummy.

### 13/09/2026 — status & reschedule (Dev 2, Tugas 3)
Migrasi `20260913135318_queue_status_and_reschedule`:
- `queues.status` jadi `NOT NULL` + CHECK lima nilai yang sah.
- `queues.rescheduled_from` + unique index parsial — satu tiket hangus hanya
  boleh melahirkan satu pengganti.

Tiga endpoint baru (`PATCH /api/queue/[id]/status`, `POST /api/queue/call-next`,
`POST /api/queue/[id]/reschedule`) dengan otorisasi sendiri di
`lib/queue/authz.ts`, karena RLS mati di jalur service_role.

**Tombol admin akhirnya berfungsi.** `AntreanManager` sekarang memanggil
endpoint lewat `fetch`, dan `lib/data/queue-actions.ts` yang no-op itu dihapus.
Kegagalan yang dulu diabaikan diam-diam kini muncul sebagai pesan.

Yang masih belum: **pembacaan** `queues` tetap tertutup RLS, jadi daftar antrean
di dashboard dan display TV masih 0 baris. Perlu policy untuk role `instansi`.

### 17/09/2026 — dashboard admin memakai data asli
Tiga penghalang yang membuat Tugas 1 & 3 tidak bisa diuji dari UI dibereskan:

- **`/admin` akhirnya punya penjaga auth.** Sebelumnya `GET /admin` tanpa login
  menjawab `200` — RLS-lah yang tanpa sengaja jadi kontrol aksesnya. Sekarang
  `requireOfficer()` di `app/admin/layout.tsx`, dan itu **satu-satunya** yang
  menahan karena pembacaan sudah lewat service_role.
- **Pembacaan `queues` lewat service client**, jadi petugas tidak lagi melihat
  0 baris. Papan display juga — dan sengaja tidak memakai policy `USING (true)`
  untuk anon, karena itu akan sekalian membuka `queues.nik` ke publik.
- **Seluruh data karangan dibuang** dari `lib/data/admin.ts` dan papan display:
  tiket `sample-1..3`, angka 40/20/95%, loket & layanan palsu, nomor B49–B58.
  Query yang gagal sekarang dilempar; hasil kosong tampil sebagai empty state.
  Yang ikut terbongkar: `user_phone` berisi nomor karangan yang sama untuk
  setiap tiket padahal **tidak ada kolom telepon di skema** (field dihapus), dan
  NIK dibaca dari join `users` sehingga tiket walk-in menampilkan NIK palsu
  padahal aslinya ada di `queues.nik`.
- **`agencyId` dari sesi**, bukan hardcode. Papan display pindah ke
  `/display/[agencyId]/antrean` karena TV tidak punya sesi untuk dibaca.

Terverifikasi: petugas Samsat melihat C-01/C-02 dan **tidak** melihat A-01
milik Disdukcapil; tombol "Panggil Antrean" dan "Selesaikan Layanan" berhasil
`200` dengan UUID asli dari halaman.

---

## Utang teknis yang diketahui

- **Belum ada RLS policy untuk `instansi` / `super_admin`.** Sejak 17/09/2026
  dashboard membaca lewat service_role, jadi halamannya berfungsi — tapi
  artinya **otorisasi sepenuhnya ada di kode**, yaitu `requireOfficer()` di
  `app/admin/layout.tsx`. Tidak ada policy di belakangnya yang menangkap
  kesalahan. Policy untuk role `instansi` tetap layak dibuat sebagai lapis kedua.
- **`counters.status` tanpa constraint.** Masih varchar bebas. `queues.status`
  sudah dikunci sejak 13/09/2026.
- **`avgTimeMinutes` selalu `null`.** Durasi layanan nyata belum bisa dihitung
  karena `queues` tidak punya `called_at` / `served_at` / `completed_at`.
  Sebelumnya di sini ada angka 15 yang hardcoded tanpa syarat.
- **Halaman ulasan masih memakai data karangan.** Satu-satunya fallback dummy
  yang tersisa, karena tabel `reviews` memang belum ada.
- **Realtime belum aktif.** Publication `supabase_realtime` ada tapi tidak ada
  tabel yang didaftarkan, jadi display antrean belum bisa live update.
- **Riwayat migrasi lokal tidak lengkap.** Tiga migrasi 06/09/2026 ada di
  remote tapi filenya tidak ada di `supabase/migrations/`.
