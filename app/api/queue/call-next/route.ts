import type { NextRequest } from "next/server";
import {
  errorResponse,
  internalErrorResponse,
  invalidJsonResponse,
  readJsonBody,
} from "@/lib/queue/http";
import { callNextQueue } from "@/lib/queue/status";

/**
 * POST /api/queue/call-next — panggil antrean berikutnya ke sebuah loket.
 *
 * Body:
 *   { "counter_id": 1 }
 *
 * Memilih tiket menunggu paling depan untuk instansi pemilik loket tersebut
 * pada hari ini, lalu memindahkannya ke `served`. Urutannya: yang sudah hadir
 * (`present`) didahulukan atas yang baru terjadwal (`scheduled`), lalu sesi
 * paling awal, lalu nomor terkecil.
 *
 * Hanya untuk akun `instansi` pada instansi pemilik loket, atau `super_admin`.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonBody(request);

    if (!parsed) return invalidJsonResponse();

    const result = await callNextQueue(parsed.body);

    if (!result.ok) return errorResponse(result);

    return Response.json(
      { ok: true, ticket: result.ticket, remaining: result.remaining },
      { status: 200 },
    );
  } catch (error) {
    return internalErrorResponse("POST /api/queue/call-next", error);
  }
}
