import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, _resetRateLimitStore, rateLimitExceededResponse } from "@/lib/rate-limit";

describe("In-Memory Sliding Window Rate Limiter", () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  it("allows requests under the limit", () => {
    const res1 = checkRateLimit("user-1", { limit: 3, windowMs: 10000 });
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit("user-1", { limit: 3, windowMs: 10000 });
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit("user-1", { limit: 3, windowMs: 10000 });
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests that exceed the limit", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("user-blocked", { limit: 3, windowMs: 10000 });
    }

    const blocked = checkRateLimit("user-blocked", { limit: 3, windowMs: 10000 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it("tracks different identifiers independently", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("ip-a", { limit: 3, windowMs: 10000 });
    }

    const blockedA = checkRateLimit("ip-a", { limit: 3, windowMs: 10000 });
    expect(blockedA.success).toBe(false);

    const allowedB = checkRateLimit("ip-b", { limit: 3, windowMs: 10000 });
    expect(allowedB.success).toBe(true);
  });

  it("formats 429 response with proper headers", async () => {
    const rateLimit = checkRateLimit("test-429", { limit: 1, windowMs: 5000 });
    const blocked = checkRateLimit("test-429", { limit: 1, windowMs: 5000 });

    const response = rateLimitExceededResponse(blocked, "Limit reached");
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeDefined();
    expect(response.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(body.error.message).toBe("Limit reached");
  });
});
