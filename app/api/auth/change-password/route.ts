import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ChangePasswordRequest {
  current_password?: string;
  new_password?: string;
}

/**
 * POST /api/auth/change-password
 *
 * Mengubah kata sandi pengguna yang sedang login (memiliki sesi aktif).
 * Mendukung Bearer token (Mobile) dan Session Cookie (Web Dashboard).
 */
export async function POST(request: NextRequest) {
  try {
    let body: ChangePasswordRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_JSON",
            message: "Body request harus berupa JSON yang valid.",
          },
        },
        { status: 400 }
      );
    }

    const currentPassword = body.current_password ? String(body.current_password).trim() : "";
    const newPassword = body.new_password ? String(body.new_password).trim() : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MISSING_FIELDS",
            message: "Kata sandi saat ini (current_password) dan kata sandi baru (new_password) wajib diisi.",
          },
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "WEAK_PASSWORD",
            message: "Kata sandi baru minimal harus 8 karakter.",
          },
        },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : undefined;

    const supabase = await createClient();

    // 1. Ambil data pengguna dari sesi aktif
    const {
      data: { user },
      error: userError,
    } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Sesi login tidak valid atau telah kedaluwarsa. Silakan login kembali.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Verifikasi kata sandi lama (current_password) jika pengguna memiliki email terdaftar
    if (user.email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "INVALID_CURRENT_PASSWORD",
              message: "Kata sandi saat ini yang Anda masukkan salah.",
            },
          },
          { status: 400 }
        );
      }
    }

    // 3. Perbarui kata sandi baru
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: updateError.code ?? "UPDATE_PASSWORD_FAILED",
            message: updateError.message || "Gagal memperbarui kata sandi.",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Kata sandi Anda berhasil diperbarui.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CHANGE_PASSWORD_INTERNAL_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada server saat memperbarui kata sandi.",
        },
      },
      { status: 500 }
    );
  }
}
