import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockPostponeQueue } = vi.hoisted(() => ({
  mockPostponeQueue: vi.fn(),
}));

vi.mock("@/lib/queue/status", () => ({
  postponeQueue: mockPostponeQueue,
}));

import { POST as postponeHandler } from "@/app/api/queue/[id]/postpone/route";

describe("Postpone Queue Endpoint (POST /api/queue/[id]/postpone)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when ticket ID is not a valid UUID", async () => {
    mockPostponeQueue.mockResolvedValueOnce({
      ok: false,
      status: 400,
      code: "INVALID_TICKET_ID",
      message: "Id tiket harus berupa UUID.",
    });

    const req = new NextRequest("http://localhost:3000/api/queue/not-a-uuid/postpone", {
      method: "POST",
    });

    const res = await postponeHandler(req, {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("INVALID_TICKET_ID");
    expect(mockPostponeQueue).toHaveBeenCalledWith("not-a-uuid");
  });

  it("returns 404 when ticket is not found", async () => {
    const validUuid = "11111111-2222-3333-4444-555555555555";
    mockPostponeQueue.mockResolvedValueOnce({
      ok: false,
      status: 404,
      code: "TICKET_NOT_FOUND",
      message: "Tiket tidak ditemukan.",
    });

    const req = new NextRequest(`http://localhost:3000/api/queue/${validUuid}/postpone`, {
      method: "POST",
    });

    const res = await postponeHandler(req, {
      params: Promise.resolve({ id: validUuid }),
    });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("returns 200 when ticket is successfully postponed to the end of queue", async () => {
    const validUuid = "11111111-2222-3333-4444-555555555555";
    mockPostponeQueue.mockResolvedValueOnce({
      ok: true,
      message: "Tiket A-003 berhasil dimundurkan ke paling akhir antrean menunggu.",
      ticket: {
        id: validUuid,
        queue_number: "A-003",
        status: "present",
        postponed: true,
        postponed_at: "2026-09-28T09:00:00Z",
        schedule_date: "2026-09-28",
        time_block: null,
      },
    });

    const req = new NextRequest(`http://localhost:3000/api/queue/${validUuid}/postpone`, {
      method: "POST",
    });

    const res = await postponeHandler(req, {
      params: Promise.resolve({ id: validUuid }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.ticket.postponed).toBe(true);
    expect(json.ticket.queue_number).toBe("A-003");
    expect(mockPostponeQueue).toHaveBeenCalledWith(validUuid);
  });
});
