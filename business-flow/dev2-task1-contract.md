# DEV 2 — Tugas 1: API Booking Antrean

Status: **selesai** (13/09/2026). Dokumen ini menggantikan brief asli Tugas 1,
disesuaikan dengan apa yang benar-benar dibangun.

---

## Deskripsi tugas (versi revisi)

> **Tugas 1: API Booking Antrean.** Membuat endpoint `POST /api/queue/book`.
>
> Logikanya: kenali dulu siapa pemohonnya — warga yang sudah login memesan untuk
> dirinya sendiri, sedangkan pengunjung kiosk mengetik NIK. Lalu cek apakah sesi
> yang diminta **masih muat di jam operasional instansi**, yaitu jam mulai sesi
> ditambah estimasi layanan tidak melewati jam tutup. Jika muat, terbitkan tiket
> dengan nomor urut per (tanggal, layanan) yang dijamin unik terhadap booking
> bersamaan.

### Yang berubah dari brief asli, dan kenapa

Brief asli berbunyi *"Mengecek apakah Time-block masih ada kuota? Jika ya, buat
tiket nomor urut, kurangi sisa kuota."*

| Brief asli | Yang dikerjakan | Alasan |
|---|---|---|
| Cek sisa kuota time-block | Cek jam mulai + estimasi vs jam tutup | Kuota tidak akan pernah dibuat |
| Buat tiket nomor urut | Sama — `A-01`, `A-02`, ... per (tanggal, layanan) | — |
| Kurangi sisa kuota | Tidak ada | Tidak ada kuota untuk dikurangi |

> **Keputusan tetap (13/09/2026): kuota TIDAK akan pernah diimplementasikan.**
> Tidak di time-block, tidak di tabel `services`. Aturan jam operasional adalah
> penggantinya yang permanen, bukan solusi sementara. Jangan usulkan kolom
> `quota`/`capacity` atau endpoint sisa-slot; kalau kapasitas perlu dibatasi,
> jalurnya lewat jam operasional atau jumlah loket aktif.

**Konsekuensi yang harus disadari:** satu sesi menerima tiket **tanpa batas**
selama layanannya masih selesai sebelum jam tutup. Yang dijaga endpoint ini
adalah kewarasan jadwal, bukan kapasitas loket.

---

## Kontrak API

### `POST /api/queue/book`

Autentikasi **opsional** — cookie sesi Supabase menentukan mode:

| Mode | Kondisi | `user_id` tiket |
|---|---|---|
| Warga login | ada sesi, role `user` | id akun tersebut |
| Kiosk walk-in | tidak ada sesi | id akun yang NIK-nya cocok, atau `null` |
| Ditolak | ada sesi, role `instansi` / `super_admin` | — (403) |

### Request

```http
POST /api/queue/book
Content-Type: application/json
```

