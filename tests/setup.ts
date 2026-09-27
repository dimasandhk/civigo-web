import { afterEach, vi } from "vitest";

// Fallback dummy environment variables for isolated testing
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pcaadxclrsrdeutcwtsp.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "dummy-publishable-key";
process.env.SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || "dummy-secret-key";
process.env.OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || "sk-dummy-test-key-prevent-exhaustion";

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
