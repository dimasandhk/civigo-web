import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getCities } from "@/app/api/cities/route";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe("Cities Endpoint (API Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cities from database when cities table has data", async () => {
    const mockCities = [
      { id: 1, name: "Bandung", province: "Jawa Barat", latitude: -6.9175, longitude: 107.6191 },
      { id: 2, name: "Surabaya", province: "Jawa Timur", latitude: -7.2575, longitude: 112.7521 },
    ];

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({ data: mockCities, error: null }),
    });

    const res = await getCities();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.count).toBe(2);
    expect(json.cities[0].name).toBe("Bandung");
    expect(json.cities[1].name).toBe("Surabaya");
  });

  it("falls back gracefully when database cities table is empty", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "cities") {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
        };
      }
      if (table === "locations") {
        return {
          select: vi.fn().mockResolvedValueOnce({
            data: [
              { city: "Surabaya", latitude: -7.25, longitude: 112.75 },
              { city: "Bandung", latitude: -6.91, longitude: 107.61 },
            ],
            error: null,
          }),
        };
      }
      return { select: vi.fn().mockResolvedValueOnce({ data: [], error: null }) };
    });

    const res = await getCities();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.cities.length).toBeGreaterThanOrEqual(2);
    expect(json.cities.some((c: { name: string }) => c.name === "Surabaya")).toBe(true);
  });
});
