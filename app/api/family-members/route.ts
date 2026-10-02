import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const NIK_PATTERN = /^[0-9]{16}$/;

/**
 * GET /api/family-members
 *
 * Mengambil daftar anggota keluarga milik pengguna yang sedang login.
 * Query param opsional: ?user_id=... (jika diakses dengan role admin/service)
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
    } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get("user_id");

    const targetUserId = user?.id ?? queryUserId;

    if (!targetUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Silakan login terlebih dahulu untuk mengakses data anggota keluarga.",
          },
        },
        { status: 401 }
      );
    }

    const serviceDb = createServiceClient();
    const { data: familyMembers, error } = await serviceDb
      .from("family_members")
      .select("id, user_id, full_name, nik, relationship, created_at")
      .eq("user_id", targetUserId)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FETCH_FAILED",
            message: error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        count: familyMembers?.length ?? 0,
        family_members: familyMembers ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: (error as Error).message || "Gagal memproses data anggota keluarga.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/family-members
 *
 * Menambahkan anggota keluarga baru untuk pendaftaran layanan perwakilan.
 * Body: { full_name: string, nik: string, relationship: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : undefined;

    const supabase = await createClient();
    const {
      data: { user },
    } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    let body: {
      full_name?: string;
      nik?: string;
      relationship?: string;
      user_id?: string;
    };

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

    const targetUserId = user?.id ?? body.user_id;

    if (!targetUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Silakan login terlebih dahulu untuk menambahkan anggota keluarga.",
          },
        },
        { status: 401 }
      );
    }

    const fullName = body.full_name?.trim();
    const nik = body.nik?.trim();
    const relationship = body.relationship?.trim() || "Keluarga";

    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_NAME",
            message: "Nama lengkap anggota keluarga minimal 2 karakter.",
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
            message: "NIK anggota keluarga harus berupa 16 digit angka.",
          },
        },
        { status: 400 }
      );
    }

    const serviceDb = createServiceClient();
    const { data: inserted, error: insertError } = await serviceDb
      .from("family_members")
      .insert({
        user_id: targetUserId,
        full_name: fullName,
        nik,
        relationship,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INSERT_FAILED",
            message: insertError.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Anggota keluarga berhasil ditambahkan.",
        family_member: inserted,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: (error as Error).message || "Terjadi kesalahan internal.",
        },
      },
      { status: 500 }
    );
  }
}
