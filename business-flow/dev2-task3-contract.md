# DEV 2 — Tugas 3: API Status & Auto-Reschedule

Status: **selesai** (13/09/2026). Dokumen ini menggantikan brief asli Tugas 3,
disesuaikan dengan apa yang benar-benar dibangun.

Lihat juga: [`dev2-task1-contract.md`](./dev2-task1-contract.md)

---

## Deskripsi tugas (versi revisi)

> **Tugas 3: API Status & Auto-Reschedule.** Tiga endpoint:
>
> 1. `PATCH /api/queue/[id]/status` — petugas mengubah status tiket mengikuti
>    transisi yang diizinkan.
> 2. `POST /api/queue/call-next` — petugas memanggil antrean terdepan ke sebuah
>    loket (jalan pintas untuk transisi menunggu → `served`).
> 3. `POST /api/queue/[id]/reschedule` — tiket hangus digeser ke sesi berikutnya
>    pada hari yang sama.

### Penyesuaian dari brief asli

| Brief asli | Yang dikerjakan | Alasan |
|---|---|---|
| Status `Waiting` | `scheduled` + `present` | Database sudah memakai dua status ini: `scheduled` = sudah booking belum datang, `present` = sudah check-in. Tidak ada `Waiting`. |
| `Waiting → Served → Completed / Skipped` | Sama, plus `scheduled → present` | Check-in perlu status tersendiri, kalau tidak `present` tidak akan pernah terpakai. |
| "digeser ke bawah" | Sesi berikutnya di hari yang sama | Tiket lama tetap hangus; yang dibuat tiket baru yang menunjuk ke sana. |

---

## Model status

```
scheduled ──check-in──> present ──dipanggil──> served ──> completed
    │                      │                     │
    └──────────────────────┴─────────────────────┴──────> skipped
```

| Dari | Boleh ke |
|---|---|
| `scheduled` | `present`, `served`, `skipped` |
| `present` | `served`, `skipped` |
| `served` | `completed`, `skipped` |
| `completed` | — (final) |
| `skipped` | — (final; pakai endpoint reschedule) |

Dijaga di dua tempat: tabel transisi di `lib/queue/status.ts`, dan CHECK
`queues_status_valid` di database yang mengunci kelima nilainya.

---

## 1. `PATCH /api/queue/[id]/status`

Untuk tombol petugas di dashboard admin. Hanya akun `instansi` pemilik instansi
tiket tersebut, atau `super_admin`.

### Request

