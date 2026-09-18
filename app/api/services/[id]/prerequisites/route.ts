import type { NextRequest } from "next/server";
import { evaluatePrerequisites } from "@/lib/queue/cross-agency";
import {
  internalErrorResponse,
  invalidJsonResponse,
  readJsonBody,
} from "@/lib/queue/http";

function parseOwnedDocsFromQuery(searchParams: URLSearchParams): string[] {
  const list: string[] = [];
  // Mendukung ?owned=KTP,KK atau ?owned=KTP&owned=KK
  const ownedAll = searchParams.getAll("owned");
  for (const item of ownedAll) {
    if (item.includes(",")) {
      list.push(...item.split(",").map((s) => s.trim()));
    } else {
      list.push(item.trim());
    }
  }

  // Dukung juga ?owned_documents=...
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

function parseOwnedDocsFromBody(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const b = body as Record<string, unknown>;

  const raw = b.owned_documents ?? b.owned ?? b.documents;
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * GET /api/services/[id]/prerequisites
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

    const result = await evaluatePrerequisites(serviceId, owned);

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
    const result = await evaluatePrerequisites(serviceId, owned);

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
    return internalErrorResponse("POST /api/services/[id]/prerequisites", error);
  }
}
