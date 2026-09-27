import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";

type Op = "select" | "insert" | "update" | "delete";

type Call = {
  table: string;
  op: Op;
  payload?: unknown;
  filters: [string, unknown][];
};

type Result = { data?: unknown; error?: { message: string } | null; count?: number | null };

const { mockRequireOfficer, mockResolveAgencyId, mockRevalidatePath, db } = vi.hoisted(() => {
  const db = {
    calls: [] as Call[],
    respond: (() => ({ data: null, error: null })) as (call: Call) => Result,
  };
  return {
    mockRequireOfficer: vi.fn(),
    mockResolveAgencyId: vi.fn(),
    mockRevalidatePath: vi.fn(),
    db,
  };
});

/** Chainable stand-in for the supabase-js query builder; records every awaited query. */
function fakeQuery(table: string) {
  const call: Call = { table, op: "select", filters: [] };
  const query = {
    select: () => query,
    insert: (payload: unknown) => ((call.op = "insert"), (call.payload = payload), query),
    update: (payload: unknown) => ((call.op = "update"), (call.payload = payload), query),
    delete: () => ((call.op = "delete"), query),
    eq: (column: string, value: unknown) => (call.filters.push([column, value]), query),
    maybeSingle: () => query,
    then: (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) => {
      db.calls.push(call);
      return Promise.resolve(db.respond(call)).then(resolve, reject);
    },
  };
  return query;
}

vi.mock("@/lib/auth/session", () => ({ requireOfficer: mockRequireOfficer }));
vi.mock("@/lib/data/admin", () => ({ resolveAgencyId: mockResolveAgencyId }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: (table: string) => fakeQuery(table) }),
}));

import {
  createCounterAction,
  deleteCounterAction,
  toggleCounterStatusAction,
  updateCounterNameAction,
} from "@/lib/data/counter-actions";

const disdukcapilMpp = { role: "instansi", agency_id: 1, location_id: 1 };

const writes = () => db.calls.filter((c) => c.op !== "select");
const counterLookup = () => db.calls.find((c) => c.table === "counters" && c.op === "select");

/** Counter 3 belongs to Samsat; the Disdukcapil officer's scoped lookup finds nothing. */
function counterExists(found: boolean, queueCount = 0) {
  db.respond = (call) => {
    if (call.table === "counters" && call.op === "select") {
      return { data: found ? { id: 1, counter_name: "Loket 1", status: "active" } : null, error: null };
    }
    if (call.table === "queues") return { count: queueCount, error: null };
    return { data: null, error: null };
  };
}

