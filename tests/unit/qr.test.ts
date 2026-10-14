import { describe, it, expect } from "vitest";
import { parseTicketQr } from "@/lib/queue/qr";

const ID = "0b7e7f4e-2f0a-4d8e-9c3b-5a1d2e3f4a5b";

describe("parseTicketQr", () => {
  it("reads queue_id and queue_number from the mobile app's JSON", () => {
    const text = JSON.stringify({
      queue_id: ID,
      queue_number: "A45",
      nik: "3578010101010001",
      schedule_date: "2026-10-14",
      service_id: 12,
    });
    expect(parseTicketQr(text)).toEqual({ queueId: ID, queueNumber: "A45" });
  });

  it("tolerates surrounding whitespace and a missing queue_number", () => {
    expect(parseTicketQr(`  {"queue_id": " ${ID} "}\n`)).toEqual({ queueId: ID, queueNumber: null });
  });

  it("accepts a bare ticket UUID", () => {
    expect(parseTicketQr(ID)).toEqual({ queueId: ID, queueNumber: null });
  });

  it("rejects anything else", () => {
    for (const text of [
      "https://example.com/pay?id=1",
      "A-45",
      "3578010101010001",
      "{broken json",
      "[]",
      "null",
      JSON.stringify({ queue_id: 123 }),
      JSON.stringify({ queue_id: "not-a-uuid" }),
      JSON.stringify({ id: ID }),
    ]) {
      expect(parseTicketQr(text), text).toBeNull();
    }
  });
});
