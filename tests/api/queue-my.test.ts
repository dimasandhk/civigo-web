import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock todayInJakarta to return fixed date for deterministic testing
vi.mock("@/lib/queue/time", () => ({
  todayInJakarta: vi.fn(() => "2026-09-28"),
}));

import { GET as getMyQueues } from "@/app/api/queue/my/route";

describe("Citizen Queue History (GET /api/queue/my)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when neither user session nor user_id/nik query param is provided", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const req = new NextRequest("http://localhost:3000/api/queue/my");
    const res = await getMyQueues(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("classifies tickets into active_tickets and history_tickets properly", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-uuid-1" } },
      error: null,
    });

    const mockTickets = [
      // 1. Active ticket today (scheduled)
      {
        id: "ticket-1",
        queue_number: "A-001",
        status: "scheduled",
        schedule_date: "2026-09-28",
        time_block: null,
        postponed: false,
        postponed_at: null,
        created_at: "2026-09-28T08:00:00Z",
        nik: "3578012345670001",
        family_member_id: null,
        rescheduled_from: null,
        counter_id: null,
        service_id: 1,
        location_id: 1,
        services: { id: 1, name: "KTP", estimated_time: 15, agency_id: 1, agencies: { id: 1, name: "Disdukcapil", open_time: "08:00", close_time: "15:00" } },
        counters: null,
        locations: { id: 1, name: "MPP", address: "Jl. Merdeka", city: "Surabaya" },
        family_members: null,
      },
      // 2. Skipped ticket today (should have can_reschedule = true)
      {
        id: "ticket-2",
        queue_number: "A-002",
        status: "skipped",
        schedule_date: "2026-09-28",
        time_block: null,
        postponed: false,
        postponed_at: null,
        created_at: "2026-09-28T08:15:00Z",
        nik: "3578012345670002",
        family_member_id: 10,
        rescheduled_from: null,
        counter_id: null,
        service_id: 1,
        location_id: 1,
        services: { id: 1, name: "KTP", estimated_time: 15, agency_id: 1, agencies: { id: 1, name: "Disdukcapil", open_time: "08:00", close_time: "15:00" } },
        counters: null,
        locations: null,
        family_members: { id: 10, full_name: "Ahmad", relationship: "Anak", nik: "3578012345670002" },
      },
      // 3. Completed ticket in the past
      {
        id: "ticket-3",
        queue_number: "A-003",
        status: "completed",
        schedule_date: "2026-09-20",
        time_block: null,
        postponed: false,
        postponed_at: null,
        created_at: "2026-09-20T08:00:00Z",
        nik: "3578012345670001",
        family_member_id: null,
        rescheduled_from: null,
        counter_id: null,
        service_id: 1,
        location_id: 1,
        services: null,
        counters: null,
        locations: null,
        family_members: null,
      },
    ];

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({ data: mockTickets, error: null }),
    });

    const req = new NextRequest("http://localhost:3000/api/queue/my");
    const res = await getMyQueues(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.total_tickets).toBe(3);
    expect(json.active_count).toBe(1);
    expect(json.history_count).toBe(2);

    // Verifikasi tiket aktif
    expect(json.active_tickets[0].id).toBe("ticket-1");
    expect(json.active_tickets[0].can_reschedule).toBe(false);
    expect(json.active_tickets[0].is_for_family).toBe(false);

    // Verifikasi tiket hangus (skipped) hari ini
    const skippedTicket = json.history_tickets.find((t: { id: string }) => t.id === "ticket-2");
    expect(skippedTicket).toBeDefined();
    expect(skippedTicket.can_reschedule).toBe(true); // Memungkinkan tombol reschedule aktif
    expect(skippedTicket.is_for_family).toBe(true);
    expect(skippedTicket.family_member.full_name).toBe("Ahmad");
  });

  it("keeps completed tickets in active_tickets when is_reviewed is null or false, and moves to history when true", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-uuid-1" } },
      error: null,
    });

    const mockTickets = [
      // 1. Completed today with is_reviewed = null (just finished, pending review -> active)
      {
        id: "completed-null",
        queue_number: "C-001",
        status: "completed",
        schedule_date: "2026-09-28",
        time_block: null,
        postponed: false,
        postponed_at: null,
        created_at: "2026-09-28T09:00:00Z",
        nik: "3578012345670001",
        family_member_id: null,
        rescheduled_from: null,
        counter_id: 1,
        service_id: 1,
        location_id: 1,
        is_reviewed: null,
        services: null,
        counters: null,
        locations: null,
        family_members: null,
      },
      // 2. Completed yesterday with is_reviewed = false (user chose 'later' -> remains active)
      {
        id: "completed-later",
        queue_number: "C-002",
        status: "completed",
        schedule_date: "2026-09-27",
        time_block: null,
        postponed: false,
        postponed_at: null,
        created_at: "2026-09-27T09:00:00Z",
        nik: "3578012345670001",
        family_member_id: null,
        rescheduled_from: null,
        counter_id: 1,
        service_id: 1,
        location_id: 1,
        is_reviewed: false,
        services: null,
        counters: null,
        locations: null,
        family_members: null,
      },
      // 3. Completed today with is_reviewed = true (user reviewed -> moves to history)
      {
        id: "completed-reviewed",
        queue_number: "C-003",
        status: "completed",
        schedule_date: "2026-09-28",
        time_block: null,
        postponed: false,
        postponed_at: null,
        created_at: "2026-09-28T09:30:00Z",
        nik: "3578012345670001",
        family_member_id: null,
        rescheduled_from: null,
        counter_id: 1,
        service_id: 1,
        location_id: 1,
        is_reviewed: true,
        services: null,
        counters: null,
        locations: null,
        family_members: null,
      },
    ];

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({ data: mockTickets, error: null }),
    });

    const req = new NextRequest("http://localhost:3000/api/queue/my");
    const res = await getMyQueues(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.active_count).toBe(2);
    expect(json.history_count).toBe(1);

    const activeIds = json.active_tickets.map((t: { id: string }) => t.id);
    expect(activeIds).toContain("completed-null");
    expect(activeIds).toContain("completed-later");

    const historyIds = json.history_tickets.map((t: { id: string }) => t.id);
    expect(historyIds).toContain("completed-reviewed");

    // Check is_reviewed values on response
    const nullTicket = json.active_tickets.find((t: { id: string }) => t.id === "completed-null");
    expect(nullTicket.is_reviewed).toBeNull();

    const laterTicket = json.active_tickets.find((t: { id: string }) => t.id === "completed-later");
    expect(laterTicket.is_reviewed).toBe(false);

    const reviewedTicket = json.history_tickets.find((t: { id: string }) => t.id === "completed-reviewed");
    expect(reviewedTicket.is_reviewed).toBe(true);
  });
});
