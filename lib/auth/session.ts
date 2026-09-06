import { createClient } from "@/lib/supabase/server";

/**
 * Read side of auth. Deliberately not a `"use server"` module — these are
 * called during render, and marking them as Server Actions would publish them
 * as POST endpoints for no reason.
 */

export type Role = "citizen" | "officer" | "admin";

export type Profile = {
  id: string;
  nik: string;
  full_name: string;
  email: string;
  role: Role;
};

/**
 * Returns the signed-in user's profile, or `null` when there is no valid
 * session.
 *
 * Uses `getClaims()` rather than `getSession()`: the session is read straight
 * from a cookie the browser controls, so only the verified claims can be
 * trusted on the server.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) return null;

  // RLS restricts this to the caller's own row, so the filter is a query hint
  // rather than the access control.
  const { data: profile } = await supabase
    .from("users")
    .select("id, nik, full_name, email, role")
    .eq("id", userId)
    .single();

  return (profile as Profile) ?? null;
}

/** Same, but for code paths that cannot render anything useful without a user. */
export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentUser();

  if (!profile) throw new Error("Unauthorized");

  return profile;
}
