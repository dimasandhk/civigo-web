import type { NextRequest } from "next/server";
import { bookQueue } from "@/lib/queue/book";
import {
  errorResponse,
  internalErrorResponse,
  invalidJsonResponse,
  readJsonBody,
} from "@/lib/queue/http";

/**
 * POST /api/queue/book — ambil nomor antrean.
 *
 * Body:
 *   {
 *     "service_id": 1,
 *     "schedule_date": "2026-09-15",
 *     "time_block": "09:00 - 10:00",
 *     "nik": "3175012345678901"   // wajib untuk kiosk, diabaikan kalau sudah login
 *   }
 *
 * Warga yang sudah login memesan untuk dirinya sendiri. Pengunjung kiosk tidak
 * punya sesi, jadi mengetik NIK: kalau NIK-nya cocok dengan sebuah akun warga,
 * tiketnya ditautkan ke akun itu; kalau tidak, tiket hanya membawa NIK-nya.
 * Akun tidak pernah dibuat otomatis.
 *
 * Route Handler dinamis secara default sejak Next 15, jadi tidak perlu segment
 * config apa pun di sini.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonBody(request);

    if (!parsed) return invalidJsonResponse();

    const result = await bookQueue(parsed.body);

    if (!result.ok) return errorResponse(result);

    return Response.json({ ok: true, ticket: result.ticket }, { status: 201 });
  } catch (error) {
    return internalErrorResponse("POST /api/queue/book", error);
  }
}
