// @ts-expect-error @next/env has no bundled d.ts in this project config
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createServiceClient } from "../lib/supabase/service";

/**
 * Akun petugas `instansi` + loket untuk cabang non-MPP.
 *
 * `bookQueue` mengizinkan booking di setiap pasangan `agency_locations`, tetapi
 * dulu hanya cabang MPP Siola (lokasi 5) yang punya akun petugas — tiket di
 * kantor induk tidak bisa dipanggil siapa pun.
 *
 * Email sengaja tanpa titik: login dengan username memakai teks sebelum titik
 * pertama (`disdukcapil.kantor` -> `disdukcapil@civigo.com`, akun MPP), jadi
 * username di sini adalah bagian sebelum `@` apa adanya.
 *
 * Idempoten: akun yang sudah ada hanya dirapikan profilnya (password tidak diubah),
 * dan loket hanya ditambah kalau namanya belum ada di cabang itu.
 *
 *   pnpm seed:accounts
 */

const PASSWORD = process.env.SEED_ACCOUNT_PASSWORD ?? "Password123!";

const ACCOUNTS = [
  {
    email: "disdukcapilkantor@civigo.com",
    full_name: "Petugas Kantor Dispendukcapil Kota Surabaya",
    agency_id: 1,
    location_id: 6,
    counters: ["Loket Dispendukcapil 1", "Loket Dispendukcapil 2"],
  },
  {
    email: "samsattimur@civigo.com",
    full_name: "Petugas Kantor Bersama Samsat Surabaya Timur",
    agency_id: 2,
    location_id: 7,
    counters: ["Loket Samsat 1", "Loket Samsat 2"],
  },
  {
    email: "polrestabescolombo@civigo.com",
    full_name: "Petugas Satpas SIM Colombo Polrestabes Surabaya",
    agency_id: 4,
    location_id: 8,
    counters: ["Loket SIM 1", "Loket SIM 2"],
  },
  {
    email: "imigrasikantor@civigo.com",
    full_name: "Petugas Kantor Imigrasi Kelas I Khusus TPI Surabaya",
    agency_id: 3,
    location_id: 9,
    counters: ["Loket Imigrasi 1", "Loket Imigrasi 2"],
  },
  {
    email: "bpjskantor@civigo.com",
    full_name: "Petugas Kantor BPJS Kesehatan Cabang Surabaya",
    agency_id: 5,
    location_id: 10,
    counters: ["Loket BPJS 1", "Loket BPJS 2"],
  },
];

async function seed() {
  const db = createServiceClient();

  for (const account of ACCOUNTS) {
    const { data: existing, error: lookupError } = await db
      .from("users")
      .select("id")
      .eq("email", account.email)
      .maybeSingle();

    if (lookupError) throw lookupError;

    let userId = existing?.id;

    if (!userId) {
      // handle_new_user() wajib menerima NIK 16 digit dan membuat profil `user`.
      // NIK ini hanya untuk lolos trigger; di bawah dikosongkan seperti akun
      // instansi lainnya.
      const { data, error } = await db.auth.admin.createUser({
        email: account.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          nik: `35780100000001${String(account.location_id).padStart(2, "0")}`,
          full_name: account.full_name,
        },
      });

      if (error || !data.user) throw error ?? new Error(`Gagal membuat ${account.email}`);
      userId = data.user.id;
      console.log(`✅ Dibuat: ${account.email}`);
    } else {
      console.log(`↺ Sudah ada: ${account.email}`);
    }

    const { error: profileError } = await db
      .from("users")
      .update({
        role: "instansi",
        agency_id: account.agency_id,
        location_id: account.location_id,
        full_name: account.full_name,
        nik: null,
      })
      .eq("id", userId);

    if (profileError) throw profileError;

    // Tanpa loket aktif dasbor cabang hanya menampilkan "Belum Ada Loket Aktif".
    // Loket yang sudah ada (dicocokkan per nama di cabang ini) tidak disentuh,
    // termasuk statusnya kalau petugas menonaktifkannya.
    const { data: existingCounters, error: countersError } = await db
      .from("counters")
      .select("counter_name")
      .eq("agency_id", account.agency_id)
      .eq("location_id", account.location_id);

    if (countersError) throw countersError;

    const taken = new Set((existingCounters ?? []).map((c) => c.counter_name));
    const missing = account.counters.filter((name) => !taken.has(name));

    if (missing.length > 0) {
      const { error: insertError } = await db.from("counters").insert(
        missing.map((counter_name) => ({
          counter_name,
          agency_id: account.agency_id,
          location_id: account.location_id,
          status: "active",
        })),
      );

      if (insertError) throw insertError;
      console.log(`   + Loket: ${missing.join(", ")}`);
    }
  }
}

seed().catch((error) => {
  console.error("❌ Seeding gagal:", error);
  process.exit(1);
});
