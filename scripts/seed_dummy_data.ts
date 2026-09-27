import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createServiceClient } from "../lib/supabase/service";
import { todayInJakarta } from "../lib/queue/time";

async function seed() {
  const db = createServiceClient();
  const today = todayInJakarta();

  console.log("=========================================");
  console.log("🌱 Starting CiviGo Dummy Data Seeding...");
  console.log("📅 Today in Jakarta:", today);
  console.log("=========================================\n");

  // 1. Ambil akun testing warga1@civigo.com
  const { data: wargaUser, error: userError } = await db
    .from("users")
    .select("id, email, full_name, nik")
    .eq("email", "warga1@civigo.com")
    .maybeSingle();

  if (userError || !wargaUser) {
    console.error("❌ Akun warga1@civigo.com tidak ditemukan di tabel users:", userError);
    return;
  }

  const userId = wargaUser.id;
  console.log(`👤 Target User: ${wargaUser.full_name} (${wargaUser.email}) - ID: ${userId}`);

  // 2. Seed Family Members
  console.log("\n👨‍👩‍👧‍👦 1. Seeding Family Members...");
  const familyData = [
    {
      user_id: userId,
      full_name: "Siti Aminah",
      nik: "3578015504850001",
      relationship: "Istri",
    },
    {
      user_id: userId,
      full_name: "Budi Santoso",
      nik: "3578011208080002",
      relationship: "Anak Kandung",
    },
    {
      user_id: userId,
      full_name: "Haji Ahmad Dahlan",
      nik: "3578010101500003",
      relationship: "Orang Tua",
    },
  ];

  // Bersihkan data lama jika ada atau insert fresh
  for (const member of familyData) {
    const { data: existing } = await db
      .from("family_members")
      .select("id")
      .eq("user_id", userId)
      .eq("nik", member.nik)
      .maybeSingle();

    if (!existing) {
      const { data: inserted, error: insErr } = await db
        .from("family_members")
        .insert(member)
        .select()
        .single();
      if (insErr) {
        console.error(`  ❌ Gagal menambahkan ${member.full_name}:`, insErr.message);
      } else {
        console.log(`  ✅ Ditambahkan: ${inserted.full_name} (${inserted.relationship}) - ID: ${inserted.id}`);
      }
    } else {
      console.log(`  ℹ️ Sudah ada: ${member.full_name} (${member.relationship}) - ID: ${existing.id}`);
    }
  }

  // Ambil ID anak untuk relasi antrean keluarga
  const { data: anakMember } = await db
    .from("family_members")
    .select("id")
    .eq("user_id", userId)
    .eq("relationship", "Anak Kandung")
    .single();

  const anakMemberId = anakMember?.id ?? null;

  // 3. Seed Realistic Queues
  console.log("\n🎫 2. Seeding Test Queues...");

  const dummyQueues = [
    // A. Tiket Aktif / Scheduled (Untuk tes Check-in di Kios atau Scan QR)
    {
      id: "f1a10001-0000-4000-8000-000000000001",
      queue_number: "A-001",
      status: "scheduled",
      schedule_date: today,
      time_block: null,
      postponed: false,
      postponed_at: null,
      user_id: userId,
      nik: wargaUser.nik ?? "0000999999999999",
      family_member_id: null,
      service_id: 1, // KTP Baru
      location_id: 1, // MPP
      counter_id: null,
    },
    // B. Tiket Aktif / Present untuk Anggota Keluarga (Untuk tes tiket perwakilan di Mobile)
    {
      id: "f1a10002-0000-4000-8000-000000000002",
      queue_number: "A-002",
      status: "present",
      schedule_date: today,
      time_block: null,
      postponed: false,
      postponed_at: null,
      user_id: userId,
      nik: "3578011208080002",
      family_member_id: anakMemberId,
      service_id: 1, // KTP Baru
      location_id: 1, // MPP
      counter_id: null,
    },
    // C. Tiket Dimundurkan (Postponed) untuk tes prioritas & panggil loket
    {
      id: "f1a10003-0000-4000-8000-000000000003",
      queue_number: "A-003",
      status: "present",
      schedule_date: today,
      time_block: null,
      postponed: true,
      postponed_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      user_id: userId,
      nik: wargaUser.nik ?? "0000999999999999",
      family_member_id: null,
      service_id: 2, // KK
      location_id: 1, // MPP
      counter_id: null,
    },
    // D. Tiket Hangus (Skipped) Hari Ini (UNTUK TES TOMBOL RESCHEDULE DI MOBILE!)
    {
      id: "f1a10004-0000-4000-8000-000000000004",
      queue_number: "A-004",
      status: "skipped",
      schedule_date: today,
      time_block: null,
      postponed: false,
      postponed_at: null,
      user_id: userId,
      nik: wargaUser.nik ?? "0000999999999999",
      family_member_id: null,
      service_id: 1, // KTP Baru
      location_id: 1, // MPP
      counter_id: null,
    },
    // E. Tiket Selesai (Completed) Masa Lalu (Untuk tes riwayat & ulasan)
    {
      id: "f1a10005-0000-4000-8000-000000000005",
      queue_number: "B-001",
      status: "completed",
      schedule_date: "2026-09-20",
      time_block: null,
      postponed: false,
      postponed_at: null,
      user_id: userId,
      nik: wargaUser.nik ?? "0000999999999999",
      family_member_id: null,
      service_id: 3, // Samsat STNK
      location_id: 1, // MPP
      counter_id: 4, // Loket Samsat
    },
    // F. Tiket Walk-in Kios (Kandidat panggilan loket Imigrasi)
    {
      id: "f1a10006-0000-4000-8000-000000000006",
      queue_number: "C-001",
      status: "present",
      schedule_date: today,
      time_block: null,
      postponed: false,
      postponed_at: null,
      user_id: null,
      nik: "3578019909990005",
      family_member_id: null,
      service_id: 4, // Paspor Imigrasi
      location_id: 1, // MPP
      counter_id: null,
    },
  ];

  for (const q of dummyQueues) {
    const { error: upsertErr } = await db
      .from("queues")
      .upsert(q, { onConflict: "id" });

    if (upsertErr) {
      console.error(`  ❌ Gagal upsert antrean ${q.queue_number}:`, upsertErr.message);
    } else {
      console.log(`  ✅ Upserted antrean ${q.queue_number} (${q.status}${q.postponed ? ", postponed" : ""}) - ID: ${q.id}`);
    }
  }

  // 4. Seed Reviews (Untuk tes halaman Ulasan warga & Analytics rating)
  console.log("\n⭐ 3. Seeding Test Reviews...");
  const dummyReviews = [
    {
      user_id: userId,
      agency_id: 1, // Disdukcapil
      service_id: 1,
      counter_id: 1,
      rating: 5,
      comment: "Pelayanan sangat cepat, petugas ramah dan informatif.",
    },
    {
      user_id: userId,
      agency_id: 2, // Samsat
      service_id: 3,
      counter_id: 4,
      queue_id: "f1a10005-0000-4000-8000-000000000005",
      rating: 4,
      comment: "Proses pengesahan STNK lancar di Mall Pelayanan Publik.",
    },
  ];

  for (const r of dummyReviews) {
    const { error: revErr } = await db.from("reviews").insert(r);
    if (revErr) {
      console.log(`  ℹ️ Review info: ${revErr.message}`);
    } else {
      console.log(`  ✅ Review ditambahkan untuk instansi ${r.agency_id} (bintang ${r.rating})`);
    }
  }

  console.log("\n=========================================");
  console.log("🎉 Seeding Selesai! Seluruh data testing siap digunakan.");
  console.log("=========================================\n");
}

seed().catch(console.error);
