import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const PHONE_PATTERN = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface UpdateProfileBody {
  phone_number?: string;
  email?: string;
  push_token?: string;
}

/**
 * PATCH /api/auth/profile
 *
 * Mengubah informasi kontak pengguna (nomor telepon, email, dan/atau Expo push token).
 * Mendukung autentikasi via Bearer token (Mobile) atau Cookie session (Web).
 */
export async function PATCH(request: NextRequest) {
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

    let body: UpdateProfileBody;
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

    const { phone_number, email, push_token } = body;

    if (phone_number === undefined && email === undefined && push_token === undefined) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NO_FIELDS_PROVIDED",
            message: "Harap masukkan nomor telepon, email, atau push token yang ingin diperbarui.",
          },
        },
        { status: 400 }
      );
    }

    const serviceDb = createServiceClient();
    const updateData: Record<string, any> = {};
    const metadataUpdate: Record<string, any> = { ...user.user_metadata };

    // 1. Validasi & Penanganan Nomor Telepon
    if (phone_number !== undefined) {
      const cleanPhone = phone_number.trim().replace(/[-\s]/g, "");

      if (!cleanPhone) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "INVALID_PHONE",
              message: "Nomor telepon tidak boleh kosong.",
            },
          },
          { status: 400 }
        );
      }

      if (!PHONE_PATTERN.test(cleanPhone)) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "INVALID_PHONE_FORMAT",
              message: "Format nomor telepon tidak valid. Gunakan format nomor ponsel Indonesia (contoh: 08123456789).",
            },
          },
          { status: 400 }
        );
      }

      metadataUpdate.phone_number = cleanPhone;
      updateData.phone = cleanPhone;
    }

    // 2. Validasi & Penanganan Email
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "INVALID_EMAIL",
              message: "Alamat email tidak boleh kosong.",
            },
          },
          { status: 400 }
        );
      }

      if (!EMAIL_PATTERN.test(cleanEmail)) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "INVALID_EMAIL_FORMAT",
              message: "Format email tidak valid.",
            },
          },
          { status: 400 }
        );
      }

      if (cleanEmail !== user.email?.toLowerCase()) {
        // Cek apakah email sudah terdaftar di akun lain
        const { data: existingUser } = await serviceDb
          .from("users")
          .select("id")
          .eq("email", cleanEmail)
          .neq("id", user.id)
          .maybeSingle();

        if (existingUser) {
          return NextResponse.json(
            {
              ok: false,
              error: {
                code: "EMAIL_ALREADY_EXISTS",
                message: "Alamat email ini sudah digunakan oleh akun lain.",
              },
            },
            { status: 409 }
          );
        }

        updateData.email = cleanEmail;
      }
    }

    // 3. Penanganan Push Token
    if (push_token !== undefined) {
      metadataUpdate.push_token = push_token.trim();
    }

    // 4. Simpan perubahan ke Supabase Auth
    const { data: updatedAuthUser, error: authUpdateError } =
      await serviceDb.auth.admin.updateUserById(user.id, {
        ...(updateData.email ? { email: updateData.email } : {}),
        user_metadata: metadataUpdate,
      });

    if (authUpdateError) {
      console.error("[PROFILE_UPDATE_AUTH_ERROR]", authUpdateError);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "AUTH_UPDATE_FAILED",
            message: authUpdateError.message || "Gagal memperbarui profil pengguna.",
          },
        },
        { status: 400 }
      );
    }

    // 5. Sinkronisasi tabel public.users jika email berubah
    if (updateData.email) {
      await serviceDb
        .from("users")
        .update({ email: updateData.email })
        .eq("id", user.id);
    }

    return NextResponse.json(
      {
        ok: true,
        message: updateData.email
          ? "Profil berhasil diperbarui. Silakan periksa email baru Anda untuk konfirmasi jika diperlukan."
          : phone_number !== undefined
          ? "Nomor telepon berhasil diperbarui."
          : "Push token berhasil diperbarui.",
        user: {
          id: user.id,
          email: updatedAuthUser.user.email ?? user.email,
          phone_number: metadataUpdate.phone_number ?? null,
          full_name: metadataUpdate.full_name ?? user.user_metadata?.full_name ?? "Pengguna CiviGo",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PROFILE_UPDATE_INTERNAL_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada server saat memperbarui profil.",
        },
      },
      { status: 500 }
    );
  }
}
