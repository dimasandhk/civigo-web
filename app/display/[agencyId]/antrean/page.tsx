import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { todayInJakarta } from "@/lib/queue/time";
import { createServiceClient } from "@/lib/supabase/service";
import QueueDisplayLive, {
  type CounterDisplay,
} from "../../../components/display/QueueDisplayLive";

/**
 * Papan antrean untuk layar di lobi instansi.
 *
 * Tidak ada sesi di sini — ini TV, bukan halaman yang di-login. Karena itu
 * instansinya datang dari URL (`/display/1/antrean`), bukan dari profil
 * pengguna seperti di `/admin`.
 *
 * Dibaca lewat service_role karena policy RLS `queues` menyembunyikan semua
 * baris dari pengunjung anonim. Alternatifnya — policy `USING (true)` untuk
 * anon — akan sekalian membuka `queues.nik` lewat PostgREST, dan NIK warga
 * jelas bukan sesuatu yang layak ditayangkan.
 */

type Props = {
  params: Promise<{ agencyId: string }>;
  searchParams?: Promise<{ locationId?: string }>;
};

async function loadAgency(agencyId: number) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("agencies")
    .select("id, name")
    .eq("id", agencyId)
    .maybeSingle();

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agencyId } = await params;
  const agency = Number.isInteger(Number(agencyId)) ? await loadAgency(Number(agencyId)) : null;

  return { title: agency ? `Antrean ${agency.name} — Display` : "Antrean — Display" };
}

export default async function QueueDisplayPage({ params, searchParams }: Props) {
  const { agencyId: raw } = await params;
  const agencyId = Number(raw);

  if (!Number.isInteger(agencyId) || agencyId < 1) notFound();

  const { locationId: rawLoc } = (await searchParams) ?? {};
  const locationId = rawLoc && Number.isInteger(Number(rawLoc)) ? Number(rawLoc) : null;

  const agency = await loadAgency(agencyId);
  if (!agency) notFound();

  const supabase = createServiceClient();
  const today = todayInJakarta();

  let countersQuery = supabase
    .from("counters")
    .select("id, counter_name")
    .eq("agency_id", agencyId)
    .eq("status", "active")
    .order("id", { ascending: true })
    .limit(4);

  if (locationId) {
    countersQuery = countersQuery.eq("location_id", locationId);
  }

  const { data: counters } = await countersQuery;

  let queuesQuery = supabase
    .from("queues")
    .select("queue_number, counter_id, status, service:services!inner(agency_id, estimated_time)")
    .eq("schedule_date", today)
    .eq("service.agency_id", agencyId);

  if (locationId) {
    queuesQuery = queuesQuery.eq("location_id", locationId);
  }

  const { data: queues } = await queuesQuery;

  const list = queues ?? [];

  // Tidak ada loket palsu di sini. Kalau instansi belum punya loket aktif,
  // papannya memang kosong — itu informasi, bukan kekurangan.
  const activeCounters: CounterDisplay[] = (counters ?? []).map((c) => {
    const serving = list.find((q) => q.counter_id === c.id && q.status === "served");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = serving?.service as any;

    return {
      counter: c.counter_name.split("(")[0].trim(),
      nowServing: serving ? serving.queue_number : "-",
      eta: serving ? `± ${service?.estimated_time ?? 15} menit` : "-",
    };
  });

  const upcoming = list
    .filter((q) => ["present", "scheduled"].includes(q.status))
    .map((q) => q.queue_number)
    .sort((a, b) => a.localeCompare(b));

  return (
    <QueueDisplayLive
      initialCounters={activeCounters}
      initialUpcoming={upcoming}
      agencyName={agency.name}
    />
  );
}
