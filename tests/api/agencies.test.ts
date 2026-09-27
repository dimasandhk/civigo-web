import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { GET as getAgencies } from "@/app/api/agencies/route";
import { GET as getAgencyById } from "@/app/api/agencies/[id]/route";

describe("Agencies Endpoints (API Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/agencies", () => {
    it("returns list of agencies with locations and services mapped", async () => {
      const mockAgencies = [
        {
          id: 1,
          name: "Dinas Kependudukan dan Pencatatan Sipil",
          description: "Layanan Kependudukan",
          open_time: "08:00",
          close_time: "15:00",
          operating_days: [1, 2, 3, 4, 5],
        },
      ];

      const mockAgencyLocations = [
        {
          agency_id: 1,
          location_id: 1,
          locations: {
            id: 1,
            name: "MPP Siola",
            address: "Jl. Tunjungan No. 1",
            city: "Surabaya",
            latitude: -7.25,
            longitude: 112.73,
            type: "MPP",
          },
        },
      ];

      const mockServices = [
        { id: 1, agency_id: 1, name: "Pembuatan KTP", estimated_time: 15 },
        { id: 2, agency_id: 1, name: "Cetak KK", estimated_time: 20 },
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "agencies") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValueOnce({ data: mockAgencies, error: null }),
          };
        }
        if (table === "agency_locations") {
          return {
            select: vi.fn().mockResolvedValueOnce({ data: mockAgencyLocations, error: null }),
          };
        }
        if (table === "services") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValueOnce({ data: mockServices, error: null }),
          };
        }
        return { select: vi.fn().mockResolvedValueOnce({ data: [], error: null }) };
      });

      const req = new NextRequest("http://localhost:3000/api/agencies");
      const res = await getAgencies(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.count).toBe(1);
      expect(json.agencies[0].name).toBe("Dinas Kependudukan dan Pencatatan Sipil");
      expect(json.agencies[0].locations.length).toBe(1);
      expect(json.agencies[0].services_count).toBe(2);
    });

    it("filters agencies by location_id when provided", async () => {
      const mockAgencies = [
        { id: 1, name: "Disdukcapil", open_time: "08:00", close_time: "15:00", operating_days: [1, 2] },
        { id: 2, name: "Samsat", open_time: "08:00", close_time: "15:00", operating_days: [1, 2] },
      ];

      // Disdukcapil ada di location 1, Samsat hanya di location 2
      const mockAgencyLocations = [
        { agency_id: 1, location_id: 1, locations: { id: 1, name: "MPP", address: "A", city: "S", latitude: 0, longitude: 0, type: "MPP" } },
        { agency_id: 2, location_id: 2, locations: { id: 2, name: "Induk", address: "B", city: "S", latitude: 0, longitude: 0, type: "Induk" } },
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "agencies") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValueOnce({ data: mockAgencies, error: null }),
          };
        }
        if (table === "agency_locations") {
          return {
            select: vi.fn().mockResolvedValueOnce({ data: mockAgencyLocations, error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValueOnce({ data: [], error: null }) };
      });

      const req = new NextRequest("http://localhost:3000/api/agencies?location_id=1");
      const res = await getAgencies(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.count).toBe(1);
      expect(json.agencies[0].name).toBe("Disdukcapil");
    });
  });

  describe("GET /api/agencies/[id]", () => {
    it("returns 400 for invalid agency id", async () => {
      const req = new NextRequest("http://localhost:3000/api/agencies/abc");
      const res = await getAgencyById(req, {
        params: Promise.resolve({ id: "abc" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("INVALID_AGENCY_ID");
    });

    it("returns 404 when agency is not found", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
      });

      const req = new NextRequest("http://localhost:3000/api/agencies/999");
      const res = await getAgencyById(req, {
        params: Promise.resolve({ id: "999" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("AGENCY_NOT_FOUND");
    });

    it("returns 200 with locations, services, and counters for valid agency", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "agencies") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: { id: 1, name: "Disdukcapil", open_time: "08:00", close_time: "15:00", operating_days: [1, 2] },
              error: null,
            }),
          };
        }
        if (table === "agency_locations") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValueOnce({
              data: [{ location_id: 1, locations: { id: 1, name: "MPP", address: "A", city: "S", latitude: 0, longitude: 0, type: "MPP" } }],
              error: null,
            }),
          };
        }
        if (table === "services") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValueOnce({
              data: [{ id: 1, name: "KTP", estimated_time: 15, requirements: [], output_documents: [] }],
              error: null,
            }),
          };
        }
        if (table === "counters") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValueOnce({
              data: [{ id: 1, counter_name: "Loket 1", status: "active", location_id: 1 }],
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const req = new NextRequest("http://localhost:3000/api/agencies/1");
      const res = await getAgencyById(req, {
        params: Promise.resolve({ id: "1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.agency.name).toBe("Disdukcapil");
      expect(json.agency.services.length).toBe(1);
      expect(json.agency.counters.length).toBe(1);
    });
  });
});