```json
{
  "service_id": 1,
  "schedule_date": "2026-09-15",
  "time_block": "09:00 - 10:00",
  "nik": "3175012345678901"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `service_id` | integer ≥ 1 | ya | Instansi diturunkan dari layanan, tidak dikirim client |
| `schedule_date` | `YYYY-MM-DD` | ya | Tanggal asli — `2026-02-30` ditolak |
| `time_block` | `"HH:MM - HH:MM"` | ya | Format persis, dengan spasi mengapit tanda hubung |
| `nik` | 16 digit | kiosk saja | **Diabaikan kalau sudah login** — NIK diambil dari profil, jadi tidak bisa dipakai memesan atas nama akun lain |

### Response `201 Created`

```json
{
  "ok": true,
  "ticket": {
    "id": "e66966c3-9f2f-44b6-b4e6-d4c6f3863a4f",
    "queue_number": "A-05",
    "schedule_date": "2026-09-15",
    "time_block": "09:00 - 10:00",
    "status": "scheduled",
    "estimated_finish": "09:15",
    "nik": "3175012345678901",
    "service": { "id": 1, "name": "Pembuatan KTP Baru", "estimated_time": 15 },
    "agency": { "id": 1, "name": "Disdukcapil" },
    "linked_account": true
  }
}
```

`linked_account` memberi tahu kiosk apakah tiketnya nyantol ke sebuah akun
(`true`) atau berdiri sendiri dengan NIK saja (`false`).

### Response gagal

```json
{ "ok": false, "error": { "code": "SERVICE_EXCEEDS_CLOSING", "message": "..." } }
```

| HTTP | `code` | Kapan |
|---|---|---|
| 400 | `INVALID_BODY` | Body bukan JSON, atau field tidak sesuai tipe/format |
| 400 | `NIK_REQUIRED` | Kiosk tanpa NIK, atau NIK bukan 16 digit |
| 400 | `INVALID_TIME_BLOCK` | Format sesi salah, atau jam akhir ≤ jam mulai |
| 403 | `ROLE_NOT_ALLOWED` | Akun `instansi` / `super_admin` mencoba memesan |
| 404 | `SERVICE_NOT_FOUND` | `service_id` tidak ada, atau instansinya tidak ada |
| 409 | `DUPLICATE_BOOKING` | Sudah punya tiket aktif untuk layanan + tanggal yang sama |
| 422 | `SERVICE_HAS_NO_AGENCY` | Layanan tidak terhubung instansi, jam operasional tidak diketahui |
| 422 | `DATE_IN_PAST` | Tanggal sudah lewat (acuan: hari ini di Asia/Jakarta) |
| 422 | `DATE_TOO_FAR` | Lebih dari 30 hari ke depan |
| 422 | `AGENCY_CLOSED` | Hari itu tidak ada di `agencies.operating_days` |
| 422 | `OUTSIDE_OPERATING_HOURS` | Jam mulai sesi di luar jam buka–tutup |
| 422 | `SERVICE_EXCEEDS_CLOSING` | **Aturan inti** — mulai + estimasi melewati jam tutup |
| 422 | `TIME_BLOCK_PASSED` | Sesi hari ini yang jam mulainya sudah terlewat |
| 500 | `INTERNAL_ERROR` | Kegagalan database, atau `SUPABASE_SECRET_KEY` belum diisi |
| 503 | `NUMBER_ALLOCATION_FAILED` | 5 percobaan alokasi nomor kalah balapan berturut-turut |

Method selain `POST` dijawab `405` otomatis oleh Next.js.

---

## Urutan validasi

Berhenti di kegagalan pertama:

1. **Bentuk body** → `INVALID_BODY`
2. **Identitas** — login? role `user`? kalau kiosk, NIK valid? cari akun by NIK
3. **Layanan & instansi** → `SERVICE_NOT_FOUND` / `SERVICE_HAS_NO_AGENCY`
4. **Tanggal** — tidak lewat, ≤ 30 hari, hari operasional
5. **Format sesi** → `INVALID_TIME_BLOCK`
6. **Sesi di dalam jam buka–tutup** → `OUTSIDE_OPERATING_HOURS`
7. **Aturan inti** — `mulai + estimated_time > close_time` → `SERVICE_EXCEEDS_CLOSING`
8. **Sesi belum lewat** (kalau tanggalnya hari ini) → `TIME_BLOCK_PASSED`
9. **Duplikat** (kalau pemohon punya akun) → `DUPLICATE_BOOKING`
10. **Alokasi nomor + insert**, retry maksimal 5×

### Aturan inti, contoh konkret

Jam operasional Disdukcapil 08:00–16:00:

| Layanan | Estimasi | Sesi | Selesai | Hasil |
|---|---|---|---|---|
| Pembuatan Paspor | 30 mnt | 15:45 | 16:15 | **ditolak** — lewat 16:00 |
| Pembuatan KTP Baru | 15 mnt | 15:30 | 15:45 | diterima |
| Pembuatan Paspor | 30 mnt | 15:30 | 16:00 | diterima — pas di batas |

`estimated_time` yang `NULL` dianggap 15 menit, mengikuti fallback yang sudah
dipakai `lib/data/admin.ts`.

---

## Penomoran tiket

Format `A-01`: prefix huruf per layanan (layanan 1 → `A`, 2 → `B`, ...), nomor
urut per **(tanggal, layanan)**, dimulai dari 1 tiap hari.

Alokasinya baca-lalu-tulis, jadi rawan balapan. Penjaganya di database:
`unique index queues_number_per_service_day_idx (schedule_date, service_id,
queue_number)`. Kalau ada yang mendahului, insert kena `23505`, endpoint
menghitung ulang dan mencoba lagi (maksimal 5×).

Nomor terbesar dihitung numerik, bukan lewat `ORDER BY` teks — urutan teks
menaruh `A-99` di atas `A-100`.

---

## Kenapa pakai service_role

`queues` cuma punya satu policy RLS: `auth.uid() = user_id`, untuk semua
command. Sudah diverifikasi: `anon` maupun akun `instansi` membaca **0 baris**.
Endpoint ini butuh tiga hal yang semuanya ditolak policy tersebut:

1. membaca tiket orang lain, untuk tahu nomor berikutnya;
2. mencari akun berdasarkan NIK (`users` hanya membuka baris sendiri);
3. menyisipkan tiket ber-`user_id` milik orang lain atau `null`.

Karena itu penulisan lewat `lib/supabase/service.ts` (server-only), dan grant
tulis langsung dicabut dari `anon`/`authenticated` supaya endpoint ini jadi
satu-satunya jalur masuk — validasi jam operasional tidak bisa dilewati dengan
INSERT langsung ke PostgREST.

---

## File

| File | Isi |
|---|---|
| `app/api/queue/book/route.ts` | Handler HTTP, tipis — parse, panggil, petakan status |
| `lib/queue/book.ts` | Logika booking; dipisah agar endpoint Tugas 3 bisa pakai ulang |
| `lib/queue/time.ts` | Zona Asia/Jakarta, parsing sesi, aritmetika tanggal |
| `lib/supabase/service.ts` | Client service_role, server-only |
| `lib/supabase/env.ts` | + `supabaseSecretKey()` |
| `supabase/migrations/20260913130836_queue_booking_prerequisites.sql` | Migrasi |

### Perubahan skema

- `agencies` + `open_time`, `close_time`, `operating_days` (default 08:00–16:00,
  Senin–Jumat — menyamai nilai yang sebelumnya hardcoded di UI admin)
- `queues` + `nik` (varchar 16, CHECK 16 digit atau NULL)
- unique index `(schedule_date, service_id, queue_number)`
- `revoke insert, update, delete on queues from anon, authenticated`

### Konfigurasi

`SUPABASE_SECRET_KEY` di `.env.local` (Project Settings → API Keys → secret
key). **Belum diisi** — tanpa itu endpoint menjawab `500 INTERNAL_ERROR`.

---

## Batasan yang diketahui

- **Tanpa kuota**, satu sesi tidak terbatas. Ini permanen, bukan sementara —
  lihat keputusan di atas.
- **`time_block` masih teks bebas.** Endpoint memvalidasi formatnya dan jam
  mulainya, tapi **jam akhirnya tidak diperiksa sama sekali** — `"15:00 - 23:00"`
  lolos untuk layanan 15 menit, karena yang dinilai cuma jam mulai. Begitu juga
  sesi mengada-ada seperti `"09:17 - 09:43"`. Tidak ada daftar sesi kanonik, dan
  tidak ada endpoint untuk client menemukan sesi yang sah. Ini yang perlu
  dibereskan lebih dulu sebelum kuota bisa ditempelkan.
- **Prefix nomor** mentok di layanan ke-26, dan lintas instansi hurufnya bisa
  terlihat aneh (Samsat `C`, Imigrasi `D`). Kosmetik — unique index-nya per
  layanan.
- **NIK orang lain di kiosk** bisa dipakai membuat tiket yang tertaut ke akun
  orang itu, dan berpotensi memicu `409` bagi pemilik akun sebenarnya.
