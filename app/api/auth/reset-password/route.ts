import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface ResetPasswordRequest {
  email?: string;
  password: string;
  code?: string;
  access_token?: string;
}

/**
 * POST /api/auth/reset-password
 *
 * Mengubah kata sandi pengguna HANYA saat user telah login (authenticated)
 * dan HANYA untuk akun miliknya sendiri.
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

    // 1. Verifikasi Autentikasi Sesi Aktif (Bearer token atau cookie)
    const authHeader = request.headers.get("authorization");
    const token =
      body.access_token ||
      (authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7).trim()
        : undefined);

    const supabase = await createClient();
    let authenticatedUser: { id: string; email?: string } | null = null;

    if (token) {
      const {
        data: { user: tokenUser },
      } = await supabase.auth.getUser(token);
      if (tokenUser) {
        authenticatedUser = tokenUser;
      }
    }

    if (!authenticatedUser) {
      const {
        data: { user: cookieUser },
      } = await supabase.auth.getUser();
      if (cookieUser) {
        authenticatedUser = cookieUser;
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message:
              "Sesi tidak valid. Anda harus login terlebih dahulu untuk mereset kata sandi.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Verifikasi Kepemilikan Akun (Hanya akun milik user itu sendiri)
    if (body.email) {
      let userEmail = authenticatedUser.email?.toLowerCase();
      if (!userEmail) {
        const serviceClient = createServiceClient();
        const { data: dbUser } = await serviceClient
          .from("users")
          .select("email")
          .eq("id", authenticatedUser.id)
          .maybeSingle();
        if (dbUser?.email) {
          userEmail = dbUser.email.toLowerCase();
        }
      }

      const requestedEmail = body.email.trim().toLowerCase();
      if (!userEmail || requestedEmail !== userEmail) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "FORBIDDEN",
              message: "Anda hanya dapat mereset kata sandi akun Anda sendiri.",
            },
          },
          { status: 403 }
        );
      }
    }

    // 3. Update kata sandi pengguna yang terautentikasi (selalu dikunci ke authenticatedUser.id)
    let updateError: { code?: string; message?: string } | null = null;
    if (token) {
      try {
        const serviceClient = createServiceClient();
        const adminRes = await serviceClient.auth.admin.updateUserById(
          authenticatedUser.id,
          { password }
        );
        updateError = adminRes?.error ?? null;
      } catch {
        const fallbackResult = await supabase.auth.updateUser({ password });
        updateError = fallbackResult?.error ?? null;
      }
    } else {
      const updateResult = await supabase.auth.updateUser({
        password,
      });

      if (updateResult && updateResult.error) {
        try {
          const serviceClient = createServiceClient();
          const adminRes = await serviceClient.auth.admin.updateUserById(
            authenticatedUser.id,
            { password }
          );
          updateError = adminRes?.error ?? null;
        } catch {
          updateError = updateResult.error;
        }
      } else if (!updateResult) {
        try {
          const serviceClient = createServiceClient();
          const adminRes = await serviceClient.auth.admin.updateUserById(
            authenticatedUser.id,
            { password }
          );
          updateError = adminRes?.error ?? null;
        } catch {
          updateError = null;
        }
      }
    }

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
        message:
          "Kata sandi Anda berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.",
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
          message: "Terjadi kesalahan pada server saat memperbarui kata sandi.",
        },
      },
      { status: 500 }
    );
  }
}
