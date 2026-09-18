# DEV 2 — Tugas 2: API Cross-Agency Logic & Dokumen Output

Status: **selesai** (18/09/2026). Dokumen ini melengkapi [`dev2-task1-contract.md`](./dev2-task1-contract.md) dan [`dev2-task3-contract.md`](./dev2-task3-contract.md).

---

## Deskripsi Tugas

> **Tugas 2: API Cross-Agency Logic.**
> Membuat algoritma prasyarat dokumen antar-instansi:
> *"Jika user pilih layanan X dan ada dokumen yang belum terpenuhi, berikan arahan kepada user ke layanan yang harus mereka datangi terlebih dahulu untuk melengkapi dokumennya."*

### Masalah Nyata di MPP / Layanan Terpadu
Warga sering kali datang ke loket instansi tertentu (misalnya Imigrasi untuk membuat Paspor) namun ditolak karena belum membawa atau belum memiliki dokumen kependudukan (KTP / Kartu Keluarga).
Dengan CiviGo Cross-Agency Logic:
1. Setiap layanan memiliki atribut **Dokumen Output** (`output_documents`) yang diterbitkan setelah layanan selesai.
2. Saat warga memilih layanan tujuan di aplikasi Mobile / Kios, sistem mengevaluasi dokumen yang telah dimiliki warga (`owned_documents`) terhadap persyaratan (`requirements`) layanan tujuan.
3. Jika ada dokumen yang kurang, sistem menelusuri katalog layanan seluruh instansi dan mengarahkan warga ke layanan instansi yang memproduksi dokumen tersebut terlebih dahulu (Cross-Agency Guidance & Suggested Flow).

---

## Model Relasi Dokumen Antar-Instansi

| Layanan Tujuan | Instansi | Syarat Dokumen (`requirements`) | Dokumen Output (`output_documents`) | Layanan Prasyarat (Cross-Agency) |
|---|---|---|---|---|
| **Pembuatan Paspor** (ID 4) | Imigrasi | `KTP Asli`, `KK Asli`, `Akta Kelahiran / Ijazah` | `Paspor RI` | 1. **Pembuatan KTP Baru** (Disdukcapil)<br/>2. **Cetak Kartu Keluarga** (Disdukcapil) |
| **Perpanjangan STNK** (ID 3) | Samsat | `STNK Asli`, `KTP Asli`, `BPKB Asli` | `STNK yang Disahkan (SKPD)` | **Pembuatan KTP Baru** (Disdukcapil) |
| **Aktivasi IKD** (ID 5) | Disdukcapil | `KTP-el Fisik`, `Smartphone`, `Email` | `Identitas Kependudukan Digital (IKD)` | **Pembuatan KTP Baru** (Disdukcapil) |
| **Pembuatan KTP Baru** (ID 1) | Disdukcapil | `Fotokopi KK`, `Surat Pengantar RT/RW`, `Usia 17` | `KTP-el Fisik`, `KTP Asli` | **Cetak Kartu Keluarga** (Disdukcapil) + Pihak RT/RW |
| **Cetak KK** (ID 2) | Disdukcapil | `Buku Nikah`, `KTP Suami Istri` | `Kartu Keluarga (KK)`, `KK Asli` | KUA / Catatan Sipil + Disdukcapil |

---

## Kontrak API

### 1. `GET /api/services`
Mengambil katalog seluruh layanan lengkap dengan persyaratan dan dokumen output yang diterbitkan.

#### Query Params (Opsional):
- `agency_id` (integer): Filter layanan berdasarkan ID instansi (misal: `?agency_id=1`).

#### Response `200 OK`:
```json
{
  "ok": true,
  "count": 6,
  "services": [
    {
      "id": 1,
      "agency_id": 1,
      "name": "Pembuatan KTP Baru",
      "requirements": [
        "Fotokopi KK",
        "Surat Pengantar RT/RW",
        "Berusia 17 Tahun"
      ],
      "output_documents": [
        "KTP-el Fisik",
        "KTP Asli"
      ],
      "estimated_time": 15,
      "agency": {
        "id": 1,
        "name": "Disdukcapil",
        "open_time": "08:00",
        "close_time": "16:00",
        "operating_days": [1, 2, 3, 4, 5]
      }
    }
  ]
}
```

