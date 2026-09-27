import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
  })),
}));

import { GET as getAnalyticsHandler } from "@/app/api/analytics/route";

describe("Analytics Endpoint (GET /api/analytics)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns comprehensive satisfaction and queue operational metrics", async () => {
    const mockSatisfaction = {
      total_reviews: 10,
      average_rating: 4.8,
      satisfaction_percentage: 96,
      breakdown: { star_1: 0, star_2: 0, star_3: 0, star_4: 2, star_5: 8 },
    };

    const mockQueueMetrics = {
      date: "2026-09-28",
      total_today: 25,
      waiting: 5,
      calling: 2,
      serving: 3,
      completed: 14,
      skipped: 1,
      postponed: 1,
      active_counters: 4,
      attendance_rate: 80,
    };

    mockRpc.mockImplementation((fn: string) => {
      if (fn === "get_agency_satisfaction_analytics") {
        return Promise.resolve({ data: mockSatisfaction, error: null });
      }
      if (fn === "get_agency_queue_analytics") {
        return Promise.resolve({ data: mockQueueMetrics, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Mock query services distribution
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({
        data: [{ name: "Pembuatan KTP", queues: [{ id: "q-1" }] }],
        error: null,
      }),
    });

    const req = new NextRequest("http://localhost:3000/api/analytics?agency_id=1&date=2026-09-28");
    const res = await getAnalyticsHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.agency_id).toBe(1);
    expect(json.satisfaction.average_rating).toBe(4.8);
    expect(json.queue_metrics.total_today).toBe(25);
    expect(json.queue_metrics.postponed).toBe(1);
  });
});
