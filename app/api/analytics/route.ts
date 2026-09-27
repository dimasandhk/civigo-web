import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { todayInJakarta } from "@/lib/queue/time";
import { internalErrorResponse } from "@/lib/queue/http";

/**
 * GET /api/analytics
 *
 * Mengambil ringkasan analitik operasional antrean dan kepuasan masyarakat.
 *
 * Query Params:
 *   ?agency_id=1       (wajib/opsional, default: 1)
 *   ?location_id=1     (opsional: memfilter berdasarkan cabang)
 *   ?date=YYYY-MM-DD   (opsional: tanggal antrean, default: hari ini)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyIdParam = searchParams.get("agency_id");
    const locationIdParam = searchParams.get("location_id");
    const dateParam = searchParams.get("date");

    const agencyId = agencyIdParam ? Number(agencyIdParam) : 1;
    const locationId = locationIdParam ? Number(locationIdParam) : null;
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : todayInJakarta();

    const supabase = createServiceClient();

    // 1. Coba panggil RPC jika sudah tersedia di database
    const rpcPromises = Promise.allSettled([
      (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
        "get_agency_satisfaction_analytics",
        { p_agency_id: agencyId, p_location_id: locationId }
      ),
      (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
        "get_agency_queue_analytics",
        { p_agency_id: agencyId, p_date: date, p_location_id: locationId }
      ),
    ]);

    const [satRpcResult, queueRpcResult] = await rpcPromises;

    let satisfactionData =
      satRpcResult.status === "fulfilled" && !satRpcResult.value.error
        ? satRpcResult.value.data
        : null;

    let queueMetricsData =
      queueRpcResult.status === "fulfilled" && !queueRpcResult.value.error
        ? queueRpcResult.value.data
        : null;

    // 2. Fallback query langsung jika RPC belum dieksekusi di database
    if (!satisfactionData) {
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("agency_id", agencyId);

      const revList = reviews ?? [];
      const totalReviews = revList.length;
      const sumRating = revList.reduce((acc, r) => acc + (r.rating || 0), 0);
      const avgRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 0;
      const satisfiedCount = revList.filter((r) => (r.rating || 0) >= 4).length;
      const satisfactionPct = totalReviews > 0 ? Number(((satisfiedCount / totalReviews) * 100).toFixed(1)) : 0;

      const breakdown = {
        star_1: revList.filter((r) => r.rating === 1).length,
        star_2: revList.filter((r) => r.rating === 2).length,
        star_3: revList.filter((r) => r.rating === 3).length,
        star_4: revList.filter((r) => r.rating === 4).length,
        star_5: revList.filter((r) => r.rating === 5).length,
      };

      satisfactionData = {
        total_reviews: totalReviews,
        average_rating: avgRating,
        satisfaction_percentage: satisfactionPct,
        breakdown,
      };
    }

    if (!queueMetricsData) {
      let queueQuery = supabase
        .from("queues")
        .select("id, status, postponed, service:services!inner(id, agency_id)")
        .eq("service.agency_id", agencyId)
        .eq("schedule_date", date);

      if (locationId) {
        queueQuery = queueQuery.eq("location_id", locationId);
      }

      const { data: queues } = await queueQuery;
      const qList = (queues as unknown as Array<{ id: string; status: string; postponed?: boolean }>) ?? [];

      const totalToday = qList.length;
      const waiting = qList.filter((q) => q.status === "waiting").length;
      const calling = qList.filter((q) => q.status === "calling").length;
      const serving = qList.filter((q) => q.status === "serving").length;
      const completed = qList.filter((q) => q.status === "completed").length;
      const skipped = qList.filter((q) => q.status === "skipped" || q.status === "canceled").length;
      const postponed = qList.filter((q) => Boolean(q.postponed)).length;

      let counterQuery = supabase
        .from("counters")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("status", "active");

      if (locationId) {
        counterQuery = counterQuery.eq("location_id", locationId);
      }

      const { data: counters } = await counterQuery;

      queueMetricsData = {
        date,
        total_today: totalToday,
        waiting,
        calling,
        serving,
        completed,
        skipped,
        postponed,
        active_counters: counters?.length ?? 0,
        attendance_rate: totalToday > 0 ? Number(((completed / totalToday) * 100).toFixed(1)) : 0,
      };
    }

    // 3. Distribusi Layanan Terpopuler
    let serviceQueueQuery = supabase
      .from("queues")
      .select("id, service:services!inner(id, name, agency_id)")
      .eq("service.agency_id", agencyId);

    if (locationId) {
      serviceQueueQuery = serviceQueueQuery.eq("location_id", locationId);
    }

    const { data: serviceQueues } = await serviceQueueQuery;
    const serviceCounts: Record<string, number> = {};

    for (const q of (serviceQueues as unknown as Array<{ service: { name: string } }>) ?? []) {
      const sName = q.service?.name ?? "Layanan Lainnya";
      serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
    }

    const totalQueueAllTime = (serviceQueues ?? []).length;
    const serviceDistribution = Object.entries(serviceCounts)
      .map(([name, count]) => ({
        service_name: name,
        count,
        percentage: totalQueueAllTime > 0 ? Math.round((count / totalQueueAllTime) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return Response.json(
      {
        ok: true,
        agency_id: agencyId,
        location_id: locationId,
        date,
        satisfaction: satisfactionData,
        queue_metrics: queueMetricsData,
        service_distribution: serviceDistribution,
      },
      { status: 200 }
    );
  } catch (error) {
    return internalErrorResponse("GET /api/analytics", error);
  }
}
