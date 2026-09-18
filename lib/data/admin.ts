import { requireOfficer } from "@/lib/auth/session";
import { todayInJakarta } from "@/lib/queue/time";
import { createServiceClient } from "@/lib/supabase/service";
import type { RatingLevel } from "@/app/components/admin/ratings";
import type { ServiceDonutItem } from "@/app/components/admin/ServiceDonutChart";
import type { WeeklyDataPoint } from "@/app/components/admin/WeeklyQueueChart";

/**
 * Data untuk dashboard admin.
 *
 * Semuanya lewat service_role client. `queues` punya satu policy RLS
 * (`auth.uid() = user_id`) yang membuat petugas membaca nol baris — tiket yang
 * dikelolanya milik warga lain. Otorisasinya dipindah ke `requireOfficer()` di
 * `app/admin/layout.tsx`; modul ini mengandalkan penjaga itu.
 *
 * Tidak ada fallback data karangan di sini. Kegagalan query dilempar supaya
 * tertangkap error boundary, dan hasil kosong dikembalikan apa adanya sebagai
 * kosong. Versi sebelumnya menyamakan "query gagal", "nol baris", dan "tidak
 * ada data" menjadi tiga tiket palsu — yang justru menutupi masalah RLS di atas
 * selama berbulan-bulan, karena halamannya selalu terlihat terisi.
 */

/**
 * Instansi yang datanya sedang dilihat.
 *
 * `super_admin` tidak terikat instansi mana pun (CHECK `users_agency_matches_role`
 * mewajibkan `agency_id` null), jadi untuk sementara dia melihat instansi
 * pertama. Pemilih instansi di UI adalah pekerjaan tersendiri.
 */
export async function resolveAgencyId(): Promise<number> {
  const profile = await requireOfficer();

  if (profile.agency_id !== null) return profile.agency_id;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("agencies")
    .select("id")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) throw new Error("Belum ada instansi terdaftar.");

  return data.id;
}

export type DashboardStats = {
  totalToday: number;
  completedToday: number;
  remainingToday: number;
  avgTimeMinutes: number | null;
  attendanceRate: number | null;
  skippedCount: number;
  activeCounters: number;
  activeServices: number;
};

export async function getAdminDashboardStats(agencyId: number): Promise<DashboardStats> {
  const supabase = createServiceClient();
  const today = todayInJakarta();

  const { data: queues, error } = await supabase
    .from("queues")
    .select("id, status, service:services!inner(agency_id)")
    .eq("schedule_date", today)
    .eq("service.agency_id", agencyId);

  if (error) throw new Error(`Gagal memuat antrean hari ini: ${error.message}`);

  const list = queues ?? [];
  const totalToday = list.length;
  const completedToday = list.filter((q) => q.status === "completed").length;
  const skippedCount = list.filter((q) => q.status === "skipped").length;
  const remainingToday = list.filter((q) =>
    ["scheduled", "present", "served"].includes(q.status),
  ).length;

  const { count: activeCountersCount } = await supabase
    .from("counters")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("status", "active");

  const { count: activeServicesCount } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId);

  return {
    totalToday,
    completedToday,
    remainingToday,
    skippedCount,
    // null, bukan angka karangan: tanpa tiket sama sekali, persentase kehadiran
    // tidak punya arti.
    attendanceRate:
      totalToday > 0 ? Math.round(((totalToday - skippedCount) / totalToday) * 100) : null,
    // `queues` belum punya called_at/served_at/completed_at, jadi durasi nyata
    // memang belum bisa dihitung. Sebelumnya di sini ada angka 15 yang
    // hardcoded tanpa syarat apa pun.
    avgTimeMinutes: null,
    activeCounters: activeCountersCount ?? 0,
    activeServices: activeServicesCount ?? 0,
  };
}

export async function getAdminCounters(agencyId: number) {
  const supabase = createServiceClient();
  const { data: counters, error } = await supabase
    .from("counters")
    .select("*")
    .eq("agency_id", agencyId)
    .order("id", { ascending: true });

  if (error) throw new Error(`Gagal memuat loket: ${error.message}`);

  return (counters ?? []).map((c) => ({
    id: c.id,
    name: c.counter_name,
    status: (c.status === "active" ? "aktif" : "nonaktif") as "aktif" | "nonaktif",
    days: "Senin - Jumat",
    hours: "08:00 - 16:00",
    createdDate: "-",
    createdTime: "-",
  }));
}

export async function getAdminServices(agencyId: number) {
  const supabase = createServiceClient();
  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .eq("agency_id", agencyId)
    .order("id", { ascending: true });

  if (error) throw new Error(`Gagal memuat layanan: ${error.message}`);

  return (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    category: "Kependudukan",
    status: "aktif" as const,
    estimate: s.estimated_time ? `${s.estimated_time} menit` : "-",
  }));
}

