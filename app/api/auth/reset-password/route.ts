import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ResetPasswordRequest {
  password: string;
}

/**
 * POST /api/auth/reset-password
 *
 * Mengubah kata sandi pengguna yang sedang dalam sesi pemulihan (recovery session).
 */
export async function POST(request: NextRequest) {
  try {
    let body: ResetPasswordRequest;
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

    const password = body.password ? String(body.password) : "";

    if (password.length < 8) {
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

    const supabase = await createClient();

    // Verifikasi sesi user aktif dari token recovery
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Sesi reset kata sandi tidak valid atau telah kedaluwarsa. Silakan ajukan lupa password kembali.",
          },
        },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: updateError.code ?? "UPDATE_PASSWORD_FAILED",
            message: updateError.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Kata sandi Anda berhasil diperbarui. Silakan login kembali.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[RESET_PASSWORD_INTERNAL_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan saat memperbarui kata sandi.",
        },
      },
      { status: 500 }
    );
  }
}
