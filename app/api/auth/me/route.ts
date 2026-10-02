import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/auth/me
 *
 * Mengambil profil akun pengguna yang sedang login saat ini.
 * Otomatis mendeteksi token Bearer dari header Authorization (Mobile)
 * ataupun Cookie session (Web).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : undefined;

    const supabase = await createClient();
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

    const serviceDb = createServiceClient();
    const { data: profile } = await serviceDb
      .from("users")
      .select("id, email, nik, full_name, role, agency_id, location_id, created_at")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email ?? profile?.email ?? "",
          nik: profile?.nik ?? user.user_metadata?.nik ?? null,
          full_name: profile?.full_name ?? user.user_metadata?.full_name ?? "Pengguna CiviGo",
          role: profile?.role ?? "user",
          agency_id: profile?.agency_id ?? null,
          location_id: profile?.location_id ?? null,
          created_at: profile?.created_at ?? user.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AUTH_ME_INTERNAL_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada server saat memverifikasi profil pengguna.",
        },
      },
      { status: 500 }
    );
  }
}
