import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Data tiruan: Disdukcapil (1) punya layanan 1 & loket 4, Samsat (2) punya
// layanan 3 & loket 3. Antrean QUEUE_SAMSAT memakai layanan 3.
const QUEUE_SAMSAT = "e66966c3-9f2f-44b6-b4e6-d4c6f3863a4f";
const ROWS: Record<string, Record<string, Record<string, unknown>>> = {
  services: { "1": { agency_id: 1 }, "3": { agency_id: 2 } },
  counters: { "3": { agency_id: 2 }, "4": { agency_id: 1 } },
  queues: { [QUEUE_SAMSAT]: { id: QUEUE_SAMSAT, service_id: 3, service: { agency_id: 2 } } },
};

const { mockInsert } = vi.hoisted(() => ({ mockInsert: vi.fn() }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_column: string, value: unknown) => ({
          maybeSingle: async () => ({ data: ROWS[table]?.[String(value)] ?? null, error: null }),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        mockInsert(row);
        return {
          select: () => ({
            single: async () => ({ data: { id: 99, ...row }, error: null }),
          }),
        };
      },
    }),
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: async () => null,
}));

import { POST } from "@/app/api/reviews/route";

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost:3000/api/reviews", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/reviews — relasi harus satu instansi", () => {
  beforeEach(() => {
    mockInsert.mockClear();
  });

  it("rejects a counter that belongs to another agency", async () => {
    const res = await post({ agency_id: 2, service_id: 3, counter_id: 4, rating: 4 });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("COUNTER_AGENCY_MISMATCH");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a service that belongs to another agency", async () => {
    const res = await post({ agency_id: 2, service_id: 1, rating: 5 });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("SERVICE_AGENCY_MISMATCH");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a queue ticket from another agency", async () => {
    const res = await post({ agency_id: 1, queue_id: QUEUE_SAMSAT, rating: 5 });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("QUEUE_AGENCY_MISMATCH");
  });

  it("returns 404 for an unknown counter instead of failing on the foreign key", async () => {
    const res = await post({ agency_id: 2, counter_id: 999, rating: 3 });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("COUNTER_NOT_FOUND");
  });

  it("returns 404 for an unknown queue ticket", async () => {
    const res = await post({ queue_id: "00000000-0000-4000-8000-000000000000", rating: 3 });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("QUEUE_NOT_FOUND");
  });

  it("returns 400 for a non-integer id", async () => {
    const res = await post({ agency_id: 2, counter_id: "abc", rating: 3 });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("INVALID_ID");
  });

  it("saves a review whose service and counter match its agency", async () => {
    const res = await post({ agency_id: 2, service_id: 3, counter_id: 3, rating: 4, comment: " Cepat " });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ agency_id: 2, service_id: 3, counter_id: 3, rating: 4, comment: "Cepat" }),
    );
    expect(json.review.id).toBe(99);
  });

  it("still derives agency and service from queue_id", async () => {
    const res = await post({ queue_id: QUEUE_SAMSAT, counter_id: 3, rating: 5 });

    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ agency_id: 2, service_id: 3, counter_id: 3, queue_id: QUEUE_SAMSAT }),
    );
  });
});
