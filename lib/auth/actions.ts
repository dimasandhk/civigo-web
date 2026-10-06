"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

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
    // Hanya sesi web ini; sesi warga di aplikasi mobile jangan ikut diputus.
    await supabase.auth.signOut({ scope: "local" });
    return {
      error:
        "Akun ini bukan akun instansi. Portal ini khusus untuk petugas pelayanan instansi.",
    };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  // `local`: default supabase-js adalah `global`, yang mengeluarkan akun ini dari
  // semua perangkat. Satu akun cabang dipakai beberapa loket sekaligus, jadi keluar
  // di satu loket tidak boleh memutus loket lain.
  await supabase.auth.signOut({ scope: "local" });

  redirect("/");
}

export async function requestPasswordReset(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = text(formData, "email").toLowerCase();

  if (!email) {
    return { fieldErrors: { email: "Email wajib diisi." } };
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { fieldErrors: { email: "Format email tidak valid." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://civigo.com"}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message: "Tautan reset kata sandi telah dikirim ke email Anda. Silakan periksa inbox atau spam.",
  };
}

export type ProfileState =
  | {
      error?: string;
      message?: string;
      fieldErrors?: {
        fullName?: string;
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      };
    }
  | undefined;

const FULL_NAME_MAX = 100; // public.users.full_name varchar(100)
const PASSWORD_MIN = 8; // sama dengan POST /api/auth/register dan /api/auth/reset-password

/**
 * Ubah nama lengkap akun yang sedang login (halaman Profil).
 *
 * Lewat sesi pengguna sendiri, bukan service_role: RLS `users` hanya mengizinkan
 * baris milik sendiri, dan grant kolom untuk `authenticated` hanya `full_name`.
 * Jadi peran, instansi, cabang, dan email tidak bisa ikut diubah dari sini.
 */
export async function updateProfileName(
  _state: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const fullName = text(formData, "full_name");

  if (fullName.length < 2) {
    return { fieldErrors: { fullName: "Nama lengkap minimal 2 karakter." } };
  }
  if (fullName.length > FULL_NAME_MAX) {
    return { fieldErrors: { fullName: `Nama lengkap maksimal ${FULL_NAME_MAX} karakter.` } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { error: `Gagal menyimpan nama: ${error.message}` };
  if (!data) return { error: "Profil akun tidak ditemukan." };

  revalidatePath("/admin", "layout");
  return { message: "Nama lengkap berhasil diperbarui." };
}

/**
 * Ubah password akun yang sedang login. Tidak perlu OTP atau email.
 *
 * Password saat ini selalu dicek dulu, supaya orang yang menemukan dasbor yang
 * masih login tidak bisa mengambil alih akun. Pengecekannya memakai client
 * sekali pakai (tanpa cookie) lalu sesi cek itu langsung dicabut dengan scope
 * `local`, jadi sesi petugas di browser ini dan di loket lain tidak tersentuh.
 * Sesi lain sengaja tidak dikeluarkan: satu akun cabang bisa dipakai beberapa
 * loket sekaligus.
 */
export async function changePassword(
  _state: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword) {
    return { fieldErrors: { currentPassword: "Password saat ini wajib diisi." } };
  }
  if (newPassword.length < PASSWORD_MIN) {
    return { fieldErrors: { newPassword: `Password baru minimal ${PASSWORD_MIN} karakter.` } };
  }
  if (newPassword === currentPassword) {
    return { fieldErrors: { newPassword: "Password baru harus berbeda dari password saat ini." } };
  }
  if (newPassword !== confirmPassword) {
    return { fieldErrors: { confirmPassword: "Konfirmasi password tidak sama dengan password baru." } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/");

  const { url, publishableKey } = supabaseEnv();
  const verifier = createSupabaseClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    if (verifyError.code === "over_request_rate_limit") {
      return { error: "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi." };
    }
    return { fieldErrors: { currentPassword: "Password saat ini salah." } };
  }
  await verifier.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    // Hanya dipakai Supabase kalau "Require current password" aktif di dashboard.
    current_password: currentPassword,
  });

  if (error) {
    switch (error.code) {
      case "same_password":
        return { fieldErrors: { newPassword: "Password baru harus berbeda dari password saat ini." } };
      case "weak_password":
        return { fieldErrors: { newPassword: `Password terlalu lemah: ${error.message}` } };
      case "reauthentication_needed":
        return {
          error:
            "Sesi login Anda sudah lebih dari 24 jam. Keluar lalu masuk lagi, kemudian ubah password.",
        };
      default:
        return { error: `Gagal mengubah password: ${error.message}` };
    }
  }

  return { message: "Password berhasil diubah. Gunakan password baru saat login berikutnya." };
}
