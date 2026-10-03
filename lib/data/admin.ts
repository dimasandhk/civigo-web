import { requireOfficer } from "@/lib/auth/session";
import { startOfMonthInJakarta, todayInJakarta } from "@/lib/queue/time";
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

export type AgencyContext = {
  agencyId: number;
  agencyName: string;
  locationId: number | null;
  locationName: string | null;
};

export async function resolveAgencyContext(): Promise<AgencyContext> {
  const profile = await requireOfficer();
  const agencyId = profile.agency_id ?? (await resolveAgencyId());
  const supabase = createServiceClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .maybeSingle();

  let locationName: string | null = null;
  if (profile.location_id) {
    const { data: loc } = await supabase
      .from("locations")
      .select("name")
      .eq("id", profile.location_id)
      .maybeSingle();
    locationName = loc?.name ?? null;
  }

  return {
    agencyId,
    agencyName: agency?.name ?? "Instansi",
    locationId: profile.location_id,
    locationName: locationName ?? (profile.location_id ? `Cabang #${profile.location_id}` : null),
  };
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

type QueueStatusRow = { id: string; status: string };

export async function getAdminDashboardStats(
  agencyId: number,
  locationId?: number | null,
): Promise<DashboardStats> {
  const supabase = createServiceClient();
  const today = todayInJakarta();

  let queueQuery = supabase
    .from("queues")
    .select("id, status, service:services!inner(agency_id)")
    .eq("schedule_date", today)
    .eq("service.agency_id", agencyId);

  if (locationId) {
    queueQuery = queueQuery.eq("location_id", locationId);
  }

  const { data: queues, error } = await queueQuery;

  let list: QueueStatusRow[] = (queues as unknown as QueueStatusRow[]) ?? [];
  if (error) {
    const fallback = await supabase
      .from("queues")
      .select("id, status, service:services!inner(agency_id)")
      .eq("schedule_date", today)
      .eq("service.agency_id", agencyId);
    list = (fallback.data as unknown as QueueStatusRow[]) ?? [];
  }

  const totalToday = list.length;
  const completedToday = list.filter((q) => q.status === "completed").length;
  const skippedCount = list.filter((q) => q.status === "skipped").length;
  const remainingToday = list.filter((q) =>
    ["scheduled", "present", "served"].includes(q.status),
  ).length;

  let countersQuery = supabase
    .from("counters")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("status", "active");

  if (locationId) {
    countersQuery = countersQuery.eq("location_id", locationId);
  }

  const { count: activeCountersCount } = await countersQuery;

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

export async function getAdminCounters(
  agencyId: number,
  locationId?: number | null,
) {
  const supabase = createServiceClient();
  let query = supabase
    .from("counters")
    .select("*")
    .eq("agency_id", agencyId)
    .order("id", { ascending: true });

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data: counters, error } = await query;

  let list = counters;
  if (error) {
    const fallback = await supabase
      .from("counters")
      .select("*")
      .eq("agency_id", agencyId)
      .order("id", { ascending: true });
    if (fallback.error) throw new Error(`Gagal memuat loket: ${fallback.error.message}`);
    list = fallback.data;
  }

  return (list ?? []).map((c) => ({
    id: c.id,
    name: c.counter_name,
    status: (c.status === "active" ? "aktif" : "nonaktif") as "aktif" | "nonaktif",
    createdDate: "-",
    createdTime: "-",
  }));
}

export type AdminServiceItem = {
  id: number;
  name: string;
  estimated_time: number | null;
  estimate: string;
  info_procedure: string | null;
  requirements: string[];
  requirement_doc_ids: number[];
  output_documents: string[];
  output_doc_ids: number[];
};

/** Nama dokumen di `requirements` (jsonb). Baris lama bisa berisi string tunggal. */
function toNameList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return [raw];
  return [];
}

/**
 * Katalog layanan milik instansi, apa adanya dari database.
 *
 * Sengaja tanpa fallback `DEFAULT_OUTPUT_DOCUMENTS`: halaman ini tempat petugas
 * mengubah dokumen output, jadi yang tampil harus persis yang tersimpan.
 * `services` tidak punya kolom status, jadi tidak ada lagi badge "Aktif"
 * yang di-hardcode untuk setiap layanan.
 */
export async function getAdminServices(agencyId: number): Promise<AdminServiceItem[]> {
  const supabase = createServiceClient();
  const { data: services, error } = await supabase
    .from("services")
    .select(
      "id, name, estimated_time, info_procedure, requirements, requirement_doc_ids, output_documents, output_doc_ids",
    )
    .eq("agency_id", agencyId)
    .order("id", { ascending: true });

  if (error) throw new Error(`Gagal memuat layanan: ${error.message}`);

  return (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    estimated_time: s.estimated_time,
    estimate: s.estimated_time ? `${s.estimated_time} menit` : "-",
    info_procedure: s.info_procedure,
    requirements: toNameList(s.requirements),
    requirement_doc_ids: s.requirement_doc_ids ?? [],
    output_documents: (s.output_documents ?? []).map(String),
    output_doc_ids: s.output_doc_ids ?? [],
  }));
}

