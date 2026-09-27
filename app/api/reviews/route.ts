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

/** Tidak diisi (`undefined`/`null`/`""`) = null; isian yang bukan bilangan bulat positif = NaN. */
function parseOptionalId(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : Number.NaN;
}

function fail(status: number, code: string, message: string): Response {
  return errorResponse({ ok: false, status, code, message });
}

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
 *
 * service_id, counter_id, dan antrean dari queue_id harus milik agency_id yang
 * sama (422 *_AGENCY_MISMATCH); id yang tidak ada dijawab 404, bukan 500 dari
 * foreign key.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonBody(request);
    if (!parsed) return invalidJsonResponse();

    const body = parsed.body as Record<string, unknown>;

    // Validasi rating
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return fail(400, "INVALID_RATING", "Rating wajib berupa bilangan bulat antara 1 sampai 5.");
    }

    const agencyIdInput = parseOptionalId(body.agency_id);
    let serviceId = parseOptionalId(body.service_id);
    const counterId = parseOptionalId(body.counter_id);
    for (const [field, value] of [
      ["agency_id", agencyIdInput],
      ["service_id", serviceId],
      ["counter_id", counterId],
    ] as const) {
      if (Number.isNaN(value)) {
        return fail(400, "INVALID_ID", `${field} harus berupa bilangan bulat positif.`);
      }
    }

    const supabase = createServiceClient();
    const rawQueueId = body.queue_id ? String(body.queue_id).trim() : null;

    // Instansi pemilik tiap relasi, untuk dicocokkan di bawah.
    let queueAgencyId: number | null = null;
    let serviceAgencyId: number | null = null;

    if (rawQueueId) {
      if (!isUuid(rawQueueId)) {
        return fail(400, "INVALID_QUEUE_ID", "queue_id harus berupa format UUID yang valid.");
      }

      const { data: ticket } = await supabase
        .from("queues")
        .select("id, service_id, service:services(agency_id)")
        .eq("id", rawQueueId)
        .maybeSingle();

      if (!ticket) {
        return fail(404, "QUEUE_NOT_FOUND", `Antrean dengan id ${rawQueueId} tidak ditemukan.`);
      }

      queueAgencyId = ticket.service?.agency_id ?? null;
      if (!serviceId && ticket.service_id) serviceId = ticket.service_id;
    }

    if (serviceId) {
      const { data: svc } = await supabase
        .from("services")
        .select("agency_id")
        .eq("id", serviceId)
        .maybeSingle();

      if (!svc) {
        return fail(404, "SERVICE_NOT_FOUND", `Layanan dengan id ${serviceId} tidak ditemukan.`);
      }
      serviceAgencyId = svc.agency_id;
    }

    // agency_id boleh tidak dikirim kalau bisa diturunkan dari queue_id/service_id.
    const agencyId = agencyIdInput ?? queueAgencyId ?? serviceAgencyId;

    if (!agencyId) {
      return fail(
        400,
        "AGENCY_REQUIRED",
        "agency_id wajib disertakan atau dapat diturunkan dari service_id/queue_id.",
      );
    }

    // Semua relasi ulasan harus milik instansi yang sama. Sebelumnya tidak
    // dicek, dan ulasan Samsat (reviews.id = 8) tersimpan dengan loket milik
    // Disdukcapil — filter loket di /admin/ulasan tidak akan pernah
    // menemukannya, dan loket Disdukcapil "menerima" ulasan instansi lain.
    if (queueAgencyId !== null && queueAgencyId !== agencyId) {
      return fail(
        422,
        "QUEUE_AGENCY_MISMATCH",
        `Antrean ${rawQueueId} bukan milik instansi ${agencyId}.`,
      );
    }

    if (serviceAgencyId !== null && serviceAgencyId !== agencyId) {
      return fail(
        422,
        "SERVICE_AGENCY_MISMATCH",
        `Layanan ${serviceId} bukan milik instansi ${agencyId}.`,
      );
    }

    if (counterId) {
      const { data: counter } = await supabase
        .from("counters")
        .select("agency_id")
        .eq("id", counterId)
        .maybeSingle();

      if (!counter) {
        return fail(404, "COUNTER_NOT_FOUND", `Loket dengan id ${counterId} tidak ditemukan.`);
      }
      if (counter.agency_id !== agencyId) {
        return fail(
          422,
          "COUNTER_AGENCY_MISMATCH",
          `Loket ${counterId} bukan milik instansi ${agencyId}.`,
        );
      }
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
