import type { NextRequest } from "next/server";
import { evaluatePrerequisites } from "@/lib/queue/cross-agency";
import {
  internalErrorResponse,
  invalidJsonResponse,
  readJsonBody,
} from "@/lib/queue/http";

/**
 * POST /api/services/cross-agency
 *
 * Endpoint utama evaluasi prasyarat dokumen lintas-instansi (Dev 2, Tugas 2).
 *
 * Body JSON:
 *   {
 *     "target_service_id": 4,
 *     "owned_documents": ["KTP Asli", "Akta Kelahiran"]
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonBody(request);
    if (!parsed) return invalidJsonResponse();

    const body = parsed.body as Record<string, unknown>;
    const targetServiceId = Number(body.target_service_id ?? body.service_id);

    if (!Number.isInteger(targetServiceId) || targetServiceId < 1) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "INVALID_TARGET_SERVICE_ID",
            message: "Field target_service_id (integer positif) wajib disertakan.",
          },
        },
        { status: 400 }
      );
    }

    const rawOwned = body.owned_documents ?? body.owned ?? body.documents;
    let owned: string[] = [];
    if (Array.isArray(rawOwned)) {
      owned = rawOwned.map(String).map((s) => s.trim()).filter(Boolean);
    } else if (typeof rawOwned === "string") {
      owned = rawOwned.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const result = await evaluatePrerequisites(targetServiceId, owned);

    return Response.json({ ok: true, evaluation: result }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("tidak ditemukan")) {
      return Response.json(
        {
          ok: false,
          error: { code: "SERVICE_NOT_FOUND", message },
        },
        { status: 404 }
      );
    }
    return internalErrorResponse("POST /api/services/cross-agency", error);
  }
}
