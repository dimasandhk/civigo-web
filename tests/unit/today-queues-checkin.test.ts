import { describe, it, expect, vi, beforeEach } from "vitest";

const { db } = vi.hoisted(() => ({
  db: { selected: "", rows: [] as Record<string, unknown>[] },
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => {
      const query = {
        select: (columns: string) => ((db.selected = columns), query),
        eq: () => query,
        order: () => query,
        then: (resolve: (r: unknown) => unknown) =>
          Promise.resolve({ data: db.rows, error: null }).then(resolve),
      };
      return query;
    },
  }),
}));

// lib/data/admin.ts mengimpor ini di level modul; tidak dipakai getTodayQueues.
vi.mock("@/lib/auth/session", () => ({ requireOfficer: vi.fn() }));

import { getTodayQueues } from "@/lib/data/admin";

const row = (queue_number: string, status: string, checked_in_at: string | null) => ({
  id: queue_number,
  queue_number,
  status,
  time_block: null,
  schedule_date: "2026-10-07",
  counter_id: status === "served" ? 3 : null,
  location_id: 1,
  nik: null,
  postponed: false,
  postponed_at: null,
  completed_at: null,
  checked_in_at,
  counter: null,
  service: { id: 3, name: "Perpanjangan STNK Tahunan", agency_id: 2 },
  user: null,
});

describe("getTodayQueues: penanda check-in di dasbor loket", () => {
  beforeEach(() => {
    db.selected = "";
    db.rows = [];
  });

  it("selects checked_in_at so the badge can read it", async () => {
    await getTodayQueues(2, 1);
    expect(db.selected).toMatch(/\bchecked_in_at\b/);
  });

  it("keeps a served ticket marked as checked in when it has a check-in time", async () => {
    // Dulu kolom ini tidak di-select, jadi tiket yang sedang dilayani selalu "Belum Check-in".
    db.rows = [
      row("B-001", "served", "2026-10-07T01:30:00Z"),
      row("B-002", "served", null), // dipanggil tanpa pernah check-in di kios
      row("B-003", "present", null), // status present = sudah check-in
      row("B-004", "scheduled", null),
    ];

    const queues = await getTodayQueues(2, 1);
    const checkedIn = Object.fromEntries(queues.map((q) => [q.queue_number, q.is_checked_in]));

    expect(checkedIn).toEqual({ "B-001": true, "B-002": false, "B-003": true, "B-004": false });
    expect(queues[0].checked_in_at).toBe("2026-10-07T01:30:00Z");
  });
});
