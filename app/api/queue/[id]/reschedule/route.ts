import type { NextRequest } from "next/server";
import { errorResponse, internalErrorResponse } from "@/lib/queue/http";
import { rescheduleQueue } from "@/lib/queue/reschedule";

/**
 * POST /api/queue/[id]/reschedule — geser tiket hangus ke sesi berikutnya.
 *
 * Tanpa body. Sesi tujuan dihitung server: sesi berikutnya pada hari yang sama
 * yang belum lewat dan masih cukup untuk menyelesaikan layanan sebelum instansi
 * tutup.
 *
 * Tiket lama tidak diubah — tetap `skipped`. Yang dibuat adalah tiket baru
 * berstatus `scheduled` dengan `rescheduled_from` menunjuk ke tiket lama, jadi
 * riwayat hangusnya tetap utuh.
 *
 * Boleh dipanggil warga pemilik tiket, atau petugas instansi yang bersangkutan
 * — jalur satu-satunya untuk tiket walk-in yang tidak punya akun.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await rescheduleQueue(id);

    if (!result.ok) return errorResponse(result);

    return Response.json({ ok: true, ticket: result.ticket }, { status: 201 });
  } catch (error) {
    return internalErrorResponse("POST /api/queue/[id]/reschedule", error);
  }
}
