import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const VALID_ID = "6f1f0c2e-4b1a-4c55-9a51-1f2d3c4b5a69";
const OTHER_ID = "7e2f1d3c-5a2b-4d66-8b62-2f3e4d5c6b70";
const FAMILY_ID = "8f3e2d1c-6b3a-5e77-9c73-3f4e5d6c7b81";

type TicketRow = {
  id: string;
  queue_number: string;
  status: string;
  user_id: string | null;
  nik: string;
  family_member_id?: number | null;
  location_id?: number | null;
  service?: { agency_id?: number };
  canceled_at?: string | null;
  cancel_reason?: string | null;
};

const store = {
  tickets: {} as Record<string, TicketRow>,
  familyMembers: {} as Record<number, { id: number; user_id: string }>,
  updatedPayload: null as Record<string, unknown> | null,
};

const mockGetCurrentUser = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: (_col1: string, val1: number) => ({
              eq: (_col2: string, val2: string) => ({
                maybeSingle: async () => {
                  const fm = store.familyMembers[val1];
                  if (fm && fm.user_id === val2) return { data: fm, error: null };
                  return { data: null, error: null };
                },
              }),
            }),
          }),
        };
      }

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
            eq: (_col: string, val: string) => ({
              in: (_statusCol: string, validStatuses: string[]) => ({
                select: () => ({
                  maybeSingle: async () => {
                    const ticket = store.tickets[val];
                    if (ticket && validStatuses.includes(ticket.status)) {
                      Object.assign(ticket, payload);
                      return { data: ticket, error: null };
                    }
                    return { data: null, error: null };
                  },
                }),
              }),
            }),
          };
        },
      };
    },
    channel: () => ({
      send: vi.fn().mockResolvedValue("ok"),
    }),
    removeChannel: vi.fn(),
  }),
}));

import { POST as postCancel } from "@/app/api/queue/[id]/cancel/route";

function callRoute(id: string, body?: unknown) {
  const req = new NextRequest(`http://localhost:3000/api/queue/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return postCancel(req, { params: Promise.resolve({ id }) });
}

describe("POST /api/queue/[id]/cancel", () => {
  beforeEach(() => {
    store.tickets = {
      [VALID_ID]: {
        id: VALID_ID,
        queue_number: "A-010",
        status: "scheduled",
        user_id: "user-123",
        nik: "3578010101010001",
        service: { agency_id: 1 },
      },
      [OTHER_ID]: {
        id: OTHER_ID,
        queue_number: "A-011",
        status: "scheduled",
        user_id: "other-user-456",
        nik: "3578010101010002",
        service: { agency_id: 1 },
      },
      [FAMILY_ID]: {
        id: FAMILY_ID,
        queue_number: "A-012",
        status: "present",
        user_id: "user-123",
        nik: "3578010101010099",
        family_member_id: 10,
        service: { agency_id: 1 },
      },
    };
    store.familyMembers = {
      10: { id: 10, user_id: "user-123" },
    };
    store.updatedPayload = null;
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue({
      id: "user-123",
      role: "user",
      nik: "3578010101010001",
    });
  });

  it("rejects malformed id format", async () => {
    const res = await callRoute("not-a-uuid");
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("INVALID_ID");
  });

  it("rejects unauthenticated requests", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const res = await callRoute(VALID_ID);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects if ticket is not found", async () => {
    const res = await callRoute("00000000-0000-0000-0000-000000000000");
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("rejects cancellation of another user's ticket (IDOR guard)", async () => {
    const res = await callRoute(OTHER_ID);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("cancels a scheduled ticket successfully with reason", async () => {
    const res = await callRoute(VALID_ID, { reason: "Ada urusan mendadak" });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.ticket.status).toBe("canceled");
    expect(json.ticket.cancel_reason).toBe("Ada urusan mendadak");
    expect(json.ticket.canceled_at).toBeDefined();

    expect(store.tickets[VALID_ID].status).toBe("canceled");
    expect(store.updatedPayload?.status).toBe("canceled");
  });

  it("cancels a present ticket (in waiting room) successfully", async () => {
    store.tickets[VALID_ID].status = "present";

    const res = await callRoute(VALID_ID);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.ticket.status).toBe("canceled");
  });

  it("cancels a family member's ticket by head of family", async () => {
    const res = await callRoute(FAMILY_ID);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.ticket.status).toBe("canceled");
  });

  it("rejects if ticket is being served at the counter", async () => {
    store.tickets[VALID_ID].status = "served";

    const res = await callRoute(VALID_ID);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("TICKET_ALREADY_SERVED");
  });

  it("rejects if ticket is already completed", async () => {
    store.tickets[VALID_ID].status = "completed";

    const res = await callRoute(VALID_ID);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("TICKET_ALREADY_COMPLETED");
  });

  it("rejects if ticket is skipped/hangus", async () => {
    store.tickets[VALID_ID].status = "skipped";

    const res = await callRoute(VALID_ID);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("TICKET_ALREADY_SKIPPED");
  });

  it("rejects if ticket is already canceled", async () => {
    store.tickets[VALID_ID].status = "canceled";

    const res = await callRoute(VALID_ID);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe("TICKET_ALREADY_CANCELED");
  });
});