```json
{ "status": "served", "counter_id": 1 }
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `status` | salah satu dari 5 status | ya | Status tujuan |
| `counter_id` | integer | hanya saat `served` | Loket harus aktif dan milik instansi yang sama. Kalau tiket sudah punya loket, boleh dikosongkan. |

### Response `200 OK`

```json
{
  "ok": true,
  "ticket": {
    "id": "340bace3-30bb-47b9-9275-dcdac6f868d9",
    "queue_number": "A-01",
    "status": "served",
    "schedule_date": "2026-09-14",
    "time_block": "08:00 - 09:00",
    "counter_id": 1,
    "counter_name": "Loket 1 (Perekaman)",
    "service": { "id": 1, "name": "Pembuatan KTP Baru" },
    "agency": { "id": 1, "name": "Disdukcapil" }
  }
}
```

### Error

| HTTP | `code` | Kapan |
|---|---|---|
| 400 | `INVALID_TICKET_ID` | Segmen `[id]` bukan UUID |
| 400 | `INVALID_BODY` | Body bukan objek, atau `counter_id` bukan integer |
| 400 | `INVALID_STATUS` | Status di luar kelima nilai yang sah |
| 400 | `COUNTER_REQUIRED` | Pindah ke `served` tanpa loket |
| 401 | `UNAUTHENTICATED` | Belum login |
| 403 | `OFFICER_ONLY` | Login sebagai warga |
| 403 | `WRONG_AGENCY` | Tiket atau loket milik instansi lain |
| 404 | `TICKET_NOT_FOUND` / `COUNTER_NOT_FOUND` / `AGENCY_NOT_FOUND` | Tidak ada |
| 409 | `ALREADY_IN_STATUS` | Sudah berstatus itu |
| 409 | `INVALID_TRANSITION` | Transisi tidak diizinkan; pesannya menyebut tujuan yang sah |
| 409 | `CONCURRENT_UPDATE` | Petugas lain mengubahnya lebih dulu |
| 422 | `COUNTER_INACTIVE` | Loket berstatus `inactive` |
| 422 | `TICKET_HAS_NO_SERVICE` / `SERVICE_HAS_NO_AGENCY` | Data tiket tidak lengkap |
| 500 | `INTERNAL_ERROR` | Kegagalan database, atau `SUPABASE_SECRET_KEY` kosong |

### Penjagaan balapan

`UPDATE`-nya menyertakan `.eq("status", statusYangDibaca)`. Kalau petugas lain
sudah memindahkan tiket di antara pembacaan dan penulisan, tidak ada baris yang
cocok dan jawabannya `409 CONCURRENT_UPDATE` — bukan menimpa perubahan mereka.

---

## 2. `POST /api/queue/call-next`

### Request

```json
{ "counter_id": 1 }
```

Instansi tidak dikirim client — diambil dari loketnya, lalu dicocokkan dengan
instansi si petugas.

### Response `200 OK`

```json
{
  "ok": true,
  "ticket": { "...": "sama seperti response PATCH status" },
  "remaining": 3
}
```

`remaining` = sisa antrean menunggu untuk instansi itu hari ini, setelah yang
ini dipanggil.

### Urutan pemanggilan

1. `present` didahulukan atas `scheduled` — yang sudah berdiri di ruangan
   dilayani sebelum yang belum datang;
2. sesi paling awal;
3. nomor antrean terkecil.

Diurutkan di aplikasi, bukan di SQL, karena prioritas status bukan urutan
alfabet (`present` < `scheduled` secara kebetulan saja) dan datanya kecil.

Selain error di atas: `404 NO_WAITING_QUEUE` kalau tidak ada yang menunggu.
Endpoint ini meneruskan ke logika `PATCH .../status`, jadi seluruh penjagaan
transisi dan balapan berlaku sama.

---

## 3. `POST /api/queue/[id]/reschedule`

Tanpa body. Sesi tujuan dihitung server.

### Siapa yang boleh

| Pemanggil | Boleh menggeser |
|---|---|
| Warga login | tiketnya sendiri (`user_id` = dirinya) |
| Petugas `instansi` | tiket mana pun di instansinya — **satu-satunya jalur bagi tiket walk-in**, yang tidak punya akun untuk login |
| `super_admin` | semua |

### Cara sesi tujuan dipilih

1. Susun grid sesi per jam dari jam operasional instansi — 08:00–16:00 menjadi
   `08:00 - 09:00` … `15:00 - 16:00`.
2. Ambil sesi pertama yang mulainya **setelah** sesi tiket lama **dan** setelah
   jam sekarang (WIB).
3. Lewati terus selama `mulai + estimated_time > close_time`.
4. Tidak ada yang tersisa → `422 NO_SESSION_LEFT`.

Tiket lama **tidak disentuh** — tetap `skipped`. Yang dibuat tiket baru
berstatus `scheduled`, nomor baru di belakang antrean hari itu, dengan
`rescheduled_from` menunjuk ke tiket lama.

### Response `201 Created`

```json
{
  "ok": true,
  "ticket": {
    "id": "9c1f...",
    "queue_number": "A-07",
    "schedule_date": "2026-09-14",
    "time_block": "10:00 - 11:00",
    "status": "scheduled",
    "estimated_finish": "10:15",
    "service": { "id": 1, "name": "Pembuatan KTP Baru" },
    "agency": { "id": 1, "name": "Disdukcapil" },
    "rescheduled_from": {
      "id": "17591da8-...",
      "queue_number": "A-03",
      "time_block": "09:00 - 10:00"
    }
  }
}
```

### Error khusus

| HTTP | `code` | Kapan |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Belum login (walk-in harus lewat petugas) |
| 403 | `NOT_TICKET_OWNER` | Warga menggeser tiket orang lain |
| 403 | `WRONG_AGENCY` | Petugas instansi lain |
| 409 | `NOT_SKIPPED` | Tiket belum hangus |
| 409 | `ALREADY_RESCHEDULED` | Tiket ini sudah pernah digeser |
| 422 | `NOT_TODAY` | Tiket bukan untuk hari ini — arahkan booking ulang |
| 422 | `NO_SESSION_LEFT` | Tidak ada sesi tersisa yang muat sebelum tutup |
| 503 | `NUMBER_ALLOCATION_FAILED` | 5 percobaan alokasi nomor kalah balapan |

Dobel klik aman: unique index parsial `queues_rescheduled_from_unique`
memastikan satu tiket hangus hanya melahirkan satu pengganti.

---

## Otorisasi

`queues` masih hanya punya satu policy RLS (`auth.uid() = user_id`), yang
menyembunyikan tiket warga lain dari petugas. Ketiga endpoint karena itu
berjalan di service_role — **RLS mati sepenuhnya**, dan pengecekan di
`lib/queue/authz.ts` adalah satu-satunya penjaga. Tidak ada lapisan di
belakangnya yang akan menangkap kesalahan.

Pemeriksaan peran dilakukan **sebelum** menyentuh database, supaya pemanggil
yang tidak berhak tidak bisa membedakan tiket yang ada dari yang tidak ada lewat
selisih 403 dan 404.

---

## File

| File | Isi |
|---|---|
| `app/api/queue/[id]/status/route.ts` | Handler PATCH |
| `app/api/queue/[id]/reschedule/route.ts` | Handler POST |
| `app/api/queue/call-next/route.ts` | Handler POST |
| `lib/queue/status.ts` | Tabel transisi, validasi loket, urutan panggilan |
| `lib/queue/reschedule.ts` | Pemilihan sesi tujuan, pembuatan tiket pengganti |
| `lib/queue/authz.ts` | `resolveCaller()`, `loadTicketContext()`, cek instansi |
| `lib/queue/shared.ts` | Status, `Failure`, validasi UUID |
| `lib/queue/number.ts` | Alokasi nomor + insert, **dipakai bersama booking** |
| `lib/queue/http.ts` | Amplop response, dipakai keempat endpoint |
| `lib/queue/time.ts` | + `sessionGrid()`, `nextSessionAfter()`, `formatTimeBlock()` |

### Yang ikut berubah

- `lib/queue/book.ts` — loop alokasi nomornya dipindah ke `lib/queue/number.ts`
  supaya booking dan reschedule memakai satu implementasi. Perilaku sama.
- `app/components/admin/AntreanManager.tsx` — tiga tombolnya sekarang memanggil
  endpoint lewat `fetch`, bukan Server Action. Pesan error dari server
  ditampilkan; sebelumnya kegagalan diabaikan diam-diam.
- **`lib/data/queue-actions.ts` dihapus.** Isinya tiga Server Action yang tidak
  pernah benar-benar bekerja (RLS membuatnya meng-update 0 baris lalu tetap
  melapor `{ success: true }`), dan setelah rewiring tidak ada lagi yang
  memakainya. Riwayatnya tetap ada di git.

### Perubahan skema — `20260913135318_queue_status_and_reschedule`

- `queues.status` → `NOT NULL` + CHECK lima nilai
- `queues.rescheduled_from` uuid → `queues(id)` `ON DELETE SET NULL`
- unique index parsial `queues_rescheduled_from_unique`

---

## Batasan yang diketahui

- **Reschedule hanya untuk hari yang sama.** Tiket hangus dari hari sebelumnya
  ditolak dengan `NOT_TODAY`; warga harus booking ulang.
- **Grid sesi hanya dipakai reschedule.** Booking masih menerima `time_block`
  teks bebas, jadi tiket bisa saja punya sesi yang tidak ada di grid. Reschedule
  tetap jalan untuk kasus itu — dicarikan sesi grid pertama setelah jam mulainya
  — tapi kedua endpoint belum sepakat soal apa itu "sesi".
- **Estimasi boleh melewati panjang sesi.** Layanan 90 menit di sesi 09:00–10:00
  diterima selama selesainya masih sebelum jam tutup, konsisten dengan aturan
  booking. Tanpa kuota, sesi memang bukan batas kapasitas.
- **Tidak ada kolom waktu** (`called_at`, `served_at`, `completed_at`), jadi
  durasi layanan sebenarnya masih belum bisa dihitung — dashboard admin tetap
  memakai `avgTimeMinutes: 15` yang hardcoded.
- **Belum ada UI reschedule.** Endpoint-nya siap, tapi aplikasi warga belum ada,
  dan dashboard admin belum diberi tombolnya.
- **Pembacaan `queues` masih tertutup RLS.** Endpoint menulis dengan benar, tapi
  `lib/data/admin.ts` dan `app/display/antrean` masih membaca lewat cookie
  client dan tetap mendapat 0 baris. Perlu policy RLS untuk `instansi`.
