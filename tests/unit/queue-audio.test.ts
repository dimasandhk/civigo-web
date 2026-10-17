import { describe, it, expect } from "vitest";
import { formatQueueNumberForSpeech, playChime, announceQueueCall } from "@/app/components/display/queueAudio";

describe("Queue Display Audio & Speech Synthesis", () => {
  it("formats queue number with letters and digits cleanly for speech", () => {
    const formatted = formatQueueNumberForSpeech("A-01");
    expect(formatted).toContain("A");
    expect(formatted).toContain("kosong");
    expect(formatted).toContain("1");
  });

  it("handles numbers with multiple digits and letters", () => {
    const formatted = formatQueueNumberForSpeech("B-12");
    expect(formatted).toContain("B");
    expect(formatted).toContain("1");
    expect(formatted).toContain("2");
  });

  it("handles numbers without hyphens gracefully", () => {
    const formatted = formatQueueNumberForSpeech("C05");
    expect(formatted).toContain("C");
    expect(formatted).toContain("kosong");
    expect(formatted).toContain("5");
  });

  it("playChime resolves gracefully when AudioContext is undefined (e.g. Node/SSR)", async () => {
    await expect(playChime(null)).resolves.toBeUndefined();
  });

  it("announceQueueCall resolves without throwing in headless/SSR environments", async () => {
    await expect(announceQueueCall("A-01", "Loket 1", null)).resolves.toBeUndefined();
  });
});