---

### 2. `GET & POST /api/services/[id]/prerequisites`
Evaluasi prasyarat dokumen untuk layanan spesifik berdasarkan ID.

#### Request via GET:
```http
GET /api/services/4/prerequisites?owned=KTP%20Asli,KK%20Asli
```

#### Request via POST:
```http
POST /api/services/4/prerequisites
Content-Type: application/json

{
  "owned_documents": ["KTP Asli", "Akta Kelahiran"]
}
```

---

### 3. `POST /api/services/cross-agency`
Endpoint umum evaluasi prasyarat lintas-instansi.

#### Request:
```json
{
  "target_service_id": 4,
  "owned_documents": ["Akta Kelahiran"]
}
```

#### Response `200 OK` (Contoh Prasyarat Belum Lengkap):
```json
{
  "ok": true,
  "evaluation": {
    "target_service": {
      "id": 4,
      "agency_id": 3,
      "name": "Pembuatan Paspor",
      "requirements": [
        "KTP Asli",
        "KK Asli",
        "Akta Kelahiran / Ijazah"
      ],
      "output_documents": [
        "Paspor RI"
      ],
      "estimated_time": 30,
      "agency": {
        "id": 3,
        "name": "Imigrasi"
      }
    },
    "is_ready_to_book": false,
    "summary": "Terdapat 2 prasyarat yang belum terpenuhi. Harap lengkapi dokumen di Disdukcapil terlebih dahulu sebelum mengajukan antrean Pembuatan Paspor di Imigrasi.",
    "total_requirements": 3,
    "fulfilled_count": 1,
    "missing_count": 2,
    "fulfilled_documents": [
      {
        "requirement": "Akta Kelahiran / Ijazah",
        "matched_with": "Akta Kelahiran"
      }
    ],
    "missing_documents": [
      {
        "requirement": "KTP Asli",
        "type": "cross_agency",
        "is_cross_agency": true,
        "recommended_service": {
          "id": 1,
          "name": "Pembuatan KTP Baru",
          "agency_id": 1,
          "agency_name": "Disdukcapil",
          "estimated_time": 15,
          "output_document": "KTP Asli"
        },
        "guidance": "Persyaratan \"KTP Asli\" diterbitkan oleh Disdukcapil melalui layanan \"Pembuatan KTP Baru\". Anda disarankan mendatangi Disdukcapil terlebih dahulu."
      },
      {
        "requirement": "KK Asli",
        "type": "cross_agency",
        "is_cross_agency": true,
        "recommended_service": {
          "id": 2,
          "name": "Cetak Kartu Keluarga (KK)",
          "agency_id": 1,
          "agency_name": "Disdukcapil",
          "estimated_time": 20,
          "output_document": "KK Asli"
        },
        "guidance": "Persyaratan \"KK Asli\" diterbitkan oleh Disdukcapil melalui layanan \"Cetak Kartu Keluarga (KK)\". Anda disarankan mendatangi Disdukcapil terlebih dahulu."
      }
    ],
    "suggested_flow": [
      {
        "step": 1,
        "type": "agency",
        "agency_id": 1,
        "title": "Kunjungi Disdukcapil",
        "description": "Lengkapi dokumen prasyarat sebelum menuju ke Imigrasi.",
        "services": [
          {
            "id": 1,
            "name": "Pembuatan KTP Baru",
            "produces": "KTP Asli"
          },
          {
            "id": 2,
            "name": "Cetak Kartu Keluarga (KK)",
            "produces": "KK Asli"
          }
        ]
      },
      {
        "step": 2,
        "type": "target",
        "agency_id": 3,
        "title": "Kunjungi Imigrasi (Layanan Tujuan)",
        "description": "Setelah melengkapi prasyarat di langkah sebelumnya, Anda siap mengajukan antrean \"Pembuatan Paspor\".",
        "services": [
          {
            "id": 4,
            "name": "Pembuatan Paspor",
            "produces": "Paspor RI"
          }
        ]
      }
    ]
  }
}
```

