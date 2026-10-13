import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, unknown> & { id: string };

/**
 * In-memory stand-in for the `queues` table. Rows already carry their joined
 * objects (service, counter, location, family_member), so `select()` columns are
 * ignored; filters, ordering, limits and updates are applied for real.
 */
const { store, clock } = vi.hoisted(() => {
  const store = {
    rows: [] as Row[],
    /** Runs just before an update is applied — used to simulate a counter calling a ticket mid-request. */
    beforeUpdate: null as null | (() => void),
  };

  return { store, clock: { today: "2026-10-12" } };
});

vi.mock("@/lib/queue/time", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue/time")>();
  return { ...actual, todayInJakarta: () => clock.today };
});

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => {
      const filters: ((row: Row) => boolean)[] = [];
      let update: Record<string, unknown> | null = null;
      let returning = false;
      let order: { column: string; ascending: boolean } | null = null;
      let limit = Infinity;

      const run = () => {
        let matched = store.rows.filter((row) => filters.every((f) => f(row)));

        if (update) {
          store.beforeUpdate?.();
          matched = store.rows.filter((row) => filters.every((f) => f(row)));
          for (const row of matched) Object.assign(row, update);
          return { data: returning ? matched.map((r) => ({ id: r.id })) : null, error: null };
        }

        if (order) {
          const { column, ascending } = order;
          matched = [...matched].sort(
            (a, b) => String(a[column]).localeCompare(String(b[column])) * (ascending ? 1 : -1),
          );
        }
        return { data: matched.slice(0, limit).map((r) => ({ ...r })), error: null };
      };

      const query = {
        select: () => ((returning = true), query),
        update: (payload: Record<string, unknown>) => ((update = payload), query),
        eq: (column: string, value: unknown) => (filters.push((r) => r[column] === value), query),
        in: (column: string, values: unknown[]) => (filters.push((r) => values.includes(r[column])), query),
        is: (column: string, value: unknown) => (filters.push((r) => (r[column] ?? null) === value), query),
        gt: (column: string, value: string) => (filters.push((r) => String(r[column]) > value), query),
        order: (column: string, opts: { ascending: boolean }) => ((order = { column, ...opts }), query),
        limit: (n: number) => ((limit = n), query),
        then: (resolve: (r: unknown) => unknown) => Promise.resolve(run()).then(resolve),
      };
      return query;
    },
  }),
}));

import { checkInQueue, normalizeQueueNumber } from "@/lib/queue/check-in";

const NIK = "3273010101010001";
const MPP = 1;
const SAMSAT_TIMUR = 3;

const LOCATIONS: Record<number, string> = {
  [MPP]: "MPP Grha Sawala",
  [SAMSAT_TIMUR]: "Kantor Samsat Bandung Timur",
};

function ticket(overrides: Partial<Row> & { id: string; queue_number: string }): Row {
  const locationId = (overrides.location_id as number | undefined) ?? MPP;
  return {
    nik: NIK,
    schedule_date: clock.today,
    time_block: null,
    status: "scheduled",
    location_id: locationId,
    checked_in_at: null,
    counter: null,
    service: { name: "Perpanjangan STNK Tahunan", agency: { name: "Samsat" } },
    location: { name: LOCATIONS[locationId] },
    family_member: null,
    ...overrides,
  };
}

const row = (id: string) => store.rows.find((r) => r.id === id)!;

beforeEach(() => {
  store.rows = [];
  store.beforeUpdate = null;
});