describe("counter actions (/admin/loket)", () => {
  beforeEach(() => {
    db.calls = [];
    db.respond = () => ({ data: null, error: null });
    mockRequireOfficer.mockResolvedValue(disdukcapilMpp);
  });

  describe("ownership scope", () => {
    it("looks the counter up inside the officer's agency and branch", async () => {
      counterExists(true);

      await toggleCounterStatusAction(1, "aktif");

      expect(counterLookup()?.filters).toEqual([
        ["id", 1],
        ["agency_id", 1],
        ["location_id", 1],
      ]);
    });

    it("drops the branch filter for an account without location_id, like the page does", async () => {
      mockRequireOfficer.mockResolvedValue({ ...disdukcapilMpp, location_id: null });
      counterExists(true);

      await toggleCounterStatusAction(1, "aktif");

      expect(counterLookup()?.filters).toEqual([
        ["id", 1],
        ["agency_id", 1],
      ]);
    });

    it("scopes a super_admin (no agency_id) to the agency the page shows", async () => {
      mockRequireOfficer.mockResolvedValue({ role: "super_admin", agency_id: null, location_id: null });
      mockResolveAgencyId.mockResolvedValue(2);
      counterExists(true);

      await updateCounterNameAction(1, "Loket A");

      expect(counterLookup()?.filters).toContainEqual(["agency_id", 2]);
    });

    it.each([
      ["toggle", () => toggleCounterStatusAction(3, "aktif")],
      ["rename", () => updateCounterNameAction(3, "Loket Palsu")],
      ["delete", () => deleteCounterAction(3)],
    ])("refuses to %s a counter from another agency or branch without writing", async (_, run) => {
      counterExists(false);

      const res = await run();

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/tidak ditemukan/);
      expect(writes()).toHaveLength(0);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("toggleCounterStatusAction", () => {
    it("flips the status of an owned counter, filtered by id and agency", async () => {
      counterExists(true);

      const res = await toggleCounterStatusAction(1, "aktif");

      expect(res.ok).toBe(true);
      expect(writes()).toEqual([
        {
          table: "counters",
          op: "update",
          payload: { status: "inactive" },
          filters: [
            ["id", 1],
            ["agency_id", 1],
          ],
        },
      ]);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/loket");
    });

    it.each([
      [Number.NaN, "aktif"],
      [-1, "aktif"],
      [1.5, "aktif"],
      ["1", "aktif"],
      [1, "open"],
    ])("rejects bad input (%s, %s) without touching the database", async (id, status) => {
      const res = await toggleCounterStatusAction(id as number, status as "aktif");

      expect(res.ok).toBe(false);
      expect(db.calls).toHaveLength(0);
    });
  });

  describe("createCounterAction", () => {
    it("creates the counter in the officer's own agency and branch", async () => {
      mockRequireOfficer.mockResolvedValue({ role: "instansi", agency_id: 2, location_id: 3 });

      const res = await createCounterAction("  Loket 9  ");

      expect(res.ok).toBe(true);
      expect(writes()).toEqual([
        {
          table: "counters",
          op: "insert",
          payload: { counter_name: "Loket 9", agency_id: 2, location_id: 3, status: "active" },
          filters: [],
        },
      ]);
    });

    it("refuses instead of silently placing the counter at location 1 when the account has no branch", async () => {
      mockRequireOfficer.mockResolvedValue({ ...disdukcapilMpp, location_id: null });

      const res = await createCounterAction("Loket 9");

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/lokasi cabang/);
      expect(db.calls).toHaveLength(0);
    });

    it("rejects an empty name", async () => {
      const res = await createCounterAction("   ");

      expect(res.ok).toBe(false);
      expect(db.calls).toHaveLength(0);
    });
  });

  describe("updateCounterNameAction", () => {
    it("renames an owned counter", async () => {
      counterExists(true);

      const res = await updateCounterNameAction(1, " Loket Prioritas ");

      expect(res.ok).toBe(true);
      expect(writes()).toEqual([
        {
          table: "counters",
          op: "update",
          payload: { counter_name: "Loket Prioritas" },
          filters: [
            ["id", 1],
            ["agency_id", 1],
          ],
        },
      ]);
    });
  });

  describe("deleteCounterAction", () => {
    it("hard-deletes an owned counter with no queue history", async () => {
      counterExists(true, 0);

      const res = await deleteCounterAction(1);

      expect(res.ok).toBe(true);
      expect(res.message).toMatch(/dihapus/);
      expect(writes()).toEqual([
        {
          table: "counters",
          op: "delete",
          filters: [
            ["id", 1],
            ["agency_id", 1],
          ],
        },
      ]);
    });

    it("deactivates instead of deleting when the counter has queue history", async () => {
      counterExists(true, 5);

      const res = await deleteCounterAction(1);

      expect(res.ok).toBe(true);
      expect(res.message).toMatch(/Nonaktif/);
      expect(writes()).toEqual([
        expect.objectContaining({ op: "update", payload: { status: "inactive" } }),
      ]);
    });

    it("does not delete when the queue-history check fails", async () => {
      db.respond = (call) =>
        call.table === "queues"
          ? { count: null, error: { message: "timeout" } }
          : { data: { id: 1, counter_name: "Loket 1", status: "active" }, error: null };

      const res = await deleteCounterAction(1);

      expect(res.ok).toBe(false);
      expect(writes()).toHaveLength(0);
    });
  });

  it("lets the login redirect through instead of reporting NEXT_REDIRECT as an error", async () => {
    mockRequireOfficer.mockImplementation(() => redirect("/"));

    await expect(toggleCounterStatusAction(1, "aktif")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(db.calls).toHaveLength(0);
  });
});
