import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Supabase client for Client Components (`"use client"`).
 *
 * `createBrowserClient` is a singleton, so calling this on every render is
 * cheap — you get the same underlying client back.
 */
export function createClient() {
  const { url, publishableKey } = supabaseEnv();

  return createBrowserClient<Database>(url, publishableKey);
}
