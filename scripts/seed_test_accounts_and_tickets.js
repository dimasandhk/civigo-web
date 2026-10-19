const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('C:/Users/Aryasatya Alaauddin/projects/civigo/civigo-web/.env'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SECRET_KEY);

function getTodayJakarta() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

async function run() {
  console.log("=== SEEDING TEST ACCOUNTS & TICKETS FOR CIVIGO EVALUATION ===");

  // 1. Ensure warga2@civigo.com exists
  const { data: userList } = await supabase.auth.admin.listUsers();
  let warga2Auth = userList.users.find(u => u.email === 'warga2@civigo.com');

  if (!warga2Auth) {
    console.log("Creating auth user warga2@civigo.com...");
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: 'warga2@civigo.com',
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Warga Sekunder',
        nik: '3578012402920002',
      },
    });
    if (error) {
      console.error("Failed to create warga2 auth:", error);
      process.exit(1);
    }
    warga2Auth = created.user;
    console.log("warga2 auth created:", warga2Auth.id);
  } else {
    console.log("warga2 auth already exists:", warga2Auth.id);
    // ensure password is Password123!
    await supabase.auth.admin.updateUserById(warga2Auth.id, {
      password: 'Password123!',
      email_confirm: true,
    });
  }

  // Ensure public.users entry for warga2
  const { error: upsertUserErr } = await supabase
    .from('users')
    .upsert({
      id: warga2Auth.id,
      email: 'warga2@civigo.com',
      full_name: 'Warga Sekunder',
      nik: '3578012402920002',
      role: 'user',
    });
  if (upsertUserErr) console.error("Error upserting warga2 to public.users:", upsertUserErr);
  else console.log("public.users warga2 updated successfully.");

  // 2. Setup demo tickets for warga1
  const warga1Id = '842f8f38-e83a-48c9-b4f8-96d0789f5832';
  const today = getTodayJakarta();
  console.log("Setting tickets for date (Jakarta):", today);

  // A-001 (scheduled for today, for testing Kiosk check-in)
  // A-002 (present for today, ready to call at officer portal)
  // A-004 (skipped, for testing rescheduling in Riwayat)

  const demoTickets = [
    {
      id: 'f1a10001-0000-4000-8000-000000000001',
      user_id: warga1Id,
      service_id: 1, // Layanan KK
      location_id: 1, // MPP Siola
      queue_number: 'A-001',
      schedule_date: today,
      status: 'scheduled',
      nik: '0000999999999999',
      checked_in_at: null,
      postponed: false,
    },
    {
      id: 'f1a10002-0000-4000-8000-000000000002',
      user_id: warga1Id,
      service_id: 1, // Layanan KK
      location_id: 1, // MPP Siola
      queue_number: 'A-002',
      schedule_date: today,
      status: 'present',
      nik: '0000999999999999',
      checked_in_at: new Date().toISOString(),
      postponed: false,
    },
    {
      id: 'f1a10004-0000-4000-8000-000000000004',
      user_id: warga1Id,
      service_id: 1, // Layanan KK
      location_id: 1, // MPP Siola
      queue_number: 'A-004',
      schedule_date: '2026-10-18', // Yesterday
      status: 'skipped',
      nik: '0000999999999999',
      checked_in_at: null,
      postponed: false,
    },
  ];

  for (const t of demoTickets) {
    const { error: ticketErr } = await supabase
      .from('queues')
      .upsert(t, { onConflict: 'id' });
    if (ticketErr) console.error("Error upserting ticket", t.queue_number, ticketErr);
    else console.log(`Ticket ${t.queue_number} (${t.status}, date: ${t.schedule_date}) set successfully.`);
  }

  console.log("=== FINISHED SEEDING SUCCESSFULLY ===");
}

run();