describe("checkInQueue: NIK", () => {
  it("checks in every ticket the NIK holds today at the kiosk branch, and nothing else", async () => {
    store.rows = [
      ticket({ id: "t1", queue_number: "C-02" }),
      ticket({
        id: "t2",
        queue_number: "A-05",
        service: { name: "Cetak KTP-el", agency: { name: "Disdukcapil" } },
        family_member: { full_name: "Siti Aminah" },
      }),
      ticket({ id: "other-branch", queue_number: "C-03", location_id: SAMSAT_TIMUR }),
      ticket({ id: "tomorrow", queue_number: "C-01", schedule_date: "2026-10-13" }),
      ticket({ id: "someone-else", queue_number: "C-04", nik: "3273010101010002" }),
    ];

    const result = await checkInQueue({ code: NIK, location_id: MPP });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.checkedInCount).toBe(2);
    expect(result.tickets.map((t) => [t.queue_number, t.outcome, t.status])).toEqual([
      ["A-05", "checked_in", "present"],
      ["C-02", "checked_in", "present"],
    ]);
    expect(result.tickets[0].family_member_name).toBe("Siti Aminah");
    expect(result.message).toBe("Check-in berhasil untuk 2 antrean. Silakan menunggu panggilan di ruang tunggu.");

    expect(row("t1")).toMatchObject({ status: "present", checked_in_at: expect.any(String) });
    expect(row("t2")).toMatchObject({ status: "present", checked_in_at: expect.any(String) });
    for (const id of ["other-branch", "tomorrow", "someone-else"]) {
      expect(row(id)).toMatchObject({ status: "scheduled", checked_in_at: null });
    }
  });

  it("finds today's ticket even when the NIK has many later bookings", async () => {
    // Dulu: urut tanggal terbaru, limit 3 -> tiket hari ini tidak terambil.
    store.rows = [
      ticket({ id: "d1", queue_number: "C-01", schedule_date: "2026-10-13" }),
      ticket({ id: "d2", queue_number: "C-01", schedule_date: "2026-10-14" }),
      ticket({ id: "d3", queue_number: "C-01", schedule_date: "2026-10-15" }),
      ticket({ id: "today", queue_number: "C-07" }),
    ];

    const result = await checkInQueue({ code: NIK, location_id: MPP });

    expect(result.ok && result.tickets.map((t) => t.id)).toEqual(["today"]);
    expect(row("today").status).toBe("present");
  });

  it("accepts a NIK typed in groups", async () => {
    store.rows = [ticket({ id: "t1", queue_number: "C-02" })];

    const result = await checkInQueue({ code: "3273 0101 0101 0001", location_id: MPP });

    expect(result.ok).toBe(true);
  });

  it("names the branch when today's tickets are all at another branch", async () => {
    store.rows = [ticket({ id: "t1", queue_number: "C-02", location_id: SAMSAT_TIMUR })];

    const result = await checkInQueue({ code: NIK, location_id: MPP });

    expect(result).toMatchObject({ ok: false, status: 422, code: "WRONG_LOCATION" });
    expect(!result.ok && result.message).toContain("Kantor Samsat Bandung Timur");
    expect(row("t1").status).toBe("scheduled");
  });

  it("points to the next booking date when there is none today", async () => {
    store.rows = [ticket({ id: "t1", queue_number: "C-02", schedule_date: "2026-10-15" })];

    const result = await checkInQueue({ code: NIK, location_id: MPP });

    expect(result).toMatchObject({ ok: false, code: "DATE_MISMATCH" });
    expect(!result.ok && result.message).toContain("15/10/2026");
  });

  it("returns not found for an unknown NIK", async () => {
    const result = await checkInQueue({ code: NIK, location_id: MPP });
    expect(result).toMatchObject({ ok: false, status: 404, code: "TICKET_NOT_FOUND" });
  });

  it("lists the ticket being called first and records the arrival without changing its status", async () => {
    store.rows = [
      ticket({ id: "waiting", queue_number: "A-01" }),
      ticket({ id: "called", queue_number: "C-02", status: "served", counter: { counter_name: "Loket 3" } }),
      ticket({ id: "done", queue_number: "B-01", status: "completed" }),
    ];

    const result = await checkInQueue({ code: NIK, location_id: MPP });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tickets.map((t) => [t.queue_number, t.outcome])).toEqual([
      ["C-02", "being_served"],
      ["A-01", "checked_in"],
      ["B-01", "completed"],
    ]);
    expect(result.message).toContain("C-02 sedang dipanggil di Loket 3");
    expect(row("called")).toMatchObject({ status: "served", checked_in_at: expect.any(String) });
  });

  it("does not overwrite an earlier check-in time on a served ticket", async () => {
    store.rows = [
      ticket({ id: "called", queue_number: "C-02", status: "served", checked_in_at: "2026-10-12T01:00:00Z" }),
    ];

    await checkInQueue({ code: NIK, location_id: MPP });

    expect(row("called").checked_in_at).toBe("2026-10-12T01:00:00Z");
  });

  it("reports nothing newly checked in when every ticket was already present", async () => {
    store.rows = [ticket({ id: "t1", queue_number: "C-02", status: "present", checked_in_at: "2026-10-12T01:00:00Z" })];

    const result = await checkInQueue({ code: NIK, location_id: MPP });

    expect(result).toMatchObject({ ok: true, checkedInCount: 0 });
    expect(result.ok && result.tickets[0].outcome).toBe("already_checked_in");
    expect(row("t1").checked_in_at).toBe("2026-10-12T01:00:00Z");
  });

  it("refuses when every ticket today is finished", async () => {
    store.rows = [
      ticket({ id: "t1", queue_number: "C-02", status: "completed" }),
      ticket({ id: "t2", queue_number: "A-01", status: "skipped" }),
    ];

    const result = await checkInQueue({ code: NIK, location_id: MPP });

    expect(result).toMatchObject({ ok: false, status: 422, code: "NO_ACTIVE_TICKET" });
    expect(!result.ok && result.message).toContain("A-01 (hangus), C-02 (selesai)");
  });

  it("does not report a ticket called mid-request as checked in", async () => {
    store.rows = [ticket({ id: "t1", queue_number: "C-02" }), ticket({ id: "t2", queue_number: "C-05" })];
    store.beforeUpdate = () => {
      Object.assign(row("t2"), { status: "served", counter: { counter_name: "Loket 1" } });
      store.beforeUpdate = null;
    };

    const result = await checkInQueue({ code: NIK, location_id: MPP });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.checkedInCount).toBe(1);
    expect(result.tickets.map((t) => [t.queue_number, t.outcome])).toEqual([
      ["C-05", "being_served"],
      ["C-02", "checked_in"],
    ]);
  });
});

