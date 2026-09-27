import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ForgotPasswordRequest {
  email: string;
  redirectTo?: string;
}

/**
 * POST /api/auth/forgot-password
 *
 * Mengirimkan tautan reset password ke email pengguna melalui Supabase Auth.
 * Endpoint ini dapat dikonsumsi oleh aplikasi Mobile CiviGo maupun web client.
 */
export async function POST(request: NextRequest) {
  try {
    let body: ForgotPasswordRequest;
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

    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "EMAIL_REQUIRED",
            message: "Email wajib diisi.",
          },
        },
        { status: 400 }
      );
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_EMAIL",
            message: "Format email tidak valid.",
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Default redirect jika tidak dispesifikasikan (bisa diarahkan ke deep link mobile atau web reset page)
    const redirectTo =
      body.redirectTo ??
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://civigo.com"}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("[FORGOT_PASSWORD_ERROR]", error.message);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code ?? "RESET_REQUEST_FAILED",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Tautan reset kata sandi telah berhasil dikirim ke email Anda. Silakan periksa kotak masuk atau spam.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[FORGOT_PASSWORD_INTERNAL_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada server saat memproses permintaan reset kata sandi.",
        },
      },
      { status: 500 }
    );
  }
}
