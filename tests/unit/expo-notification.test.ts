import { describe, it, expect, vi } from "vitest";
import { isValidExpoPushToken, sendExpoPushNotification } from "@/lib/notifications/expo";

describe("Expo Push Notification Helper", () => {
  it("validates ExponentPushToken format correctly", () => {
    expect(isValidExpoPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
    expect(isValidExpoPushToken("ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
    expect(isValidExpoPushToken("invalid-token")).toBe(false);
    expect(isValidExpoPushToken("")).toBe(false);
    expect(isValidExpoPushToken(null)).toBe(false);
    expect(isValidExpoPushToken(undefined)).toBe(false);
  });

  it("returns error for invalid push token without making HTTP call", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const result = await sendExpoPushNotification({
      to: "not-a-token",
      title: "Test",
      body: "Test body",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Invalid Expo push token");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("successfully dispatches payload to Expo Push API", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { status: "ok" } }),
    } as Response);

    const result = await sendExpoPushNotification({
      to: "ExponentPushToken[validToken1234567890]",
      title: "Giliran Anda Tiba!",
      body: "Nomor antrean A-01 dipanggil ke Loket 1.",
      data: { queueId: "test-uuid" },
    });

    expect(result.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://exp.host/--/api/v2/push/send",
      expect.objectContaining({
        method: "POST",
      })
    );

    fetchSpy.mockRestore();
  });
});
