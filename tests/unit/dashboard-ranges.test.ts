import { describe, it, expect, vi, beforeEach } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    rows: [] as { status: string }[],
    filters: [] as [string, string, unknown][],
  },
}));

vi.mock("@/lib/queue/time", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue/time")>();
  return { ...actual, todayInJakarta: () => "2026-10-08" }; // Kamis
});

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: (col: string, val: unknown) => (db.filters.push(["eq", col, val]), query),
        gte: (col: string, val: unknown) => (db.filters.push(["gte", col, val]), query),
        lte: (col: string, val: unknown) => (db.filters.push(["lte", col, val]), query),
        then: (resolve: (r: unknown) => unknown) => Promise.resolve({ data: db.rows, error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

// lib/data/admin.ts mengimpor ini di level modul; tidak dipakai getQueueOutcome.
vi.mock("@/lib/auth/session", () => ({ requireOfficer: vi.fn() }));

import { dateRangeBounds, parseDateRange } from "@/lib/queue/time";
import { getQueueOutcome } from "@/lib/data/admin";

describe("dateRangeBounds (Beranda: Hari ini / Minggu ini / Bulan ini)", () => {
  it.each([
    ["hari-ini", "2026-10-08", { from: "2026-10-08", to: "2026-10-08" }],
    ["minggu-ini", "2026-10-08", { from: "2026-10-05", to: "2026-10-08" }], // Kamis -> Senin
    ["minggu-ini", "2026-10-05", { from: "2026-10-05", to: "2026-10-05" }], // Senin
    ["minggu-ini", "2026-10-11", { from: "2026-10-05", to: "2026-10-11" }], // Minggu masih minggu yang sama
    ["minggu-ini", "2026-10-01", { from: "2026-09-28", to: "2026-10-01" }], // melewati batas bulan
    ["bulan-ini", "2026-10-08", { from: "2026-10-01", to: "2026-10-08" }],
  ] as const)("%s pada %s", (range, today, expected) => {
    expect(dateRangeBounds(range, today)).toEqual(expected);
  });
});

describe("parseDateRange", () => {
  it("accepts known values and falls back for anything else", () => {
    expect(parseDateRange("bulan-ini", "hari-ini")).toBe("bulan-ini");
    expect(parseDateRange(["minggu-ini", "x"], "hari-ini")).toBe("minggu-ini");
    expect(parseDateRange(undefined, "minggu-ini")).toBe("minggu-ini");
    expect(parseDateRange("tahun-ini", "hari-ini")).toBe("hari-ini");
  });
});

describe("getQueueOutcome (Tingkat Kehadiran & Antrean Hangus)", () => {
  beforeEach(() => {
    db.rows = [];
    db.filters = [];
  });

  it("counts present/served/completed as attended and ignores tickets still scheduled", async () => {
    db.rows = [
      { status: "completed" },
      { status: "completed" },
      { status: "served" },
      { status: "present" },
      { status: "skipped" },
      { status: "scheduled" }, // belum datang: belum ada hasil
      { status: "scheduled" },
    ];

    const outcome = await getQueueOutcome(2, 1, "hari-ini");

    // 4 hadir dari 5 yang sudah ada hasilnya = 80%. Rumus lama: (7 - 1) / 7 = 86%.
    expect(outcome).toEqual({ attended: 4, skipped: 1, attendanceRate: 80 });
  });

  it("returns null rate when nothing has an outcome yet", async () => {
    db.rows = [{ status: "scheduled" }];
    expect((await getQueueOutcome(2, 1, "hari-ini")).attendanceRate).toBeNull();
  });

  it("filters by the range's dates, agency, and branch", async () => {
    await getQueueOutcome(2, 3, "minggu-ini");
    expect(db.filters).toEqual(
      expect.arrayContaining([
        ["eq", "service.agency_id", 2],
        ["gte", "schedule_date", "2026-10-05"],
        ["lte", "schedule_date", "2026-10-08"],
        ["eq", "location_id", 3],
      ]),
    );
  });
});
