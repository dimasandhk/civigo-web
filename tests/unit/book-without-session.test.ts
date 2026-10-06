import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { clock, mockInsert } = vi.hoisted(() => ({
  clock: { today: "2026-10-06", nowMinutes: 10 * 60 },
  mockInsert: vi.fn(),
}));

// Kios tidak login.
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => null }));

vi.mock("@/lib/queue/time", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue/time")>();
  return {
    ...actual,
    todayInJakarta: () => clock.today,
    nowMinutesInJakarta: () => clock.nowMinutes,
  };
});

vi.mock("@/lib/queue/number", () => ({
  insertTicketWithNumber: async (_db: unknown, args: unknown) => {
    mockInsert(args);
    return { ok: true, row: { id: "ticket-1", queue_number: "B-001", status: "scheduled" } };
  },
}));

const ROWS: Record<string, unknown> = {
  users: null, // NIK belum punya akun
  services: { id: 3, name: "Perpanjangan STNK Tahunan", estimated_time: 30, agency_id: 2 },
  // Samsat: Senin–Jumat 08:00–16:00. 06/10/2026 = Selasa.
  agencies: { id: 2, name: "Samsat", open_time: "08:00", close_time: "16:00", operating_days: [1, 2, 3, 4, 5] },
  queues: null, // tidak ada booking ganda
};

// Samsat (agency 2) membuka layanan di MPP (1) dan Kantor Samsat Bandung Timur (3).
const AGENCY_LOCATIONS = [
  { agency_id: 2, location_id: 1 },
  { agency_id: 2, location_id: 3 },
];

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => ((filters[column] = value), query),
        in: () => query,
        or: () => query,
        limit: () => query,
        maybeSingle: async () => {
          if (table === "agency_locations") {
            const row = AGENCY_LOCATIONS.find(
              (r) => r.agency_id === filters.agency_id && r.location_id === filters.location_id,
            );
            return { data: row ?? null, error: null };
          }
          return { data: ROWS[table] ?? null, error: null };
        },
      };
      return query;
    },
  }),
}));

import { bookQueue } from "@/lib/queue/book";

const walkIn = (schedule_date = "2026-10-06") => ({ service_id: 3, schedule_date, nik: "3201010101010001" });
const at = (h: number, m = 0) => (clock.nowMinutes = h * 60 + m);

describe("bookQueue tanpa sesi jam (kios walk-in)", () => {
  beforeEach(() => {
    clock.today = "2026-10-06";
    // Dev server dan test sengaja melewati cek jam operasional; di sini diuji perilaku production.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_OFFHOURS_TESTING", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("issues a ticket without time_block during opening hours", async () => {
    at(10);
    const result = await bookQueue(walkIn());

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ timeBlock: null }));
    if (result.ok) expect(result.ticket.time_block).toBeNull();
  });

  it("accepts a walk-in before opening; it is served from opening time", async () => {
    at(6, 30);
    expect((await bookQueue(walkIn())).ok).toBe(true);
  });

  it("refuses when the service would finish after closing (30 min at 15:45, close 16:00)", async () => {
    at(15, 45);
    const result = await bookQueue(walkIn());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.code).toBe("SERVICE_EXCEEDS_CLOSING");
      expect(result.message).toContain("tutup pukul 16:00");
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("refuses after closing time", async () => {
    at(16, 30);
    const result = await bookQueue(walkIn());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("OUTSIDE_OPERATING_HOURS");
      expect(result.message).toBe("Samsat sudah tutup hari ini (jam operasional 08:00 - 16:00).");
    }
  });

  it("does not apply the clock to a future date", async () => {
    at(23);
    expect((await bookQueue(walkIn("2026-10-07"))).ok).toBe(true);
  });

  it("still refuses a future date when the agency is closed that day", async () => {
    const result = await bookQueue(walkIn("2026-10-10")); // Sabtu
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("AGENCY_CLOSED");
  });

  it("skips the opening-hours check in development (ALLOW_OFFHOURS_TESTING / next dev)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    at(23);
    expect((await bookQueue(walkIn())).ok).toBe(true);
  });
});

describe("bookQueue: cabang kios dan jam operasional di production", () => {
  beforeEach(() => {
    clock.today = "2026-10-06";
    at(10);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_OFFHOURS_TESTING", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("records the ticket at the kiosk's branch", async () => {
    const result = await bookQueue({ ...walkIn(), location_id: 3 });
    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ locationId: 3 }));
  });

  it("keeps the MPP default (location 1) for clients that send no location_id", async () => {
    await bookQueue(walkIn());
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ locationId: 1 }));
  });

  it("refuses a branch where the agency has no service (Samsat at Kantor Disdukcapil)", async () => {
    const result = await bookQueue({ ...walkIn(), location_id: 2 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.code).toBe("AGENCY_NOT_AT_LOCATION");
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("no longer lets a session from 18:00 skip the hours check", async () => {
    const result = await bookQueue({ ...walkIn("2026-10-07"), time_block: "19:00 - 20:00" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("OUTSIDE_OPERATING_HOURS");
  });

  it("no longer lets a booking for today on a closed day skip the hours check", async () => {
    clock.today = "2026-10-10"; // Sabtu, Samsat libur
    const result = await bookQueue(walkIn("2026-10-10"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("AGENCY_CLOSED");
  });

  it("still allows both when ALLOW_OFFHOURS_TESTING is on", async () => {
    vi.stubEnv("ALLOW_OFFHOURS_TESTING", "true");
    clock.today = "2026-10-10";
    expect((await bookQueue(walkIn("2026-10-10"))).ok).toBe(true);
  });
});
