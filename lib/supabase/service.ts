import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv, supabaseSecretKey } from "./env";

/**
 * Supabase client that bypasses Row Level Security. Server-side only.
 *
 * The booking endpoint cannot work through the publishable key. `queues` has a
 * single policy — `auth.uid() = user_id`, for every command — which means:
 *
 *   - it cannot read other people's tickets, so it cannot work out which queue
 *     number comes next;
 *   - it cannot look up an account by NIK, because `users` only exposes the
 *     caller's own row;
 *   - it cannot insert a walk-in ticket, whose `user_id` is either null or
 *     somebody else's id.
 *
 * Every caller is therefore responsible for its own authorization — there is no
 * policy left to catch a mistake.
 */
export function createServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createServiceClient() was called in the browser. This client holds a key " +
        "that bypasses Row Level Security and must never leave the server.",
    );
  }

  const { url } = supabaseEnv();

  return createSupabaseClient<Database>(url, supabaseSecretKey(), {
    auth: {
      // No user session is involved, so there is nothing to persist or refresh.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
