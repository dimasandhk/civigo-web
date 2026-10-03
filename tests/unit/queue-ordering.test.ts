import { describe, it, expect } from "vitest";
import { sortWaiting, type WaitingTicket } from "@/lib/queue/ordering";

function ticket(queue_number: string, extra: Partial<WaitingTicket> = {}): WaitingTicket {
  return { queue_number, status: "present", time_block: null, postponed: false, postponed_at: null, ...extra };
}

const numbers = (list: WaitingTicket[]) => list.map((t) => t.queue_number);

describe("sortWaiting (urutan panggil bersama)", () => {
  it("puts present ahead of scheduled", () => {
    const sorted = sortWaiting([
      ticket("B-001", { status: "scheduled" }),
      ticket("B-002", { status: "present" }),
    ]);
    expect(numbers(sorted)).toEqual(["B-002", "B-001"]);
  });

  it("orders by session start, tickets without a session last, then by number", () => {
    const sorted = sortWaiting([
      ticket("B-003"),
      ticket("B-002", { time_block: "10:00 - 11:00" }),
      ticket("B-001", { time_block: "09:00 - 10:00" }),
      ticket("B-004", { time_block: "09:00 - 10:00" }),
    ]);
    expect(numbers(sorted)).toEqual(["B-001", "B-004", "B-002", "B-003"]);
  });

  it("puts a postponed ticket behind everyone, including people who have not arrived (opsi A)", () => {
    // Kasus simulasi di business-flow/web5-mundurkan-antrean.md, langkah 5.
    const sorted = sortWaiting([
      ticket("B-001", { postponed: true, postponed_at: "2026-10-03T02:00:21Z" }),
      ticket("B-003", { status: "scheduled" }),
      ticket("B-004", { status: "scheduled" }),
    ]);
    expect(numbers(sorted)).toEqual(["B-003", "B-004", "B-001"]);
  });

  it("calls postponed tickets in the order they were postponed", () => {
    const sorted = sortWaiting([
      ticket("B-001", { postponed: true, postponed_at: "2026-10-03T02:05:00Z" }),
      ticket("B-002", { postponed: true, postponed_at: "2026-10-03T02:01:00Z" }),
      ticket("B-005"),
    ]);
    expect(numbers(sorted)).toEqual(["B-005", "B-002", "B-001"]);
  });

  it("does not mutate the input array", () => {
    const input = [ticket("B-002"), ticket("B-001")];
    sortWaiting(input);
    expect(numbers(input)).toEqual(["B-002", "B-001"]);
  });
});
