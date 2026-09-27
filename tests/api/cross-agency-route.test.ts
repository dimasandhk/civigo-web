import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockEvaluatePrerequisites } = vi.hoisted(() => ({
  mockEvaluatePrerequisites: vi.fn(),
}));

vi.mock("@/lib/queue/cross-agency", () => ({
  evaluatePrerequisites: mockEvaluatePrerequisites,
}));

import { POST as crossAgencyHandler } from "@/app/api/services/cross-agency/route";

describe("Cross-Agency Route (POST /api/services/cross-agency)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if target_service_id is missing or non-positive", async () => {
    const req = new NextRequest("http://localhost:3000/api/services/cross-agency", {
      method: "POST",
      body: JSON.stringify({ documents: [] }),
    });

    const res = await crossAgencyHandler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("INVALID_TARGET_SERVICE_ID");
    expect(mockEvaluatePrerequisites).not.toHaveBeenCalled();
  });

  it("passes 3-state document objects to evaluatePrerequisites correctly", async () => {
    const mockEvaluation = {
      is_ready_to_book: false,
      summary: "Terdapat 1 dokumen hilang/rusak",
      total_requirements: 2,
      fulfilled_count: 1,
      missing_count: 1,
      fulfilled_documents: [{ requirement: "KTP", matched_with: "KTP Asli" }],
      missing_documents: [
        {
          requirement: "KK",
          condition: "hilang_rusak",
          requires_police_report: true,
          guidance: "Urus SKTLK di Polsek",
        },
      ],
      suggested_flow: [],
    };

    mockEvaluatePrerequisites.mockResolvedValueOnce(mockEvaluation);

    const req = new NextRequest("http://localhost:3000/api/services/cross-agency", {
      method: "POST",
      body: JSON.stringify({
        target_service_id: 4,
        documents: [
          { name: "KTP Asli", status: "sudah_tersedia" },
          { name: "Kartu Keluarga", status: "hilang_rusak" },
        ],
      }),
    });

    const res = await crossAgencyHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.evaluation.fulfilled_count).toBe(1);
    expect(json.evaluation.missing_count).toBe(1);

    expect(mockEvaluatePrerequisites).toHaveBeenCalledWith(4, [
      { name: "KTP Asli", status: "sudah_tersedia" },
      { name: "Kartu Keluarga", status: "hilang_rusak" },
    ]);
  });
});
