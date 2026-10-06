import { redirect } from "next/navigation";
import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Read side of auth. Deliberately not a `"use server"` module — these are
 * called during render, and marking them as Server Actions would publish them
 * as POST endpoints for no reason.
 */

export type Role = "user" | "instansi" | "super_admin";

export type Profile = {
  id: string;
  nik: string | null;
  full_name: string;
  email: string;
  role: Role;
  agency_id: number | null;
  location_id: number | null;
};

/**
 * Returns the signed-in user's profile, or `null` when there is no valid
 * session.
 *
 * Mendukung Bearer token (Mobile) dan Cookie session (Web Dashboard).
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<Profile | null> {
  let token: string | undefined;
  try {
    const reqHeaders = await headers();
    const authHeader = reqHeaders.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  } catch {
    // Dipanggil di luar request context (misal build time / isolated tests)
  }

  const supabase = await createClient();

  let userId: string | undefined;

  if (token) {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (!userError && userData?.user) {
      userId = userData.user.id;
    }
  }

  if (!userId) {
    const { data, error } = await supabase.auth.getClaims();
    userId = data?.claims?.sub;
  }

  if (!userId) return null;

  const db = createServiceClient();
  const { data: profile, error: selectErr } = await db
    .from("users")
    .select("id, nik, full_name, email, role, agency_id, location_id")
    .eq("id", userId)
    .maybeSingle();

  const err = selectErr as { code?: string; message?: string } | null;
  if (err && (err.code === "42703" || err.message?.includes("location_id"))) {
    const { data: fallbackProfile } = await db
      .from("users")
      .select("id, nik, full_name, email, role, agency_id")
      .eq("id", userId)
      .maybeSingle();

    if (!fallbackProfile) return null;

    return {
      ...(fallbackProfile as unknown as Profile),
      location_id: null,
    };
  }

  if (!profile) return null;

  return (profile as unknown as Profile) ?? null;
});

/** Same, but for code paths that cannot render anything useful without a user. */
export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentUser();

  if (!profile) throw new Error("Unauthorized");

  return profile;
}

/**
 * Gate for every `/admin` route.
 *
 * This is the only thing standing between an anonymous visitor and the
 * dashboard: `/admin` had no guard at all, and the pages below it now read
 * queue data through the service_role client, which ignores RLS entirely.
 * Before that change RLS was accidentally acting as the access control — it
 * hid every row from everyone, broken pages included.
 */
export async function requireOfficer(): Promise<Profile> {
  const profile = await getCurrentUser();

  if (!profile || profile.role === "user") redirect("/");

  return profile;
}
