import type { NextRequest } from "next/server";
import { checkInQueue } from "@/lib/queue/check-in";
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

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`checkin:${ip}`, { limit: 60, windowMs: 60000 });
    if (!rateCheck.success && process.env.NODE_ENV !== "test") {
      return rateLimitExceededResponse(
        rateCheck,
        "Terlalu banyak permintaan check-in dari perangkat ini. Silakan coba beberapa saat lagi."
      );
    }

    const parsed = await readJsonBody(request);
    if (!parsed) return invalidJsonResponse();

    const result = await checkInQueue(parsed.body);
    if (!result.ok) return errorResponse(result);

    return Response.json(
      {
        ok: true,
        tickets: result.tickets,
        checkedInCount: result.checkedInCount,
        message: result.message,
        // Bentuk lama (satu tiket), dipertahankan untuk pemanggil di luar kios.
        ticket: result.tickets[0],
        alreadyCheckedIn: result.checkedInCount === 0,
      },
      { status: 200 },
    );
  } catch (error) {
    return internalErrorResponse("POST /api/queue/check-in", error);
  }
}
