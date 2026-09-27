import { describe, it, expect } from "vitest";
import { startOfMonthInJakarta } from "@/lib/queue/time";

describe("startOfMonthInJakarta", () => {
  it("returns 1st of the month 00:00 WIB (17:00 UTC the day before)", () => {
    const start = startOfMonthInJakarta(new Date("2026-09-27T14:20:00Z"));
    expect(start.toISOString()).toBe("2026-08-31T17:00:00.000Z");
  });

  it("already counts the new month between 00:00 and 07:00 WIB on the 1st", () => {
    // 1 Oktober 03:00 WIB — di UTC masih 30 September.
    const start = startOfMonthInJakarta(new Date("2026-09-30T20:00:00Z"));
    expect(start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
  });

  it("puts a review from the last evening of the previous month (WIB) outside this month", () => {
    const start = startOfMonthInJakarta(new Date("2026-10-15T05:00:00Z"));
    // 30 September 23:30 WIB
    const lateSeptember = new Date("2026-09-30T16:30:00Z");
    // 1 Oktober 00:30 WIB
    const earlyOctober = new Date("2026-09-30T17:30:00Z");
    expect(lateSeptember.getTime() < start.getTime()).toBe(true);
    expect(earlyOctober.getTime() >= start.getTime()).toBe(true);
  });
});
