import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockResolveCaller, mockLoadTicketContext, mockFrom, mockInsertTicketWithNumber } = vi.hoisted(() => ({
  mockResolveCaller: vi.fn(),
  mockLoadTicketContext: vi.fn(),
  mockFrom: vi.fn(),
  mockInsertTicketWithNumber: vi.fn(),
}));

vi.mock("@/lib/queue/authz", () => ({
  resolveCaller: mockResolveCaller,
  loadTicketContext: mockLoadTicketContext,
}));

vi.mock("@/lib/queue/number", () => ({
  insertTicketWithNumber: mockInsertTicketWithNumber,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { rescheduleQueue } from "@/lib/queue/reschedule";

describe("Queue Reschedule Engine (Unit Tests)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockResolveCaller.mockResolvedValue({
      kind: "citizen",
      userId: "user-123",
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fails when ticket ID is not a valid UUID", async () => {
    const result = await rescheduleQueue("not-a-uuid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.code).toBe("INVALID_TICKET_ID");
    }
  });

  it("fails when caller is not authenticated", async () => {
    mockResolveCaller.mockResolvedValueOnce({ kind: "anonymous" });
    const result = await rescheduleQueue("11111111-2222-3333-4444-555555555555");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.code).toBe("UNAUTHENTICATED");
    }
  });

  it("fails when ticket status is not skipped", async () => {
    mockLoadTicketContext.mockResolvedValueOnce({
      ticket: {
        id: "11111111-2222-3333-4444-555555555555",
        user_id: "user-123",
        queue_number: "A-001",
        status: "scheduled",
        schedule_date: "2026-10-13",
        time_block: "09:00 - 10:00",
      },
      service: { id: 1, name: "KTP", estimated_time: 15, agency_id: 1 },
      agency: { id: 1, name: "Disdukcapil", open_time: "08:00", close_time: "15:00" },
    });

    const result = await rescheduleQueue("11111111-2222-3333-4444-555555555555");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.code).toBe("NOT_SKIPPED");
    }
  });

  it("fails when ticket has already been rescheduled", async () => {
    mockLoadTicketContext.mockResolvedValueOnce({
      ticket: {
        id: "11111111-2222-3333-4444-555555555555",
        user_id: "user-123",
        queue_number: "A-001",
        status: "skipped",
        schedule_date: "2026-10-13",
        time_block: "09:00 - 10:00",
      },
      service: { id: 1, name: "KTP", estimated_time: 15, agency_id: 1 },
      agency: { id: 1, name: "Disdukcapil", open_time: "08:00", close_time: "15:00" },
    });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: { queue_number: "A-010", time_block: "11:00 - 12:00" },
        error: null,
      }),
    });

    const result = await rescheduleQueue("11111111-2222-3333-4444-555555555555");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.code).toBe("ALREADY_RESCHEDULED");
      expect(result.message).toContain("sudah digeser ke A-010");
    }
  });

  it("allows off-hours reschedule when ALLOW_OFFHOURS_TESTING is enabled", async () => {
    process.env.ALLOW_OFFHOURS_TESTING = "true";

    mockLoadTicketContext.mockResolvedValueOnce({
      ticket: {
        id: "11111111-2222-3333-4444-555555555555",
        user_id: "user-123",
        nik: "3201010101010001",
        queue_number: "A-001",
        status: "skipped",
        schedule_date: "2026-10-13",
        time_block: "09:00 - 10:00",
        location_id: 1,
        family_member_id: null,
      },
      service: { id: 1, name: "KTP", estimated_time: 15, agency_id: 1 },
      agency: { id: 1, name: "Disdukcapil", open_time: "08:00", close_time: "15:00" },
    });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      }),
    });

    mockInsertTicketWithNumber.mockResolvedValueOnce({
      ok: true,
      row: {
        id: "22222222-3333-4444-5555-666666666666",
        queue_number: "A-002",
        status: "scheduled",
      },
    });

    const result = await rescheduleQueue("11111111-2222-3333-4444-555555555555");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ticket.queue_number).toBe("A-002");
      expect(result.ticket.status).toBe("scheduled");
      expect(result.ticket.rescheduled_from.id).toBe("11111111-2222-3333-4444-555555555555");
      expect(result.ticket.time_block).toBeDefined();
    }
  });

  it("fails with NO_SESSION_LEFT when in production mode without off-hours testing after agency hours", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.ALLOW_OFFHOURS_TESTING = "false";

    // Set agency that was closed in the morning (e.g. 06:00 - 07:00), so no sessions remain now
    mockLoadTicketContext.mockResolvedValueOnce({
      ticket: {
        id: "11111111-2222-3333-4444-555555555555",
        user_id: "user-123",
        nik: "3201010101010001",
        queue_number: "A-001",
        status: "skipped",
        schedule_date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
        time_block: "06:00 - 07:00",
      },
      service: { id: 1, name: "KTP", estimated_time: 15, agency_id: 1 },
      agency: { id: 1, name: "Disdukcapil", open_time: "06:00", close_time: "07:00" },
    });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      }),
    });

    const result = await rescheduleQueue("11111111-2222-3333-4444-555555555555");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.code).toBe("NO_SESSION_LEFT");
    }
  });
});
