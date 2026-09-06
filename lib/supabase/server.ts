import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Functions and Route Handlers.
 *
 * Create a new one per request — never hoist the result into a module-level
 * variable, or one visitor's session leaks into another's request.
 */
export async function createClient() {
  const { url, publishableKey } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies — only Server Functions and
          // Route Handlers can. Safe to ignore, because proxy.ts refreshes the
          // session on every matched request and writes the cookies there.
        }
      },
    },
  });
}
