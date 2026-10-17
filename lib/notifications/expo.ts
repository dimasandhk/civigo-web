/**
 * Helper to dispatch push notifications to mobile devices via Expo's Push API.
 */
export function isValidExpoPushToken(token: unknown): boolean {
  return (
    typeof token === "string" &&
    (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["))
  );
}

export interface PushNotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendExpoPushNotification({
  to,
  title,
  body,
  data,
}: PushNotificationPayload): Promise<{ ok: boolean; error?: string }> {
  if (!isValidExpoPushToken(to)) {
    return { ok: false, error: "Invalid Expo push token." };
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        title,
        body,
        sound: "default",
        priority: "high",
        data: data ?? {},
      }),
    });

    const json = await response.json();
    return { ok: response.ok, error: response.ok ? undefined : JSON.stringify(json) };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to dispatch push notification.";
    return { ok: false, error: msg };
  }
}
