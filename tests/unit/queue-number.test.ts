import { describe, it, expect, vi } from "vitest";
import { insertTicketWithNumber, queuePrefix } from "@/lib/queue/number";

describe("queuePrefix", () => {
  it("maps serviceId 1 to A, 2 to B, 26 to Z", () => {
    expect(queuePrefix(1)).toBe("A");
    expect(queuePrefix(2)).toBe("B");
    expect(queuePrefix(26)).toBe("Z");
  });

  it("wraps around after 26", () => {
    expect(queuePrefix(27)).toBe("A");
  });
});

describe("insertTicketWithNumber — scoping per location", () => {
  it("allocates A-01 independently for different branches on the same date and service", async () => {
    // Simulasi tabel database in-memory
    const dbRows: Array<{
      id: string;
      service_id: number;
      location_id: number;
      schedule_date: string;
      queue_number: string;
      status: string;
    }> = [];

    const mockDb = {
      from: (_table: string) => {
        let filterDate: string | null = null;
        let filterService: number | null = null;
        let filterLocation: number | null = null;

        const query = {
          select: () => query,
          eq: (col: string, val: unknown) => {
            if (col === "schedule_date") filterDate = val as string;
            if (col === "service_id") filterService = val as number;
            if (col === "location_id") filterLocation = val as number;
            return query;
          },
          then: (resolve: (val: unknown) => void) => {
            const matches = dbRows.filter(
              (r) =>
                r.schedule_date === filterDate &&
                r.service_id === filterService &&
                r.location_id === filterLocation,
            );
            resolve({ data: matches.map((m) => ({ queue_number: m.queue_number })), error: null });
          },
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                const row = {
                  id: `ticket-${dbRows.length + 1}`,
                  service_id: payload.service_id as number,
                  location_id: payload.location_id as number,
                  schedule_date: payload.schedule_date as string,
                  queue_number: payload.queue_number as string,
                  status: payload.status as string,
                };
                dbRows.push(row);
                return { data: row, error: null };
              },
            }),
          }),
        };
        return query;
      },
    } as unknown as Parameters<typeof insertTicketWithNumber>[0];

    // 1. Tiket pertama di Cabang MPP Siola (location 5) -> harus A-01
    const res1 = await insertTicketWithNumber(mockDb, {
      serviceId: 1,
      locationId: 5,
      scheduleDate: "2026-10-19",
      userId: "user-1",
      nik: "3578010000000001",
    });
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.row.queue_number).toBe("A-01");
    }

    // 2. Tiket kedua di Cabang MPP Siola (location 5) -> harus A-02
    const res2 = await insertTicketWithNumber(mockDb, {
      serviceId: 1,
      locationId: 5,
      scheduleDate: "2026-10-19",
      userId: "user-2",
      nik: "3578010000000002",
    });
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.row.queue_number).toBe("A-02");
    }

    // 3. Tiket pertama di Kantor Dispendukcapil (location 6) untuk layanan dan tanggal yang sama
    //    -> harus mulai dari A-01, BUKAN menyambung jadi A-03!
    const res3 = await insertTicketWithNumber(mockDb, {
      serviceId: 1,
      locationId: 6,
      scheduleDate: "2026-10-19",
      userId: "user-3",
      nik: "3578010000000003",
    });
    expect(res3.ok).toBe(true);
    if (res3.ok) {
      expect(res3.row.queue_number).toBe("A-01");
    }

    // 4. Tiket kedua di Kantor Dispendukcapil (location 6) -> harus A-02
    const res4 = await insertTicketWithNumber(mockDb, {
      serviceId: 1,
      locationId: 6,
      scheduleDate: "2026-10-19",
      userId: "user-4",
      nik: "3578010000000004",
    });
    expect(res4.ok).toBe(true);
    if (res4.ok) {
      expect(res4.row.queue_number).toBe("A-02");
    }
  });

  it("defaults locationId to 1 when omitted", async () => {
    let capturedLocationId: number | null = null;
    const mockDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: (_col: string, val: unknown) => {
                capturedLocationId = val as number;
                return Promise.resolve({ data: [], error: null });
              },
            }),
          }),
        }),
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({
            single: async () => ({
              data: { id: "ticket-1", queue_number: payload.queue_number, status: "scheduled" },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof insertTicketWithNumber>[0];

    const res = await insertTicketWithNumber(mockDb, {
      serviceId: 2,
      scheduleDate: "2026-10-19",
      userId: null,
      nik: null,
    });

    expect(res.ok).toBe(true);
    expect(capturedLocationId).toBe(1);
  });
});
