import type { NextRequest } from "next/server";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory sliding window store
const rateLimitStore = new Map<string, RateLimitRecord>();

let lastCleanup = Date.now();
function cleanupStaleRecords(now: number, maxAgeMs: number = 300000) {
  if (now - lastCleanup < maxAgeMs) return;
  lastCleanup = now;
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < maxAgeMs);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check and record a rate-limit event for a specific key (e.g. "chatbot:192.168.1.1").
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { limit: 20, windowMs: 60000 }
): RateLimitResult {
  // Prevent cross-test rate limit pollution during automated Vitest runs
  if (
    process.env.NODE_ENV === "test" &&
    !key.startsWith("test-") &&
    !key.startsWith("user-") &&
    !key.startsWith("ip-")
  ) {
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetMs: options.windowMs,
    };
  }

  const now = Date.now();
  cleanupStaleRecords(now, options.windowMs);

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter out timestamps outside the sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < options.windowMs);

  if (record.timestamps.length >= options.limit) {
    const oldest = record.timestamps[0] || now;
    const resetMs = Math.max(0, options.windowMs - (now - oldest));
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, options.limit - record.timestamps.length);
  return {
    success: true,
    limit: options.limit,
    remaining,
    resetMs: options.windowMs,
  };
}

/**
 * Extract client IP identifier from NextRequest.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  return "127.0.0.1";
}

/**
 * Generate standard 429 Too Many Requests response.
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  message: string = "Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi."
): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message,
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil(result.resetMs / 1000))),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/**
 * For test resetting.
 */
export function _resetRateLimitStore() {
  rateLimitStore.clear();
}
