import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  errorResponse,
  internalErrorResponse,
  invalidJsonResponse,
  readJsonBody,
} from "@/lib/queue/http";
import { isUuid } from "@/lib/queue/shared";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/reviews
 *
 * Mengambil daftar ulasan dan penilaian warga.
 *
 * Query params (opsional):
 *   ?agency_id=1
 *   ?service_id=1
 *   ?counter_id=1
 *   ?limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("agency_id");
    const serviceId = searchParams.get("service_id");
    const counterId = searchParams.get("counter_id");
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

    const supabase = createServiceClient();
    let query = supabase
      .from("reviews")
      .select(`
        id,
        agency_id,
        service_id,
        counter_id,
        queue_id,
        rating,
        comment,
        created_at,
        agency:agencies(id, name),
        service:services(id, name),
        counter:counters(id, counter_name)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (agencyId) query = query.eq("agency_id", Number(agencyId));
    if (serviceId) query = query.eq("service_id", Number(serviceId));
    if (counterId) query = query.eq("counter_id", Number(counterId));

    const { data, error } = await query;

    if (error) {
      if (error.code === "PGRST205" || error.message.includes("does not exist")) {
        return Response.json(
          {
            ok: false,
            error: {
              code: "REVIEWS_TABLE_NOT_FOUND",
              message:
                "Tabel reviews belum dibuat di Supabase. Silakan jalankan migrasi database di Supabase SQL Editor.",
            },
          },
          { status: 503 }
        );
      }
      throw error;
    }

    return Response.json(
      {
        ok: true,
        count: data?.length ?? 0,
        reviews: data ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    return internalErrorResponse("GET /api/reviews", error);
  }
}

/**
 * POST /api/reviews
 *
 * Mengirimkan ulasan dan rating kepuasan layanan oleh warga.
 *
 * Body JSON:
 *   {
 *     "agency_id": 1,
 *     "rating": 5,
 *     "comment": "Petugas ramah dan proses sangat cepat!",
 *     "service_id": 1,
 *     "counter_id": 1,
 *     "queue_id": "e66966c3-9f2f-44b6-b4e6-d4c6f3863a4f"
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonBody(request);
    if (!parsed) return invalidJsonResponse();

    const body = parsed.body as Record<string, unknown>;

    // Validasi rating
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return errorResponse({
        ok: false,
        status: 400,
        code: "INVALID_RATING",
        message: "Rating wajib berupa bilangan bulat antara 1 sampai 5.",
      });
    }

    const supabase = createServiceClient();
    let agencyId = body.agency_id ? Number(body.agency_id) : null;
    let serviceId = body.service_id ? Number(body.service_id) : null;
    const counterId = body.counter_id ? Number(body.counter_id) : null;
    const rawQueueId = body.queue_id ? String(body.queue_id).trim() : null;

    // Jika ada queue_id, validasi UUID dan cari relasi agency/service jika belum diisi
    if (rawQueueId) {
      if (!isUuid(rawQueueId)) {
        return errorResponse({
          ok: false,
          status: 400,
          code: "INVALID_QUEUE_ID",
          message: "queue_id harus berupa format UUID yang valid.",
        });
      }

      const { data: ticket } = await supabase
        .from("queues")
        .select("id, service_id, counter_id, service:services(agency_id)")
        .eq("id", rawQueueId)
        .maybeSingle();

      if (ticket) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svc = ticket.service as any;
        if (!agencyId && svc?.agency_id) agencyId = svc.agency_id;
        if (!serviceId && ticket.service_id) serviceId = ticket.service_id;
      }
    }

    // Jika agency_id masih belum ada tetapi ada service_id, cari agency_id dari service
    if (!agencyId && serviceId) {
      const { data: svc } = await supabase
        .from("services")
        .select("agency_id")
        .eq("id", serviceId)
        .maybeSingle();
      if (svc?.agency_id) agencyId = svc.agency_id;
    }

    if (!agencyId) {
      return errorResponse({
        ok: false,
        status: 400,
        code: "AGENCY_REQUIRED",
        message: "agency_id wajib disertakan atau dapat diturunkan dari service_id/queue_id.",
      });
    }

    // Ambil user ID jika warga sedang login (opsional)
    const profile = await getCurrentUser();
    const userId = profile?.id ?? null;

    const comment = typeof body.comment === "string" ? body.comment.trim() : null;

    const { data: inserted, error: insertError } = await supabase
      .from("reviews")
      .insert({
        agency_id: agencyId,
        service_id: serviceId,
        counter_id: counterId,
        queue_id: rawQueueId,
        user_id: userId,
        rating,
        comment,
      })
      .select(`
        id,
        agency_id,
        service_id,
        counter_id,
        queue_id,
        rating,
        comment,
        created_at
      `)
      .single();

    if (insertError) {
      if (insertError.code === "PGRST205" || insertError.message.includes("does not exist")) {
        return Response.json(
          {
            ok: false,
            error: {
              code: "REVIEWS_TABLE_NOT_FOUND",
              message:
                "Tabel reviews belum dibuat di Supabase. Silakan jalankan migrasi database di Supabase SQL Editor.",
            },
          },
          { status: 503 }
        );
      }
      throw insertError;
    }

    return Response.json({ ok: true, review: inserted }, { status: 201 });
  } catch (error) {
    return internalErrorResponse("POST /api/reviews", error);
  }
}
