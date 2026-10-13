import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const VALID_ID = "6f1f0c2e-4b1a-4c55-9a51-1f2d3c4b5a69";
const OTHER_ID = "7e2f1d3c-5a2b-4d66-8b62-2f3e4d5c6b70";

type TicketRow = {
  id: string;
  queue_number: string;
  status: string;
  is_reviewed: boolean | null;
  user_id: string | null;
  nik: string;
};

const store = {
  tickets: {} as Record<string, TicketRow>,
  updatedPayload: null as Record<string, unknown> | null,
};

const mockGetCurrentUser = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table !== "queues") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: (_col: string, val: string) => ({
            maybeSingle: async () => ({
              data: store.tickets[val] ?? null,
              error: null,
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          store.updatedPayload = payload;
          return {
            eq: (_col: string, val: string) => {
              if (store.tickets[val]) {
                Object.assign(store.tickets[val], payload);
              }
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  }),
}));

import { POST as postReviewLater } from "@/app/api/queue/[id]/review-later/route";

function callRoute(id: string) {
  const req = new NextRequest(`http://localhost:3000/api/queue/${id}/review-later`, {
    method: "POST",
  });
  return postReviewLater(req, { params: Promise.resolve({ id }) });
}

describe("POST /api/queue/[id]/review-later", () => {
  beforeEach(() => {
    store.tickets = {
      [VALID_ID]: {
        id: VALID_ID,
        queue_number: "A-010",
        status: "completed",
        is_reviewed: null,
        user_id: "user-1",
        nik: "3273010101010001",
      },
    };
    store.updatedPayload = null;
    mockGetCurrentUser.mockResolvedValue(null);
  });

  it("rejects non-uuid id with 400 INVALID_ID", async () => {
    const res = await callRoute("not-a-uuid");
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("INVALID_ID");
  });

  it("returns 404 when ticket is not found", async () => {
    const res = await callRoute(OTHER_ID);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("returns 422 TICKET_NOT_COMPLETED if ticket is not in completed status", async () => {
    store.tickets[VALID_ID].status = "served";

    const res = await callRoute(VALID_ID);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("TICKET_NOT_COMPLETED");
  });

  it("returns 422 ALREADY_REVIEWED if ticket is already reviewed", async () => {
    store.tickets[VALID_ID].is_reviewed = true;

    const res = await callRoute(VALID_ID);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("ALREADY_REVIEWED");
  });

  it("returns 403 FORBIDDEN if logged in citizen is not the owner", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      id: "other-user",
      role: "user",
      nik: "9999999999999999",
    });

    const res = await callRoute(VALID_ID);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("marks ticket with is_reviewed = false when completed", async () => {
    const res = await callRoute(VALID_ID);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.ticket.is_reviewed).toBe(false);
    expect(store.tickets[VALID_ID].is_reviewed).toBe(false);
    expect(store.updatedPayload).toEqual({ is_reviewed: false });
  });
});