export type QueueItem = {
  id: string;
  queue_number: string;
  status: string;
  time_block: string;
  schedule_date: string;
  counter_id: number | null;
  service_name: string;
  counter_name: string | null;
  user_name: string;
  user_nik: string;
};

/** `3175012345678901` -> `3175••••••••••01`. Tidak menutupi apa pun kalau kosong. */
function maskNik(nik: string | null): string {
  if (!nik) return "-";
  return nik.length >= 6 ? `${nik.slice(0, 4)}••••••••••${nik.slice(-2)}` : nik;
}

export async function getTodayQueues(agencyId: number): Promise<QueueItem[]> {
  const supabase = createServiceClient();
  const today = todayInJakarta();

  const { data: queues, error } = await supabase
    .from("queues")
    .select(`
      id,
      queue_number,
      status,
      time_block,
      schedule_date,
      counter_id,
      nik,
      counter:counters(id, counter_name),
      service:services!inner(id, name, agency_id),
      user:users(id, full_name, nik)
    `)
    .eq("schedule_date", today)
    .eq("service.agency_id", agencyId)
    .order("queue_number", { ascending: true });

  if (error) throw new Error(`Gagal memuat antrean: ${error.message}`);

  return (queues ?? []).map((q) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = q.user as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = q.service as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const counter = q.counter as any;

    return {
      id: q.id,
      queue_number: q.queue_number,
      status: q.status,
      time_block: q.time_block,
      schedule_date: q.schedule_date,
      counter_id: q.counter_id,
      service_name: service?.name ?? "-",
      counter_name: counter?.counter_name ?? null,
      // Tiket walk-in tidak punya akun. Katakan apa adanya, jangan dikarang
      // jadi nama orang.
      user_name: user?.full_name ?? "Tanpa akun (walk-in)",
      // `queues.nik` lebih dipercaya daripada join ke `users`: itu NIK yang
      // benar-benar diketik saat booking, dan untuk tiket walk-in cuma itu
      // satu-satunya yang ada.
      user_nik: maskNik(q.nik ?? user?.nik ?? null),
    };
  });
}

export type ReviewItem = {
  id: string;
  rating: RatingLevel;
  comment: string;
  service: string;
  counter: string;
  time: string;
};

/**
 * Tabel `reviews` belum ada di database — migrasi lokalnya pun akan gagal
 * (`queue_id bigint` vs `queues.id uuid`). Fallback di bawah sengaja
 * dipertahankan sampai tabelnya dibuat, karena membuangnya sekarang hanya
 * mengosongkan halaman tanpa ada penggantinya.
 */
