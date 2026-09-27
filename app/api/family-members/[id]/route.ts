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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const serviceDb = createServiceClient();

    // Pastikan anggota keluarga milik user yang bersangkutan (jika ada sesi login)
    let query = serviceDb.from("family_members").delete().eq("id", memberId);

    if (user) {
      query = query.eq("user_id", user.id);
    }

    const { error } = await query;

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
