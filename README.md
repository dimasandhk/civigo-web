# CiviGo Web & Backend

Platform pelayanan publik dan antrean dinamis multi-instansi (Mall Pelayanan Publik) dengan fitur evaluasi prasyarat dokumen lintas-instansi (*cross-agency*), asisten AI Chatbot RAG, display monitor antrean realtime, dan analitik kepuasan masyarakat.

---

## 🚀 Panduan Memulai Cepat

```bash
# 1. Install dependencies
pnpm install

# 2. Jalankan development server
pnpm dev

# 3. Jalankan automated test suite
pnpm test

# 4. Seed data dummy testing (opsional)
pnpm run seed
```

Buka aplikasi di [http://localhost:3000](http://localhost:3000).

---

## 📖 Dokumentasi Lengkap untuk Tim

1. **Scalar Interactive API Documentation**:  
   Buka di browser saat server menyala: [http://localhost:3000/docs](http://localhost:3000/docs)  
   *(Lengkap dengan interaktif Test Request / Try it out)*
2. **OpenAPI 3.1 Spec JSON**:  
   [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json) *(Dapat di-import ke Postman / Insomnia)*
3. **Catatan Handover Arsitektur & Database Supabase**:  
   Baca di [`business-flow/supabase-backend-integration-notes.md`](./business-flow/supabase-backend-integration-notes.md)

---

## 📱 Panduan Integrasi Cepat

### Tim Mobile:
- **Pilih Anggota Keluarga**: Panggil `GET /api/family-members` dan kirimkan `family_member_id` saat `POST /api/queue/book`.
- **3 Tombol Status Dokumen**: Kirim status `sudah_tersedia`, `belum_memiliki`, atau `hilang_rusak` ke `POST /api/services/cross-agency`.
- **Tiket Aktif vs Riwayat**: Panggil `GET /api/queue/my` (otomatis terpisah menjadi `active_tickets` dan `history_tickets`).
- **Tombol Reschedule**: Tiket berstatus `skipped` hari ini memiliki flag `can_reschedule: true` untuk memicu pemanggilan `POST /api/queue/{id}/reschedule`.

### Tim Web & Kiosk:
- **Display TV Realtime**: Monitor publik di `/display/[agencyId]/antrean` otomatis tersambung ke WebSocket Supabase Realtime.
- **Mundurkan Antrean**: Petugas loket dapat menekan tombol *"Mundurkan"* yang memanggil `POST /api/queue/{id}/postpone`.
- **Check-in Kios**: Gunakan tiket testing `A-001` di `/display/input-code`.
