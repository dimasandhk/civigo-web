import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockEvaluatePrerequisites, mockGetServiceRequirements } = vi.hoisted(() => ({
  mockEvaluatePrerequisites: vi.fn(),
  mockGetServiceRequirements: vi.fn(),
}));

vi.mock("@/lib/queue/cross-agency", () => ({
  evaluatePrerequisites: mockEvaluatePrerequisites,
  getServiceRequirements: mockGetServiceRequirements,
}));

import { POST as crossAgencyHandler } from "@/app/api/services/cross-agency/route";
import { GET as prerequisitesHandler } from "@/app/api/services/[id]/prerequisites/route";

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

  it("handles simultaneous documents, owned_documents, and conditions correctly", async () => {
    mockEvaluatePrerequisites.mockResolvedValueOnce({
      is_ready_to_book: true,
      summary: "Semua syarat terpenuhi",
      total_requirements: 3,
      fulfilled_count: 3,
      missing_count: 0,
      fulfilled_documents: [],
      missing_documents: [],
      suggested_flow: [],
    });

    const req = new NextRequest("http://localhost:3000/api/services/cross-agency", {
      method: "POST",
      body: JSON.stringify({
        target_service_id: 1,
        documents: [
          { name: "Kartu Keluarga", status: "hilang_rusak" },
        ],
        owned_documents: ["KTP Asli"],
        conditions: [
          { name: "Berusia 17 Tahun", status: "ya" },
        ],
      }),
    });

    const res = await crossAgencyHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockEvaluatePrerequisites).toHaveBeenCalledWith(1, [
      { name: "Kartu Keluarga", status: "hilang_rusak" },
      "KTP Asli",
      { name: "Berusia 17 Tahun", status: "ya" },
    ]);
  });

  describe("GET /api/services/[id]/prerequisites (Concise Mobile Requirements Output)", () => {
    it("returns concise requirements list with name, agency_id, and type ('dokumen' | 'kondisi')", async () => {
      mockGetServiceRequirements.mockResolvedValueOnce({
        service_id: 1,
        service_name: "Pembuatan KTP Baru",
        agency_id: 1,
        requirements: [
          { name: "Fotokopi KK", agency_id: 1, type: "dokumen" },
          { name: "Surat Pengantar RT/RW", agency_id: 1, type: "dokumen" },
          { name: "Berusia 17 Tahun", agency_id: 1, type: "kondisi" },
        ],
      });

      mockEvaluatePrerequisites.mockResolvedValueOnce({
        is_ready_to_book: false,
        total_requirements: 3,
        fulfilled_count: 0,
        missing_count: 3,
        fulfilled_documents: [],
        missing_documents: [],
        suggested_flow: [],
      });

      const req = new NextRequest("http://localhost:3000/api/services/1/prerequisites");
      const res = await prerequisitesHandler(req, { params: Promise.resolve({ id: "1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.service_id).toBe(1);
      expect(json.is_ready_to_book).toBe(false);

      // Pastikan format ringkas untuk Mobile App tersedia tepat sesuai kebutuhan
      expect(json.requirements).toHaveLength(3);
      expect(json.requirements[0]).toEqual({
        name: "Fotokopi KK",
        agency_id: 1,
        type: "dokumen",
      });
      expect(json.requirements[2]).toEqual({
        name: "Berusia 17 Tahun",
        agency_id: 1,
        type: "kondisi",
      });
    });

    it("returns 404 if service does not exist", async () => {
      mockGetServiceRequirements.mockResolvedValueOnce(null);
      mockEvaluatePrerequisites.mockResolvedValueOnce({ is_ready_to_book: false });

      const req = new NextRequest("http://localhost:3000/api/services/999/prerequisites");
      const res = await prerequisitesHandler(req, { params: Promise.resolve({ id: "999" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("SERVICE_NOT_FOUND");
    });
  });
});

