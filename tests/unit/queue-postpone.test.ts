import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockResolveCaller, mockLoadTicketContext, mockFrom } = vi.hoisted(() => ({
  mockResolveCaller: vi.fn(),
  mockLoadTicketContext: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/queue/authz", () => ({
  resolveCaller: mockResolveCaller,
  loadTicketContext: mockLoadTicketContext,
  requireAgencyAccess: vi.fn(() => null), // Always granted in test
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { postponeQueue } from "@/lib/queue/status";

describe("Queue Postpone Engine (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveCaller.mockResolvedValue({
      kind: "officer",
      agencyId: 1,
      userId: "officer-uuid",
      role: "operator",
    });
  });

  it("fails when ticket ID is not a valid UUID", async () => {
    const result = await postponeQueue("not-a-uuid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.code).toBe("INVALID_TICKET_ID");
    }
  });

  it("fails to postpone if ticket is already in final status (completed or skipped)", async () => {
    mockLoadTicketContext.mockResolvedValueOnce({
      ticket: {
        id: "11111111-2222-3333-4444-555555555555",
        queue_number: "A-001",
        status: "completed",
      },
      service: { id: 1, name: "KTP" },
      agency: { id: 1, name: "Disdukcapil" },
    });

    const result = await postponeQueue("11111111-2222-3333-4444-555555555555");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.code).toBe("CANNOT_POSTPONE_FINAL_STATUS");
    }
  });

  it("successfully updates ticket with postponed = true and status = present", async () => {
    mockLoadTicketContext.mockResolvedValueOnce({
      ticket: {
        id: "11111111-2222-3333-4444-555555555555",
        queue_number: "A-003",
        status: "present",
      },
      service: { id: 1, name: "KTP" },
      agency: { id: 1, name: "Disdukcapil" },
    });

    const updatedRow = {
      id: "11111111-2222-3333-4444-555555555555",
      queue_number: "A-003",
      status: "present",
      schedule_date: "2026-09-28",
      time_block: null,
      counter_id: null,
      postponed: true,
      postponed_at: "2026-09-28T09:00:00Z",
    };

    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({ data: updatedRow, error: null }),
    });

    const result = await postponeQueue("11111111-2222-3333-4444-555555555555");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ticket.queue_number).toBe("A-003");
      expect(result.ticket.status).toBe("present");
      expect(result.ticket.counter_id).toBeNull();
      expect(result.message).toContain("berhasil dimundurkan");
    }
  });
});
