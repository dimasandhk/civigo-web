import type { NextRequest } from "next/server";
import {
  errorResponse,
  internalErrorResponse,
  invalidJsonResponse,
  readJsonBody,
} from "@/lib/queue/http";
import { todayInJakarta } from "@/lib/queue/time";
import { createServiceClient } from "@/lib/supabase/service";

type CheckInBody = {
  code?: string;
};

export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonBody(request);
    if (!parsed) return invalidJsonResponse();

    const body = parsed.body as CheckInBody;
    const rawCode = body.code?.trim();

    if (!rawCode) {
      return errorResponse({
        ok: false,
        status: 400,
        code: "CODE_REQUIRED",
        message: "Kode antrean atau NIK wajib diisi.",
      });
    }

    const supabase = createServiceClient();
    const today = todayInJakarta();

    // Clean up code format (e.g. "a01" -> "A-01" if pattern is 1 letter + digits)
    let normalizedCode = rawCode.toUpperCase();
    if (/^[A-Z]\d{2}$/.test(normalizedCode)) {
      normalizedCode = `${normalizedCode[0]}-${normalizedCode.slice(1)}`;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCode);
    const orFilter = isUuid
      ? `id.eq.${rawCode}`
      : `queue_number.eq.${normalizedCode},nik.eq.${rawCode}`;

    // Try finding the ticket for today first, or by ID/NIK across any recent dates
    const { data: tickets, error } = await supabase
      .from("queues")
      .select(`
        id,
        queue_number,
        schedule_date,
        time_block,
        status,
        nik,
        counter_id,
        counter:counters(id, counter_name),
        service:services!inner(id, name, agency_id, agency:agencies(id, name))
      `)
      .or(orFilter)
      .order("schedule_date", { ascending: false })
      .limit(3);

    if (error || !tickets || tickets.length === 0) {
      return errorResponse({
        ok: false,
        status: 404,
        code: "TICKET_NOT_FOUND",
        message: `Tiket dengan kode/nomor "${rawCode}" tidak ditemukan. Pastikan nomor antrean atau NIK Anda sudah terdaftar.`,
      });
    }

    // Pick the most relevant ticket (prioritize today's ticket, or the closest scheduled/present one)
    const todayTicket = tickets.find((t) => t.schedule_date === today) ?? tickets[0];

    // Check if the ticket is for a different date
    if (todayTicket.schedule_date !== today && todayTicket.status === "scheduled") {
      return errorResponse({
        ok: false,
        status: 422,
        code: "DATE_MISMATCH",
        message: `Nomor antrean ${todayTicket.queue_number} terdaftar untuk tanggal ${todayTicket.schedule_date}. Check-in hanya dapat dilakukan pada tanggal jadwal layanan.`,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceData = todayTicket.service as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const counterData = todayTicket.counter as any;
    const agencyData = serviceData?.agency;

    const ticketSummary = {
      id: todayTicket.id,
      queue_number: todayTicket.queue_number,
      status: todayTicket.status,
      schedule_date: todayTicket.schedule_date,
      time_block: todayTicket.time_block,
      service_name: serviceData?.name ?? "Layanan",
      counter_name: counterData?.counter_name ?? null,
      agency_name: agencyData?.name ?? "Instansi Pelayanan",
    };

    if (todayTicket.status === "completed") {
      return errorResponse({
        ok: false,
        status: 422,
        code: "ALREADY_COMPLETED",
        message: `Nomor antrean ${todayTicket.queue_number} sudah selesai dilayani.`,
      });
    }

    if (todayTicket.status === "skipped") {
      return errorResponse({
        ok: false,
        status: 422,
        code: "TICKET_SKIPPED",
        message: `Nomor antrean ${todayTicket.queue_number} telah hangus. Silakan hubungi petugas atau ambil antrean baru.`,
      });
    }

    if (todayTicket.status === "present" || todayTicket.status === "served") {
      return Response.json(
        {
          ok: true,
          ticket: ticketSummary,
          alreadyCheckedIn: true,
          message:
            todayTicket.status === "served"
              ? `Nomor antrean ${todayTicket.queue_number} sedang dipanggil di ${ticketSummary.counter_name ?? "loket"}.`
              : `Anda sudah check-in. Nomor antrean: ${todayTicket.queue_number}. Silakan menunggu di ruang tunggu.`,
        },
        { status: 200 },
      );
    }

    // Transition from 'scheduled' -> 'present'
    const { error: updateError } = await supabase
      .from("queues")
      .update({ status: "present" })
      .eq("id", todayTicket.id);

    if (updateError) {
      return errorResponse({
        ok: false,
        status: 500,
        code: "CHECK_IN_FAILED",
        message: `Gagal memperbarui status check-in: ${updateError.message}`,
      });
    }

    return Response.json(
      {
        ok: true,
        ticket: { ...ticketSummary, status: "present" },
        alreadyCheckedIn: false,
        message: `Check-in berhasil! Nomor antrean Anda adalah ${todayTicket.queue_number}. Silakan menunggu panggilan di ruang tunggu.`,
      },
      { status: 200 },
    );
  } catch (error) {
    return internalErrorResponse("POST /api/queue/check-in", error);
  }
}
