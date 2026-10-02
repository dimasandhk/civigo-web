import type { NextRequest } from "next/server";
import {
  evaluatePrerequisites,
  getServiceRequirements,
} from "@/lib/queue/cross-agency";
import {
  internalErrorResponse,
  invalidJsonResponse,
  readJsonBody,
} from "@/lib/queue/http";

function parseOwnedDocsFromQuery(searchParams: URLSearchParams): string[] {
  const list: string[] = [];
  const ownedAll = searchParams.getAll("owned");
  for (const item of ownedAll) {
    if (item.includes(",")) {
      list.push(...item.split(",").map((s) => s.trim()));
    } else {
      list.push(item.trim());
    }
  }

  const altOwned = searchParams.getAll("owned_documents");
  for (const item of altOwned) {
    if (item.includes(",")) {
      list.push(...item.split(",").map((s) => s.trim()));
    } else {
      list.push(item.trim());
    }
  }

  return list.filter(Boolean);
}

function parseOwnedDocsFromBody(
  body: unknown
): Array<string | { name: string; status?: string }> {
  if (!body || typeof body !== "object") return [];
  const b = body as Record<string, unknown>;

  const raw = b.documents ?? b.owned_documents ?? b.owned;
  const result: Array<string | { name: string; status?: string }> = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed) result.push(trimmed);
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const name = String(obj.name ?? obj.document_name ?? obj.title ?? "").trim();
        const status = String(obj.status ?? obj.condition ?? "tersedia").trim();
        if (name) {
          result.push({ name, status });
        }
      }
    }
    return result;
  }
  if (typeof raw === "string") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * GET /api/services/[id]/prerequisites
 *
 * Mengambil evaluasi kelayakan booking layanan.
 * Output diringkas untuk Mobile App:
 * - requirements: daftar item berisi `name`, `agency_id`, dan `type` ("dokumen" | "kondisi")
 * - is_ready_to_book: boolean status apakah berkas sudah mencukupi
 * - evaluation: detail evaluasi komprehensif (backward-compatible)
 *
 * Query params (opsional):
 *   ?owned=KTP,KK  -> daftar dokumen yang saat ini sudah dimiliki warga
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = Number(id);

    if (!Number.isInteger(serviceId) || serviceId < 1) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "INVALID_SERVICE_ID",
            message: "ID layanan harus berupa angka positif.",
          },
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const owned = parseOwnedDocsFromQuery(searchParams);

    const [reqSummary, evalResult] = await Promise.all([
      getServiceRequirements(serviceId),
      evaluatePrerequisites(serviceId, owned),
    ]);

    if (!reqSummary) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "SERVICE_NOT_FOUND",
            message: `Layanan dengan ID ${serviceId} tidak ditemukan.`,
          },
        },
        { status: 404 }
      );
    }

    return Response.json(
      {
        ok: true,
        service_id: reqSummary.service_id,
        service_name: reqSummary.service_name,
        agency_id: reqSummary.agency_id,
        is_ready_to_book: evalResult.is_ready_to_book,
        requirements: reqSummary.requirements,
        evaluation: evalResult,
      },
      { status: 200 }
    );
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
    return internalErrorResponse("GET /api/services/[id]/prerequisites", error);
  }
}

/**
 * POST /api/services/[id]/prerequisites
 *
 * Body JSON:
 *   { "owned_documents": ["KTP Asli", "Akta Kelahiran"] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceId = Number(id);

    if (!Number.isInteger(serviceId) || serviceId < 1) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "INVALID_SERVICE_ID",
            message: "ID layanan harus berupa angka positif.",
          },
        },
        { status: 400 }
      );
    }

    const parsed = await readJsonBody(request);
    if (!parsed) return invalidJsonResponse();

    const owned = parseOwnedDocsFromBody(parsed.body);

    const [reqSummary, evalResult] = await Promise.all([
      getServiceRequirements(serviceId),
      evaluatePrerequisites(serviceId, owned),
    ]);

    if (!reqSummary) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "SERVICE_NOT_FOUND",
            message: `Layanan dengan ID ${serviceId} tidak ditemukan.`,
          },
        },
        { status: 404 }
      );
    }

    return Response.json(
      {
        ok: true,
        service_id: reqSummary.service_id,
        service_name: reqSummary.service_name,
        agency_id: reqSummary.agency_id,
        is_ready_to_book: evalResult.is_ready_to_book,
        requirements: reqSummary.requirements,
        evaluation: evalResult,
      },
      { status: 200 }
    );
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
    return internalErrorResponse("POST /api/services/[id]/prerequisites", error);
  }
}
