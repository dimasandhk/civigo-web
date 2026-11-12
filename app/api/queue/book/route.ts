import type { NextRequest } from "next/server";
import { bookQueue } from "@/lib/queue/book";
import {
  errorResponse,
  internalErrorResponse,
  invalidJsonResponse,
  readJsonBody,
} from "@/lib/queue/http";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";

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
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`book:${ip}`, { limit: 60, windowMs: 60000 });
    if (!rateCheck.success && process.env.NODE_ENV !== "test") {
      return rateLimitExceededResponse(
        rateCheck,
        "Terlalu banyak pemesanan antrean dari perangkat ini. Silakan coba beberapa saat lagi."
      );
    }

    const parsed = await readJsonBody(request);

    if (!parsed) return invalidJsonResponse();

    const result = await bookQueue(parsed.body);

    if (!result.ok) return errorResponse(result);

    return Response.json({ ok: true, ticket: result.ticket }, { status: 201 });
  } catch (error) {
    return internalErrorResponse("POST /api/queue/book", error);
  }
}
