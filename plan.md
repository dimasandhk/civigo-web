# Plan: Penyempurnaan Backend & Database Supabase CiviGo

## 1. Migrasi Database `family_member_id` pada Tabel `queues`
- [x] Buat file migrasi SQL `supabase/migrations/20260927204800_add_family_member_to_queues.sql`
- [x] Push migrasi ke remote Supabase via Supabase CLI (`npx supabase db push`)
- [x] Sinkronisasi tipe data TypeScript (`pnpm run db:types`)

## 2. Fitur "Mundurkan Antrean" (Postpone Queue)
- [x] Tambahkan logika `postponeQueue` di `lib/queue/status.ts`
- [x] Perbarui pengurutan `callNextQueue` agar antrean `postponed = true` ditaruh di paling akhir antrean menunggu
- [x] Buat endpoint API `POST /api/queue/[id]/postpone/route.ts`

## 3. Modul Anggota Keluarga (Family Members API)
- [x] Buat API Route `app/api/family-members/route.ts` (`GET` dan `POST`)
- [x] Buat API Route `app/api/family-members/[id]/route.ts` (`DELETE`)
- [x] Perbarui `POST /api/queue/book` agar menerima dan menyimpan `family_member_id`

## 4. Master Data Instansi & Lokasi Cabang (`/api/agencies`)
- [x] Buat API Route `app/api/agencies/route.ts` (`GET` daftar instansi + relasi lokasi cabang)
- [x] Buat API Route `app/api/agencies/[id]/route.ts` (`GET` detail instansi)

## 5. Riwayat Tiket Warga (`/api/queue/my`)
- [x] Buat API Route `app/api/queue/my/route.ts` (tiket aktif hari ini & riwayat tiket lampau)

## 6. Dukungan 3 State Dokumen (Tersedia, Belum Memiliki, Hilang/Rusak)
- [x] Perbarui `lib/queue/cross-agency.ts` dan `/api/services/cross-agency` untuk mendukung status `hilang_rusak` dengan panduan khusus

## 7. Pembaruan Scalar Docs, OpenAPI Spec & Handover Notes
- [x] Tambahkan endpoint-endpoint baru ke `app/api/openapi.json/route.ts`
- [x] Perbarui `business-flow/supabase-backend-integration-notes.md`

## 8. Verifikasi & Local Commit
- [x] Jalankan `pnpm run lint` & `pnpm run build`
- [x] Simpan commit lokal (JANGAN PUSH KE REMOTE)

## 9. REST Auth Endpoints untuk Mobile App (`/api/auth`)
- [x] Buat endpoint `POST /api/auth/register` (validasi NIK 16 digit, nama, email, password, cek duplikasi)
- [x] Buat endpoint `POST /api/auth/login` (login fleksibel via Email, NIK 16 digit, atau username instansi; return JWT tokens)
- [x] Buat endpoint `GET /api/auth/me` (inspeksi token Bearer/cookie dan ambil profil)
- [x] Tambahkan dukungan `Authorization: Bearer <token>` pada `/api/family-members`, `/api/queue/my`, dan `/api/auth/reset-password`
- [x] Tambahkan unit test Vitest lengkap di `tests/api/auth.test.ts` (100% mock, 0 kuota email/API terpakai)
- [x] Perbarui OpenAPI 3.1 Spec di `/api/openapi.json` & dokumentasi tim di `supabase-backend-integration-notes.md`

