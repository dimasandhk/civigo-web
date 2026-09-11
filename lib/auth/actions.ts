"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Every export in this file is a Server Action, which means it is a POST
 * endpoint reachable by anyone who can craft the request. Keep read helpers in
 * `lib/auth/session.ts` instead, and treat all input here as untrusted.
 */

const NIK_PATTERN = /^[0-9]{16}$/;

export type AuthState =
  | {
      error?: string;
      message?: string;
      fieldErrors?: {
        fullName?: string;
        nik?: string;
        email?: string;
        password?: string;
      };
    }
  | undefined;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signUp(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const fullName = text(formData, "full_name");
  const nik = text(formData, "nik");
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<AuthState>["fieldErrors"] = {};

  if (fullName.length < 2) fieldErrors.fullName = "Nama lengkap wajib diisi.";
  if (!NIK_PATTERN.test(nik)) fieldErrors.nik = "NIK harus 16 digit angka.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    fieldErrors.email = "Format email tidak valid.";
  if (password.length < 8)
    fieldErrors.password = "Kata sandi minimal 8 karakter.";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();

  // The signup trigger is what actually guarantees NIK uniqueness, but a
  // constraint violation raised inside it reaches the browser as an opaque 500
  // from GoTrue. Checking first is the only way to point the form at the field
  // that is wrong. The unique index remains the real guard against the race.
  const { data: nikAvailable, error: nikError } = await supabase.rpc(
    "nik_available",
    { p_nik: nik },
  );

  if (nikError) return { error: "Gagal memeriksa NIK. Coba lagi." };
  if (!nikAvailable) return { fieldErrors: { nik: "NIK sudah terdaftar." } };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by public.handle_new_user() to build the profile row. Note that the
    // trigger ignores `role` from here on purpose: this payload is entirely
    // client-controlled, so honouring it would hand out admin on request.
    options: { data: { nik, full_name: fullName } },
  });

  if (error) return { error: error.message };

  // No session means the project requires email confirmation, so there is
  // nothing to redirect into yet.
  if (!data.session) {
    return { message: "Cek email kamu untuk mengonfirmasi akun." };
  }

  redirect("/");
}

export async function signIn(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const identifier = text(formData, "username") || text(formData, "email");
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Username/Email dan kata sandi wajib diisi." };
  }

  // Normalize username to email if necessary
  let email = identifier.toLowerCase();
  if (!email.includes("@")) {
    // If username is like "disdukcapil.surabaya" or "disdukcapil"
    const agencyPrefix = email.split(".")[0].replace(/[^a-z0-9]/g, "");
    email = `${agencyPrefix}@civigo.com`;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Username atau kata sandi tidak sesuai." };
  }

  // Verify that the signed in user is an agency account
  const { data: profile } = await supabase
    .from("users")
    .select("role, agency_id")
    .eq("id", data.user.id)
    .single();

  if (profile && profile.role !== "instansi" && profile.role !== "super_admin") {
    await supabase.auth.signOut();
    return {
      error:
        "Akun ini bukan akun instansi. Portal ini khusus untuk petugas pelayanan instansi.",
    };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/");
}
