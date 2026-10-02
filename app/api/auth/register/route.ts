import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const NIK_PATTERN = /^[0-9]{16}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface RegisterRequestBody {
  email?: string;
  password?: string;
  nik?: string;
  full_name?: string;
}

/**
 * POST /api/auth/register
 *
 * Mendaftarkan akun warga baru melalui REST API JSON (untuk Mobile & Web Client).
 * Body:
 *   {
 *     "email": "warga@civigo.com",
 *     "password": "Password123!",
 *     "nik": "3578012345678901",
 *     "full_name": "Budi Santoso"
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    let body: RegisterRequestBody;
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

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ? String(body.password) : "";
    const nik = body.nik?.trim() ?? "";
    const fullName = body.full_name?.trim() ?? "";

    // 1. Validasi Input
    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_NAME",
            message: "Nama lengkap wajib diisi minimal 2 karakter.",
          },
        },
        { status: 400 }
      );
    }

    if (!nik || !NIK_PATTERN.test(nik)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_NIK",
            message: "NIK harus berupa tepat 16 digit angka.",
          },
        },
        { status: 400 }
      );
    }

    if (!email || !EMAIL_PATTERN.test(email)) {
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

    if (!password || password.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "WEAK_PASSWORD",
            message: "Kata sandi minimal harus 8 karakter.",
          },
        },
        { status: 400 }
      );
    }

    // 2. Cek apakah NIK sudah digunakan di database public.users
    const serviceDb = createServiceClient();
    const { data: existingNikUser } = await serviceDb
      .from("users")
      .select("id")
      .eq("nik", nik)
      .maybeSingle();

    if (existingNikUser) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NIK_ALREADY_EXISTS",
            message: "NIK ini sudah terdaftar dalam sistem CiviGo.",
          },
        },
        { status: 409 }
      );
    }

    // 3. Daftarkan user ke Supabase Auth
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nik,
          full_name: fullName,
        },
      },
    });

    if (error) {
      const isAlreadyRegistered =
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("unique constraint");

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: isAlreadyRegistered ? "EMAIL_ALREADY_EXISTS" : (error.code ?? "REGISTRATION_FAILED"),
            message: isAlreadyRegistered
              ? "Alamat email ini sudah terdaftar. Silakan login atau gunakan lupa password."
              : error.message,
          },
        },
        { status: isAlreadyRegistered ? 409 : 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "REGISTRATION_FAILED",
            message: "Gagal membuat akun pengguna. Silakan coba lagi.",
          },
        },
        { status: 500 }
      );
    }

    // 4. Susun respon JSON rapi untuk Mobile Client
    const userPayload = {
      id: data.user.id,
      email: data.user.email ?? email,
      nik,
      full_name: fullName,
      role: "user",
    };

    const sessionPayload = data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
          token_type: "bearer",
        }
      : null;

    const message = data.session
      ? "Pendaftaran akun berhasil. Selamat datang di CiviGo!"
      : "Pendaftaran akun berhasil. Silakan cek email Anda untuk verifikasi.";

    return NextResponse.json(
      {
        ok: true,
        message,
        user: userPayload,
        session: sessionPayload,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER_INTERNAL_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada server saat memproses registrasi.",
        },
      },
      { status: 500 }
    );
  }
}