#### Response `200 OK` (Contoh Semua Prasyarat Terpenuhi):
```json
{
  "ok": true,
  "evaluation": {
    "target_service": { "id": 4, "name": "Pembuatan Paspor", "...": "..." },
    "is_ready_to_book": true,
    "summary": "Seluruh dokumen prasyarat terpenuhi. Anda siap melakukan reservasi antrean untuk Pembuatan Paspor.",
    "total_requirements": 3,
    "fulfilled_count": 3,
    "missing_count": 0,
    "fulfilled_documents": [
      { "requirement": "KTP Asli", "matched_with": "KTP Asli" },
      { "requirement": "KK Asli", "matched_with": "KK Asli" },
      { "requirement": "Akta Kelahiran / Ijazah", "matched_with": "Akta Kelahiran" }
    ],
    "missing_documents": [],
    "suggested_flow": [
      {
        "step": 1,
        "type": "target",
        "agency_id": 3,
        "title": "Kunjungi Imigrasi (Layanan Tujuan)",
        "description": "Seluruh prasyarat terpenuhi. Silakan ambil nomor antrean untuk layanan \"Pembuatan Paspor\".",
        "services": [
          { "id": 4, "name": "Pembuatan Paspor", "produces": "Paspor RI" }
        ]
      }
    ]
  }
}
```

---

## Logika Semantic Matching & Normalisasi

Algoritma mencakup pencocokan cerdas teks dokumen bahasa Indonesia:
1. **Normalisasi Kasus & Simbol**: Huruf kecil, trim, penghapusan simbol non-alfanumerik.
2. **Alternative Requirement Split**: Menangani syarat dengan garis miring seperti `"Akta Kelahiran / Ijazah"` (jika warga memiliki salah satu, syarat dinyatakan terpenuhi).
3. **Semantic Tags**:
   - `ktp`: mencocokkan `KTP`, `KTP Asli`, `KTP-el`, `KTP-el Fisik`, `e-KTP`, `KTP Pemohon`.
   - `kk`: mencocokkan `KK`, `KK Asli`, `Kartu Keluarga`, `Kartu Keluarga (KK)`, `Fotokopi KK`.
   - `stnk`: mencocokkan `STNK`, `STNK Asli`, `STNK yang Disahkan (SKPD)`.
   - `paspor`: mencocokkan `Paspor`, `Paspor RI`.
   - `bpkb`: mencocokkan `BPKB`, `BPKB Asli`.
   - `akta`: mencocokkan `Akta Kelahiran`, `Kutipan Akta`.
   - `nikah`: mencocokkan `Buku Nikah`, `Surat Nikah`, `Akta Perkawinan`.
   - `rt_rw`: mencocokkan `Surat Pengantar RT/RW`, `Surat RT/RW`.

---

## Panduan Pihak Eksternal

Jika suatu dokumen prasyarat tidak diterbitkan oleh layanan CiviGo mana pun (misalnya `Surat Pengantar RT/RW`, `Buku Nikah`, atau `BPKB`), tipe dokumen ditandai sebagai `"external"` dan dilengkapi dengan properti `external_issuer` dan `guidance`:
- **Surat Pengantar RT/RW** -> Pihak: *Pengurus RT & RW Setempat*.
- **Buku Nikah** -> Pihak: *KUA (Kementerian Agama) / Kantor Catatan Sipil*.
- **BPKB Asli** -> Pihak: *Ditlantas POLRI / Lembaga Pembiayaan (Leasing)*.
- **Akta Kelahiran / Ijazah** -> Pihak: *Disdukcapil / Instansi Pendidikan*.

---

## Skema Database & Migrasi SQL

File migrasi: `supabase/migrations/20260918220000_add_output_documents_to_services.sql`

```sql
alter table public.services
  add column if not exists output_documents text[] not null default array[]::text[];
```

### Defensive Fallback di Aplikasi
Untuk menjamin aplikasi web dan API tetap berfungsi stabil meskipun migrasi SQL remote belum sempat dijalankan via GUI Supabase oleh pengguna:
- Jika query database mengembalikan error `42703` (*column services.output_documents does not exist*), backend secara otomatis melakukan fallback aman dan memetakan dokumen output dari `DEFAULT_OUTPUT_DOCUMENTS`.
