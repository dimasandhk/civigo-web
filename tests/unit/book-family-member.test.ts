import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInsert } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
}));

const mockCurrentUser = {
  id: "parent-user-id",
  nik: "0000999999999999",
  role: "user",
};

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: async () => mockCurrentUser,
}));

vi.mock("@/lib/queue/time", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue/time")>();
  return {
    ...actual,
    todayInJakarta: () => "2026-10-18",
    nowMinutesInJakarta: () => 10 * 60,
  };
});

vi.mock("@/lib/queue/number", () => ({
  insertTicketWithNumber: async (_db: unknown, args: unknown) => {
    mockInsert(args);
    return { ok: true, row: { id: "ticket-new", queue_number: "A-05", status: "scheduled" } };
  },
}));

const FAMILY_MEMBERS: Record<number, { id: number; user_id: string; nik: string; full_name: string }> = {
  1: { id: 1, user_id: "parent-user-id", nik: "3578015504850001", full_name: "Siti Aminah" },
  2: { id: 2, user_id: "parent-user-id", nik: "3578011208080002", full_name: "Budi Santoso" },
};

let existingQueues: Array<{
  service_id: number;
  schedule_date: string;
  status: string;
  user_id: string;
  nik: string;
  family_member_id: number | null;
  queue_number: string;
}> = [];

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      let orClause: string | null = null;
      let isClause: { col: string; val: unknown } | null = null;

      const query = {
        select: () => query,
        eq: (col: string, val: unknown) => {
          filters[col] = val;
          return query;
        },
        in: () => query,
        or: (expr: string) => {
          orClause = expr;
          return query;
        },
        is: (col: string, val: unknown) => {
          isClause = { col, val };
          return query;
        },
        limit: () => query,
        maybeSingle: async () => {
          if (table === "family_members") {
            const member = FAMILY_MEMBERS[filters.id as number];
            return { data: member ?? null, error: null };
          }
          if (table === "services") {
            return {
              data: { id: 1, name: "Perekaman & Penerbitan KTP-el Baru", estimated_time: 15, agency_id: 1 },
              error: null,
            };
          }
          if (table === "agencies") {
            return {
              data: { id: 1, name: "Dispendukcapil", open_time: "08:00", close_time: "16:00", operating_days: [1, 2, 3, 4, 5, 6, 7] },
              error: null,
            };
          }
          if (table === "agency_locations") {
            return { data: { agency_id: 1, location_id: 1 }, error: null };
          }
          if (table === "queues") {
            const match = existingQueues.find((q) => {
              if (q.service_id !== filters.service_id) return false;
              if (q.schedule_date !== filters.schedule_date) return false;

              if (orClause) {
                // Parse simple or clauses: "family_member_id.eq.2,nik.eq.3578011208080002"
                if (orClause.includes("family_member_id.eq")) {
                  const fmMatch = orClause.match(/family_member_id\.eq\.(\d+)/);
                  const nikMatch = orClause.match(/nik\.eq\.(\d+)/);
                  const fmId = fmMatch ? parseInt(fmMatch[1], 10) : null;
                  const targetNik = nikMatch ? nikMatch[1] : null;

                  return (fmId !== null && q.family_member_id === fmId) || (targetNik !== null && q.nik === targetNik);
                }

                // Parse self or clause: "and(user_id.eq.parent-user-id,family_member_id.is.null),nik.eq.0000999999999999"
                if (orClause.includes("and(user_id.eq")) {
                  const isSelfTicket = q.user_id === mockCurrentUser.id && q.family_member_id === null;
                  const isNikMatch = q.nik === mockCurrentUser.nik;
                  return isSelfTicket || isNikMatch;
                }
              }

              return false;
            });

            return { data: match ?? null, error: null };
          }

          return { data: null, error: null };
        },
      };
      return query;
    },
  }),
}));

import { bookQueue } from "@/lib/queue/book";

describe("bookQueue untuk anggota keluarga", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existingQueues = [];
  });

  it("berhasil booking untuk anak meskipun orang tua sudah memiliki antrean aktif sendiri", async () => {
    // Orang tua sudah punya tiket A-04 untuk KTP-el
    existingQueues.push({
      service_id: 1,
      schedule_date: "2026-10-18",
      status: "scheduled",
      user_id: "parent-user-id",
      nik: "0000999999999999",
      family_member_id: null,
      queue_number: "A-04",
    });

    const result = await bookQueue({
      service_id: 1,
      schedule_date: "2026-10-18",
      family_member_id: 2, // Budi Santoso
    });

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        familyMemberId: 2,
        nik: "3578011208080002", // Harus NIK anak, bukan NIK orang tua!
        userId: "parent-user-id",
      }),
    );
  });

  it("menolak booking jika anggota keluarga yang sama sudah memiliki antrean aktif di layanan & tanggal yang sama", async () => {
    // Anak sudah punya tiket A-05
    existingQueues.push({
      service_id: 1,
      schedule_date: "2026-10-18",
      status: "scheduled",
      user_id: "parent-user-id",
      nik: "3578011208080002",
      family_member_id: 2,
      queue_number: "A-05",
    });

    const result = await bookQueue({
      service_id: 1,
      schedule_date: "2026-10-18",
      family_member_id: 2,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("DUPLICATE_BOOKING");
      expect(result.message).toContain("A-05");
    }
  });

  it("mengizinkan orang tua booking untuk anak kedua jika anak pertama sudah punya antrean", async () => {
    // Anak pertama punya tiket
    existingQueues.push({
      service_id: 1,
      schedule_date: "2026-10-18",
      status: "scheduled",
      user_id: "parent-user-id",
      nik: "3578015504850001",
      family_member_id: 1,
      queue_number: "A-05",
    });

    // Booking untuk anak kedua
    const result = await bookQueue({
      service_id: 1,
      schedule_date: "2026-10-18",
      family_member_id: 2,
    });

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        familyMemberId: 2,
        nik: "3578011208080002",
      }),
    );
  });

  it("mengizinkan orang tua booking untuk diri sendiri jika anak sudah memiliki antrean aktif", async () => {
    // Anak punya tiket aktif di bawah akun orang tua
    existingQueues.push({
      service_id: 1,
      schedule_date: "2026-10-18",
      status: "scheduled",
      user_id: "parent-user-id",
      nik: "3578011208080002",
      family_member_id: 2,
      queue_number: "A-05",
    });

    // Orang tua booking untuk diri sendiri (family_member_id null)
    const result = await bookQueue({
      service_id: 1,
      schedule_date: "2026-10-18",
    });

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        familyMemberId: null,
        nik: "0000999999999999",
        userId: "parent-user-id",
      }),
    );
  });
});
