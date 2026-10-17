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

## 10. Fitur Batalkan Booking Antrean (Queue Booking Cancellation)
- [x] 10.1 Buat migration SQL `supabase/migrations/20261014150000_add_canceled_status_to_queues.sql` untuk update constraint `queues_status_valid` dan kolom `canceled_at`, `cancel_reason`
- [x] 10.2 Push migrasi ke database Supabase dan generate TypeScript types jika perlu
- [x] 10.3 Perbarui shared queue constants & types (`lib/queue/shared.ts`, `lib/queue/status.ts`)
- [x] 10.4 Buat endpoint `POST /api/queue/[id]/cancel` dengan verifikasi kepemilikan, atomic conditional update, dan guard status
- [x] 10.5 Perbarui `app/api/queue/my/route.ts` dan kiosk check-in `lib/queue/check-in.ts` untuk menangani status `canceled`
- [x] 10.6 Buat automated unit & route tests di `tests/api/cancel-queue.test.ts`
- [x] 10.7 Implementasi frontend mobile (`useCancelQueue`, tombol batal, modal konfirmasi, badge riwayat) di `civigo`
- [x] 10.8 Testing end-to-end, linting, dan typechecking di mobile dan web

## 11. Mode Offline & Caching Tiket QR di Mobile
- [x] 11.1 Simpan data tiket aktif terakhir ke `AsyncStorage` (`civigo_active_ticket_cache`) saat `useMyQueues` sukses
- [x] 11.2 Tambahkan fallback offline di `useMyQueues` dan `src/app/(tabs)/queue.tsx` saat koneksi internet terputus
- [x] 11.3 Tampilkan status visual "Mode Offline (Data Tersimpan)" agar warga tetap bisa menunjukkan QR code dan 6-digit kode di depan kiosk tanpa sinyal

## 12. Audio Chime & Panggilan Suara (TTS) di Layar TV Display Kiosk
- [x] 12.1 Buat synthesizer audio Web Audio API untuk nada lonceng panggilan (chime ding-dong) tanpa file eksternal
- [x] 12.2 Integrasikan Web Speech API (`window.speechSynthesis`) Bahasa Indonesia di `QueueDisplayLive.tsx` saat ada panggilan nomor baru
- [x] 12.3 Tambahkan toggle tombol audio (Mute/Aktifkan Suara) dengan penanganan izin browser autoplay

## 13. Cetak Slip Fisik / Thermal Receipt Print di Kiosk Web
- [x] 13.1 Tambahkan tombol "Cetak Slip Tiket" di `CheckInForm.tsx` dan konfirmasi walk-in kiosk
- [x] 13.2 Tambahkan CSS print styling `@media print` untuk format struk thermal standar 58mm/80mm

## 14. Konfigurasi Standalone Build APK (`eas.json` & Android Package)
- [x] 14.1 Buat konfigurasi `eas.json` dengan profile `preview` (build APK) dan `production`
- [x] 14.2 Perbarui `app.json` dengan Android package name `com.civigo.app` dan permissions

## 15. Rate Limiting & Pengamanan Endpoint Publik Web
- [x] 15.1 Buat utility rate limiter in-memory sliding window di `lib/rate-limit.ts`
- [x] 15.2 Pasang rate limiter pada `/api/chatbot`, `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`
- [x] 15.3 Tulis automated unit tests di `tests/unit/rate-limit.test.ts` dan pastikan 216+ tes lulus

## 16. Push Notification Foundation & Service Call
- [x] 16.1 Siapkan helper push notification Expo di backend (`lib/notifications/expo.ts`)
- [x] 16.2 Panggil notifikasi saat loket memanggil nomor antrean (`callNextQueue`)
- [x] 16.3 Simpan Expo Push Token saat user login di mobile dan kirim ke `/api/auth/profile`

## 17. Verifikasi Menyeluruh & Testing
- [x] 17.1 Jalankan seluruh suite test Vitest di web (target: 100% pass) -> 29/29 files, 228/228 tests passing
- [x] 17.2 Jalankan TypeScript checking di mobile (`npx tsc --noEmit`) (target: 0 errors) -> 0 errors
- [x] 17.3 Commit dan push ke git repository `civigo-web` dan `civigo`