describe("checkInQueue: queue number and ticket id", () => {
  it("checks in only the named ticket, even when the NIK holds others", async () => {
    store.rows = [
      ticket({ id: "t1", queue_number: "C-02" }),
      ticket({ id: "t2", queue_number: "A-05" }),
      ticket({ id: "old", queue_number: "C-02", schedule_date: "2026-10-01" }),
    ];

    const result = await checkInQueue({ code: "c2", location_id: MPP });

    expect(result.ok && result.tickets.map((t) => t.id)).toEqual(["t1"]);
    expect(result.ok && result.message).toBe(
      "Check-in berhasil! Nomor antrean Anda adalah C-02. Silakan menunggu panggilan di ruang tunggu.",
    );
    expect(row("t2").status).toBe("scheduled");
  });

  it("refuses a ticket id from another day", async () => {
    const id = "6f1f0c2e-4b1a-4c55-9a51-1f2d3c4b5a69";
    store.rows = [ticket({ id, queue_number: "C-02", schedule_date: "2026-10-14" })];

    const result = await checkInQueue({ code: id, location_id: MPP });

    expect(result).toMatchObject({ ok: false, code: "DATE_MISMATCH" });
    expect(row(id).status).toBe("scheduled");
  });

  it("refuses a ticket id from another branch", async () => {
    const id = "6f1f0c2e-4b1a-4c55-9a51-1f2d3c4b5a69";
    store.rows = [ticket({ id, queue_number: "C-02", location_id: SAMSAT_TIMUR })];

    const result = await checkInQueue({ code: id, location_id: MPP });

    expect(result).toMatchObject({ ok: false, code: "WRONG_LOCATION" });
  });

  it("skips the branch check when no location_id is sent", async () => {
    store.rows = [ticket({ id: "t1", queue_number: "C-02", location_id: SAMSAT_TIMUR })];

    const result = await checkInQueue({ code: "C-02" });

    expect(result).toMatchObject({ ok: true, checkedInCount: 1 });
  });
});

describe("checkInQueue: input", () => {
  it("requires a code", async () => {
    expect(await checkInQueue({ code: "  " })).toMatchObject({ ok: false, status: 400, code: "CODE_REQUIRED" });
  });

  it("accepts ticket_id as fallback to code", async () => {
    const id = "6f1f0c2e-4b1a-4c55-9a51-1f2d3c4b5a69";
    store.rows = [ticket({ id, queue_number: "A-01" })];
    const res = await checkInQueue({ ticket_id: id });
    expect(res).toMatchObject({ ok: true, checkedInCount: 1 });
  });

  it("rejects a malformed location_id", async () => {
    expect(await checkInQueue({ code: NIK, location_id: "abc" })).toMatchObject({
      ok: false,
      status: 400,
      code: "INVALID_LOCATION",
    });
  });

  it("normalizes typed queue numbers", () => {
    expect(normalizeQueueNumber("a1")).toBe("A-01");
    expect(normalizeQueueNumber("B07")).toBe("B-07");
    expect(normalizeQueueNumber("c-112")).toBe("C-112");
    expect(normalizeQueueNumber("xyz")).toBe("XYZ");
  });
});
