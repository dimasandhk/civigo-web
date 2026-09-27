import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { todayInJakarta } from "@/lib/queue/time";

/**
 * GET /api/queue/my
 *
 * Mengambil seluruh tiket antrean milik pengguna (warga), yang dipisahkan menjadi:
 * 1. `active_tickets`: Tiket aktif hari ini atau yang akan datang (scheduled, present, served).
 * 2. `history_tickets`: Tiket riwayat masa lalu, selesai (completed), atau hangus (skipped).
 *
 * Mendukung filter tiket yang didaftarkan untuk diri sendiri maupun anggota keluarga.
 *
 * Autentikasi:
 * - Menggunakan session login Supabase Auth (Cookie / Bearer).
 * - Fallback query param: ?user_id=... atau ?nik=...
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get("user_id");
    const queryNik = searchParams.get("nik")?.trim();

    const targetUserId = user?.id ?? queryUserId;

    if (!targetUserId && !queryNik) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message:
              "Silakan login terlebih dahulu atau sediakan parameter nik/user_id untuk melihat riwayat antrean.",
          },
        },
        { status: 401 }
      );
    }

    const serviceDb = createServiceClient();

    let query = serviceDb
      .from("queues")
      .select(
        `
        id,
        queue_number,
        status,
        schedule_date,
        time_block,
        postponed,
        postponed_at,
        created_at,
        nik,
        family_member_id,
        rescheduled_from,
        counter_id,
        service_id,
        location_id,
        services (
          id,
          name,
          estimated_time,
          agency_id,
          agencies (
            id,
            name,
            open_time,
            close_time
          )
        ),
        counters (
          id,
          counter_name,
          status
        ),
        locations (
          id,
          name,
          address,
          city
        ),
        family_members (
          id,
          full_name,
          relationship,
          nik
        )
      `
      );

    if (targetUserId && queryNik) {
      query = query.or(`user_id.eq.${targetUserId},nik.eq.${queryNik}`);
    } else if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    } else if (queryNik) {
      query = query.eq("nik", queryNik);
    }

    const { data: rawTickets, error: fetchError } = await query.order(
      "schedule_date",
      { ascending: false }
    );

    if (fetchError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FETCH_FAILED",
            message: fetchError.message,
          },
        },
        { status: 500 }
      );
    }

    const today = todayInJakarta();

    const formattedTickets = (rawTickets ?? []).map((t) => {
      const service = t.services as unknown as {
        id: number;
        name: string;
        estimated_time: number | null;
        agency_id: number;
        agencies: {
          id: number;
          name: string;
          open_time: string;
          close_time: string;
        } | null;
      } | null;

      const counter = t.counters as unknown as {
        id: number;
        counter_name: string;
        status: string | null;
      } | null;

      const location = t.locations as unknown as {
        id: number;
        name: string;
        address: string;
        city: string | null;
      } | null;

      const familyMember = t.family_members as unknown as {
        id: number;
        full_name: string;
        relationship: string;
        nik: string;
      } | null;

      const isSkipped = t.status === "skipped";
      const isPastDate = t.schedule_date < today;
      const canReschedule = isSkipped && t.schedule_date === today;

      return {
        id: t.id,
        queue_number: t.queue_number,
        status: t.status,
        schedule_date: t.schedule_date,
        time_block: t.time_block,
        postponed: t.postponed,
        postponed_at: t.postponed_at,
        created_at: t.created_at,
        nik: t.nik,
        is_past_date: isPastDate,
        can_reschedule: canReschedule,
        is_for_family: Boolean(t.family_member_id),
        family_member: familyMember
          ? {
              id: familyMember.id,
              full_name: familyMember.full_name,
              relationship: familyMember.relationship,
              nik: familyMember.nik,
            }
          : null,
        service: service
          ? {
              id: service.id,
              name: service.name,
              estimated_time: service.estimated_time,
              agency: service.agencies
                ? {
                    id: service.agencies.id,
                    name: service.agencies.name,
                    open_time: service.agencies.open_time,
                    close_time: service.agencies.close_time,
                  }
                : null,
            }
          : null,
        counter: counter
          ? {
              id: counter.id,
              counter_name: counter.counter_name,
              status: counter.status,
            }
          : null,
        location: location
          ? {
              id: location.id,
              name: location.name,
              address: location.address,
              city: location.city,
            }
          : null,
        rescheduled_from: t.rescheduled_from,
      };
    });

    const activeTickets = formattedTickets.filter((t) => {
      const isActiveStatus = ["scheduled", "present", "served"].includes(
        t.status
      );
      const isCurrentOrFuture = t.schedule_date >= today;
      return isActiveStatus && isCurrentOrFuture;
    });

    const historyTickets = formattedTickets.filter((t) => {
      const isInactiveStatus = ["completed", "skipped", "cancelled"].includes(
        t.status
      );
      const isPast = t.schedule_date < today;
      return isInactiveStatus || isPast;
    });

    return NextResponse.json(
      {
        ok: true,
        today,
        total_tickets: formattedTickets.length,
        active_count: activeTickets.length,
        history_count: historyTickets.length,
        active_tickets: activeTickets,
        history_tickets: historyTickets,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: (error as Error).message || "Terjadi kesalahan pada server.",
        },
      },
      { status: 500 }
    );
  }
}