/**
 * `dokumen` = berkas yang dibawa warga, `kondisi` = syarat non-berkas
 * (mis. "Berusia 17 Tahun"). Dibaca mobile lewat `/api/services/[id]/prerequisites`.
 */
export type ServiceDocumentType = "dokumen" | "kondisi";

export type ServiceDocumentItem = {
  id: number;
  name: string;
  description: string | null;
  agency_id: number | null;
  type: ServiceDocumentType;
};

/** Kolom `type` bertipe text di DB (dibatasi CHECK), jadi dipersempit di sini. */
export function toServiceDocumentItem(
  doc: Omit<ServiceDocumentItem, "type"> & { type: string },
): ServiceDocumentItem {
  return { ...doc, type: doc.type === "kondisi" ? "kondisi" : "dokumen" };
}

/**
 * Master dokumen (`service_documents`) untuk pemilih dokumen di form layanan.
 *
 * Seluruh katalog dikembalikan, bukan hanya milik instansi ini: dokumen seperti
 * "KTP Asli" (milik Disdukcapil) memang dipakai sebagai syarat layanan Samsat
 * dan Imigrasi. Dokumen milik instansi sendiri diurutkan lebih dulu.
 */
export async function getServiceDocuments(agencyId: number): Promise<ServiceDocumentItem[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("service_documents")
    .select("id, name, description, agency_id, type")
    .order("name", { ascending: true });

  if (error) throw new Error(`Gagal memuat katalog dokumen: ${error.message}`);

  return (data ?? []).map(toServiceDocumentItem).sort(
    (a, b) => Number(b.agency_id === agencyId) - Number(a.agency_id === agencyId),
  );
}