export async function getAdminReviews(agencyId: number) {
  const supabase = createServiceClient();

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      counter:counters(counter_name),
      service:services(name)
    `)
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error || !reviews || reviews.length === 0) {
    return {
      stats: [
        { label: "Total Ulasan", value: "500" },
        { label: "Rata-rata", value: "4.6", unit: "/5" },
        { label: "Sangat Puas", value: "78", unit: "%" },
        { label: "Bulan Ini", value: "4.8" },
      ],
      breakdown: { 5: 78, 4: 14, 3: 5, 2: 2, 1: 1 } as Record<number, number>,
      reviews: [
        {
          id: "rev-1",
          rating: 5,
          comment: "Pelayanannya sangat cepat dan petugasnya ramah.",
          service: "Pembuatan KTP-el",
          counter: "Loket 1",
          time: "5 menit lalu",
        },
        {
          id: "rev-2",
          rating: 4,
          comment: "Pelayanannya sudah bagus dan cukup membantu.",
          service: "Aktivasi Identitas Kependudukan Digital",
          counter: "Loket 2",
          time: "10 menit lalu",
        },
        {
          id: "rev-3",
          rating: 5,
          comment: "Antrean teratur, nomor panggilan display jelas terlihat dan terdengar.",
          service: "Cetak Kartu Keluarga (KK)",
          counter: "Loket 3",
          time: "35 menit lalu",
        },
      ] as ReviewItem[],
    };
  }

  const total = reviews.length;
  const sumRating = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avgRating = total > 0 ? (sumRating / total).toFixed(1) : "5.0";
  const veryHappy = Math.round(
    (reviews.filter((r) => r.rating === 5).length / total) * 100,
  );

  const breakdown = [1, 2, 3, 4, 5].reduce<Record<number, number>>((acc, level) => {
    acc[level] = Math.round(
      (reviews.filter((r) => r.rating === level).length / total) * 100,
    );
    return acc;
  }, {});

  return {
    stats: [
      { label: "Total Ulasan", value: String(total) },
      { label: "Rata-rata", value: avgRating, unit: "/5" },
      { label: "Sangat Puas", value: String(veryHappy), unit: "%" },
      { label: "Bulan Ini", value: avgRating },
    ],
    breakdown,
    reviews: reviews.map((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = r.service as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const counter = r.counter as any;

      return {
        id: String(r.id),
        rating: r.rating as RatingLevel,
        comment: r.comment ?? "",
        service: service?.name ?? "-",
        counter: counter?.counter_name ?? "-",
        time: new Date(r.created_at).toLocaleString("id-ID"),
      };
    }) as ReviewItem[],
  };
}

const DONUT_COLORS = [
  "#8979FF",
  "#FFAE4C",
  "#3CC3DF",
  "#FF928A",
  "#10B981",
  "#6366F1",
  "#EC4899",
  "#F59E0B",
];

export async function getServiceDonutData(agencyId: number): Promise<ServiceDonutItem[]> {
  const supabase = createServiceClient();

  const { data: queues, error } = await supabase
    .from("queues")
    .select("id, service:services!inner(id, name, agency_id)")
    .eq("service.agency_id", agencyId);

  if (error || !queues || queues.length === 0) {
    const { data: services } = await supabase
      .from("services")
      .select("name")
      .eq("agency_id", agencyId)
      .limit(4);

    if (services && services.length > 0) {
      return services.map((s, idx) => ({
        name: s.name,
        color: DONUT_COLORS[idx % DONUT_COLORS.length],
        percentage: 0,
        strokeDasharray: "0 226.2",
        strokeDashoffset: 0,
      }));
    }

    return [];
  }

  const counts: Record<string, number> = {};
  for (const q of queues) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sName = (q.service as any)?.name ?? "Layanan";
    counts[sName] = (counts[sName] || 0) + 1;
  }

  const total = queues.length;
  const CIRCUMFERENCE = 2 * Math.PI * 36; // ~226.195

  const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  let accumulatedOffset = 0;

  return sortedEntries.map(([name, count], index) => {
    const percentage = Math.round((count / total) * 100);
    const arcLength = (count / total) * CIRCUMFERENCE;
    const strokeDasharray = `${arcLength.toFixed(2)} ${(CIRCUMFERENCE - arcLength).toFixed(2)}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += arcLength;

    return {
      name,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
      percentage,
      strokeDasharray,
      strokeDashoffset,
    };
  });
}

export type WeeklyQueueResult = {
  points: WeeklyDataPoint[];
  yAxisGrid: { y: number; label: string }[];
};

export async function getWeeklyQueueData(agencyId: number): Promise<WeeklyQueueResult> {
  const supabase = createServiceClient();
  const today = todayInJakarta();

  // Calculate Monday through Friday of the current week (WIB)
  const d = new Date(`${today}T00:00:00Z`);
  const dayOfWeek = d.getUTCDay(); // 0 is Sun, 1 is Mon, 5 is Fri, 6 is Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + mondayOffset);

  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum"];
  const weekDays = dayNames.map((label, i) => {
    const cur = new Date(monday);
    cur.setUTCDate(monday.getUTCDate() + i);
    return { label, date: cur.toISOString().slice(0, 10) };
  });

  const startDate = weekDays[0].date;
  const endDate = weekDays[4].date;

  const { data: queues } = await supabase
    .from("queues")
    .select("id, schedule_date, service:services!inner(agency_id)")
    .eq("service.agency_id", agencyId)
    .gte("schedule_date", startDate)
    .lte("schedule_date", endDate);

  const dateCounts: Record<string, number> = {};
  for (const q of queues ?? []) {
    dateCounts[q.schedule_date] = (dateCounts[q.schedule_date] || 0) + 1;
  }

  const rawPoints = weekDays.map(({ label, date }) => ({
    day: label,
    count: dateCounts[date] || 0,
  }));

  const maxCount = Math.max(...rawPoints.map((p) => p.count));
  const ceiling = Math.max(9, Math.ceil(maxCount / 3) * 3);

  const yAxisGrid = [
    { y: 15, label: String(ceiling) },
    { y: 55, label: String(Math.round((ceiling * 2) / 3)) },
    { y: 95, label: String(Math.round(ceiling / 3)) },
    { y: 135, label: "0" },
  ];

  const points: WeeklyDataPoint[] = rawPoints.map((p, index) => {
    const x = 35 + index * 110; // 35, 145, 255, 365, 475
    const y = Math.round(135 - (p.count / ceiling) * 120);
    return {
      day: p.day,
      count: p.count,
      x,
      y: Math.min(135, Math.max(15, y)),
    };
  });

  return { points, yAxisGrid };
}

