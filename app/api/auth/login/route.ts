import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const NIK_PATTERN = /^[0-9]{16}$/;

interface LoginRequestBody {
  email?: string;
  identifier?: string;
  username?: string;
  nik?: string;
  password?: string;
}

/**
 * POST /api/auth/login
 *
 * Endpoint login universal (untuk Mobile & Web Client).
 * Mendukung login menggunakan:
 * 1. Email (cth: warga1@civigo.com)
 * 2. NIK 16 digit (cth: 0000999999999999) -> sistem otomatis mencocokkan ke email warga terdaftar
 * 3. Username Instansi (cth: disdukcapil) -> dinormalisasi menjadi disdukcapil@civigo.com
 *
 * Respon mengembalikan data user lengkap dan token session (access_token, refresh_token).
 */
export async function POST(request: NextRequest) {
  try {
    let body: LoginRequestBody;
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

    const rawIdentifier =
      body.identifier ?? body.email ?? body.username ?? body.nik ?? "";
    const identifier = String(rawIdentifier).trim();
    const password = body.password ? String(body.password) : "";

    if (!identifier || !password) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MISSING_CREDENTIALS",
            message: "Email/NIK/Username dan kata sandi wajib diisi.",
          },
        },
        { status: 400 }
      );
    }

    const serviceDb = createServiceClient();
    let loginEmail = identifier.toLowerCase();

    // Skenario A: Login menggunakan NIK 16 Digit
    if (NIK_PATTERN.test(identifier)) {
      const { data: userByNik } = await serviceDb
        .from("users")
        .select("email")
        .eq("nik", identifier)
        .maybeSingle();

      if (!userByNik?.email) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Akun dengan NIK tersebut tidak ditemukan atau kata sandi tidak valid.",
            },
          },
          { status: 401 }
        );
      }

      loginEmail = userByNik.email;
    }
    // Skenario B: Login menggunakan username instansi tanpa domain '@' (cth: "disdukcapil")
    else if (!loginEmail.includes("@")) {
      const agencyPrefix = loginEmail.split(".")[0].replace(/[^a-z0-9]/g, "");
      loginEmail = `${agencyPrefix}@civigo.com`;
    }

    // Eksekusi Autentikasi Supabase
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email/NIK atau kata sandi tidak sesuai.",
          },
        },
        { status: 401 }
      );
    }

    // Ambil profil lengkap dari tabel public.users
    const { data: profile } = await serviceDb
      .from("users")
      .select("id, email, nik, full_name, role, agency_id, location_id")
      .eq("id", data.user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: true,
        message: "Login berhasil.",
        user: {
          id: data.user.id,
          email: data.user.email ?? loginEmail,
          nik: profile?.nik ?? data.user.user_metadata?.nik ?? null,
          full_name: profile?.full_name ?? data.user.user_metadata?.full_name ?? "Pengguna CiviGo",
          role: profile?.role ?? "user",
          agency_id: profile?.agency_id ?? null,
          location_id: profile?.location_id ?? null,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
          token_type: "bearer",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[LOGIN_INTERNAL_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada server saat memproses login.",
        },
      },
      { status: 500 }
    );
  }
}