export type QueueItem = {
  id: string;
  queue_number: string;
  status: string;
  time_block: string;
  schedule_date: string;
  counter_id: number | null;
  location_id?: number | null;
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

type RawQueueRow = {
  id: string;
  queue_number: string;
  status: string;
  time_block: string;
  schedule_date: string;
  counter_id: number | null;
  location_id?: number | null;
  nik: string | null;
  counter?: { id: number; counter_name: string } | null;
  service?: { id: number; name: string; agency_id: number } | null;
  user?: { id: string; full_name: string; nik: string | null } | null;
};

export async function getTodayQueues(
  agencyId: number,
  locationId?: number | null
): Promise<QueueItem[]> {
  const supabase = createServiceClient();
  const today = todayInJakarta();

  let query = supabase
    .from("queues")
    .select(`
      id,
      queue_number,
      status,
      time_block,
      schedule_date,
      counter_id,
      location_id,
      nik,
      counter:counters(id, counter_name),
      service:services!inner(id, name, agency_id),
      user:users(id, full_name, nik)
    `)
    .eq("schedule_date", today)
    .eq("service.agency_id", agencyId)
    .order("queue_number", { ascending: true });

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data: queues, error } = await query;

  let list: RawQueueRow[] = (queues as unknown as RawQueueRow[]) ?? [];

  if (error) {
    // Fallback jika kolom location_id belum dieksekusi di database remote
    const fallbackQuery = await supabase
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

    if (fallbackQuery.error) throw new Error(`Gagal memuat antrean: ${fallbackQuery.error.message}`);
    list = (fallbackQuery.data as unknown as RawQueueRow[]) ?? [];
  }

  return list.map((q) => {
    const user = q.user;
    const service = q.service;
    const counter = q.counter;

    return {
      id: q.id,
      queue_number: q.queue_number,
      status: q.status,
      time_block: q.time_block,
      schedule_date: q.schedule_date,
      counter_id: q.counter_id,
      location_id: q.location_id ?? null,
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

export type ReviewFilters = {
  serviceId: number | null;
  counterId: number | null;
  rating: RatingLevel | null;
};

export type ReviewStatItem = { label: string; value: string; unit?: string };

export type AdminReviewsResult = {
  stats: ReviewStatItem[];
  /** Persentase per level rating, 0 semua kalau tidak ada ulasan. */
  breakdown: Record<number, number>;
  reviews: ReviewItem[];
};

export type ReviewFilterOption = { value: string; label: string };

/** Opsi filter halaman ulasan: layanan & loket milik instansi ini saja. */
export async function getReviewFilterOptions(agencyId: number): Promise<{
  services: ReviewFilterOption[];
  counters: ReviewFilterOption[];
}> {
  const supabase = createServiceClient();

  const [servicesRes, countersRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, name")
      .eq("agency_id", agencyId)
      .order("name", { ascending: true }),
    supabase
      .from("counters")
      .select("id, counter_name, location_id")
      .eq("agency_id", agencyId)
      .order("id", { ascending: true }),
  ]);

  if (servicesRes.error) throw new Error(`Gagal memuat layanan: ${servicesRes.error.message}`);
  if (countersRes.error) throw new Error(`Gagal memuat loket: ${countersRes.error.message}`);

  const counters = countersRes.data ?? [];
  const nameCount = new Map<string, number>();
  for (const c of counters) nameCount.set(c.counter_name, (nameCount.get(c.counter_name) ?? 0) + 1);

  return {
    services: (servicesRes.data ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    // Nama loket bisa sama di cabang berbeda ("Loket 1" di MPP dan di kantor
    // induk), jadi cabangnya disebut hanya kalau namanya bentrok.
    counters: counters.map((c) => ({
      value: String(c.id),
      label:
        (nameCount.get(c.counter_name) ?? 0) > 1
          ? `${c.counter_name} (Cabang #${c.location_id})`
          : c.counter_name,
    })),
  };
}

const REVIEW_TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

function average(ratings: number[]): string {
  if (ratings.length === 0) return "-";
  return (ratings.reduce((acc, r) => acc + r, 0) / ratings.length).toFixed(1);
}

/**
 * Ulasan instansi beserta ringkasannya. Filter berlaku untuk semuanya —
 * statistik, rincian rating, dan daftar — karena ketiganya dihitung dari hasil
 * query yang sama.
 *
 * Tidak ada lagi fallback data karangan (500 ulasan, 4.6/5): query gagal
 * dilempar, nol ulasan dikembalikan sebagai nol.
 */
export async function getAdminReviews(
  agencyId: number,
  filters: ReviewFilters = { serviceId: null, counterId: null, rating: null },
): Promise<AdminReviewsResult> {
  const supabase = createServiceClient();

  let query = supabase
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

  if (filters.serviceId !== null) query = query.eq("service_id", filters.serviceId);
  if (filters.counterId !== null) query = query.eq("counter_id", filters.counterId);
  if (filters.rating !== null) query = query.eq("rating", filters.rating);

  const { data: reviews, error } = await query;

  if (error) throw new Error(`Gagal memuat ulasan: ${error.message}`);

  const list = reviews ?? [];
  const total = list.length;

  // "Bulan Ini" = bulan berjalan WIB. Dibandingkan sebagai instant, bukan
  // string: created_at dari PostgREST berformat "+00:00".
  const monthStart = startOfMonthInJakarta().getTime();
  const thisMonth = list.filter((r) => new Date(r.created_at).getTime() >= monthStart);

  const breakdown = [1, 2, 3, 4, 5].reduce<Record<number, number>>((acc, level) => {
    acc[level] =
      total > 0 ? Math.round((list.filter((r) => r.rating === level).length / total) * 100) : 0;
    return acc;
  }, {});

  return {
    stats: [
      { label: "Total Ulasan", value: String(total) },
      {
        label: "Rata-rata",
        value: average(list.map((r) => r.rating)),
        unit: total > 0 ? "/5" : undefined,
      },
      {
        label: "Sangat Puas",
        value: total > 0 ? String(breakdown[5]) : "-",
        unit: total > 0 ? "%" : undefined,
      },
      {
        label: "Bulan Ini",
        value: average(thisMonth.map((r) => r.rating)),
        unit: thisMonth.length > 0 ? "/5" : undefined,
      },
    ],
    breakdown,
    reviews: list.map((r) => ({
      id: String(r.id),
      rating: r.rating as RatingLevel,
      comment: r.comment ?? "",
      service: r.service?.name ?? "-",
      counter: r.counter?.counter_name ?? "-",
      time: REVIEW_TIME_FORMATTER.format(new Date(r.created_at)),
    })),
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

export async function getServiceDonutData(
  agencyId: number,
  locationId?: number | null,
): Promise<ServiceDonutItem[]> {
  const supabase = createServiceClient();

  let queueQuery = supabase
    .from("queues")
    .select("id, service:services!inner(id, name, agency_id)")
    .eq("service.agency_id", agencyId);

  if (locationId) {
    queueQuery = queueQuery.eq("location_id", locationId);
  }

  const { data: queues, error } = await queueQuery;

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

export async function getWeeklyQueueData(
  agencyId: number,
  locationId?: number | null,
): Promise<WeeklyQueueResult> {
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

  let queueQuery = supabase
    .from("queues")
    .select("id, schedule_date, service:services!inner(agency_id)")
    .eq("service.agency_id", agencyId)
    .gte("schedule_date", startDate)
    .lte("schedule_date", endDate);

  if (locationId) {
    queueQuery = queueQuery.eq("location_id", locationId);
  }

  const { data: queues } = await queueQuery;

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

