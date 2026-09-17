/**
 * Supabase connection details.
 *
 * Read lazily rather than at module scope so a missing `.env.local` surfaces as
 * a clear error where a client is actually created, instead of an opaque
 * failure during a build.
 *
 * Both values are safe to expose to the browser: the publishable key only ever
 * grants what your Row Level Security policies allow. Never put the secret /
 * `service_role` key in a `NEXT_PUBLIC_` variable — it bypasses RLS entirely.
 */
export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

/** Returns `null` when Supabase has not been configured yet. */
export function readSupabaseEnv(): SupabaseEnv | null {
  // Referenced as full literals so Next.js can inline them into client bundles.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

/** Same, but throws — for code paths that cannot do anything useful without it. */
export function supabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();

  if (!env) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and fill in " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from " +
        "your project's dashboard (Project Settings -> API Keys).",
    );
  }

  return env;
}

/**
 * The secret / `service_role` key, which bypasses Row Level Security entirely.
 *
 * Kept in its own reader rather than folded into `SupabaseEnv` so it can never
 * be picked up by accident: everything that returns `SupabaseEnv` is safe to
 * reach for from anywhere, this one is not.
 */
export function supabaseSecretKey(): string {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is missing. Add it to .env.local from your project's " +
        "dashboard (Project Settings -> API Keys -> secret key). It must NOT be " +
        "prefixed with NEXT_PUBLIC_ — that would ship a key that bypasses RLS to " +
        "the browser.",
    );
  }

  return secretKey;
}
