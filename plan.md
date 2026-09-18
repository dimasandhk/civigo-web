# Plan: Penyempurnaan & Eliminasi Inkonsistensi Multi-Cabang Dashboard

## 1. Sinkronisasi Metrik Beranda per Cabang (`/admin`)
- [x] Update `getAdminDashboardStats` di `lib/data/admin.ts` agar menerima `locationId?: number | null` dan memfilter antrean & loket per cabang
- [x] Update `getServiceDonutData` & `getWeeklyQueueData` di `lib/data/admin.ts` agar menerima `locationId?: number | null`
- [x] Update `app/admin/page.tsx` menggunakan `resolveAgencyContext()` dan mengoper `locationId` ke ketiga fungsi tersebut

## 2. Isolasi Loket per Cabang
- [x] Update `getAdminCounters` di `lib/data/admin.ts` agar menerima `locationId?: number | null`
- [x] Update `app/admin/antrean/page.tsx` agar mengoper `context.locationId` ke `getAdminCounters`
- [x] Update `app/admin/loket/page.tsx` agar mengoper `context.locationId` ke `getAdminCounters` dan menampilkan nama cabang di header

## 3. Asosiasi Lokasi pada Pembuatan Loket Baru
- [x] Update `createCounterAction` di `lib/data/counter-actions.ts` agar membaca `profile.location_id` dan menyimpannya saat insert ke tabel `counters`

## 4. Isolasi Pemanggilan Antrean Terdepan (`callNextQueue`)
- [x] Update `callNextQueue` di `lib/queue/status.ts` agar membaca `counterRow.location_id` dan memfilter antrean menunggu (`waiting`) yang lokasinya sama dengan loket tersebut

## 5. Verifikasi & Local Commit (Tanpa Push)
- [x] Jalankan `pnpm run lint`
- [x] Jalankan `pnpm run build`
- [x] Simpan commit lokal (JANGAN PUSH)
