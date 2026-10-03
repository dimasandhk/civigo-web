import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { GET as getReverseGeocode } from "@/app/api/locations/reverse-geocode/route";

describe("Reverse Geocode Endpoint (API Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when lat or lng is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/locations/reverse-geocode");
    const res = await getReverseGeocode(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("MISSING_COORDINATES");
  });

  it("returns 400 for out-of-range coordinates", async () => {
    const req = new NextRequest("http://localhost:3000/api/locations/reverse-geocode?lat=95&lng=107");
    const res = await getReverseGeocode(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("INVALID_COORDINATES");
  });

  it("returns city from OSM when fetch succeeds", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        display_name: "Batununggal, Kota Bandung, Jawa Barat",
        address: {
          city: "Kota Bandung",
          state: "Jawa Barat",
        },
      }),
    } as unknown as Response);

    const req = new NextRequest("http://localhost:3000/api/locations/reverse-geocode?lat=-6.9175&lng=107.6191");
    const res = await getReverseGeocode(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.city).toBe("Bandung");
    expect(json.coordinates.latitude).toBe(-6.9175);
    expect(json.coordinates.longitude).toBe(107.6191);

    global.fetch = originalFetch;
  });

  it("falls back to nearest database city when OSM fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network timeout"));

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockResolvedValueOnce({
        data: [
          { name: "Surabaya", latitude: -7.2575, longitude: 112.7521 },
          { name: "Bandung", latitude: -6.9175, longitude: 107.6191 },
        ],
        error: null,
      }),
    });

    // Koordinat dekat Bandung: -6.92, 107.62
    const req = new NextRequest("http://localhost:3000/api/locations/reverse-geocode?lat=-6.92&lng=107.62");
    const res = await getReverseGeocode(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.city).toBe("Bandung");

    global.fetch = originalFetch;
  });
});
