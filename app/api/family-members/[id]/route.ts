import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * DELETE /api/family-members/[id]
 *
 * Menghapus data anggota keluarga milik pengguna.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const memberId = Number(id);

    if (!Number.isInteger(memberId) || memberId < 1) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_ID",
            message: "ID anggota keluarga harus berupa angka positif.",
          },
        },
        { status: 400 }
      );
    }

    const authHeader = _request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : undefined;

    const supabase = await createClient();
    const {
      data: { user },
    } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Silakan login terlebih dahulu untuk menghapus data anggota keluarga.",
          },
        },
        { status: 401 }
      );
    }

    const serviceDb = createServiceClient();

    // Hapus anggota keluarga strictly milik user yang sedang login
    const { data: deleted, error } = await serviceDb
      .from("family_members")
      .delete()
      .eq("id", memberId)
      .eq("user_id", user.id)
      .select("id");

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DELETE_FAILED",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MEMBER_NOT_FOUND",
            message: "Data anggota keluarga tidak ditemukan atau bukan milik akun Anda.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Data anggota keluarga berhasil dihapus.",
      },
      { status: 200 }
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
