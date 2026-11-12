import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    let body: { refresh_token?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          status: "error",
          error: {
            code: "INVALID_JSON",
            message: "Body request harus berupa JSON yang valid.",
          },
        },
        { status: 400 }
      );
    }

    const refreshToken = body.refresh_token;
    if (!refreshToken) {
      return NextResponse.json(
        {
          status: "error",
          error: {
            code: "MISSING_REFRESH_TOKEN",
            message: "refresh_token wajib disertakan.",
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return NextResponse.json(
        {
          status: "error",
          error: {
            code: "INVALID_REFRESH_TOKEN",
            message: error?.message || "Sesi refresh token tidak valid atau kedaluwarsa.",
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        data: {
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: {
          code: "INTERNAL_ERROR",
          message: (error as Error).message || "Terjadi kesalahan pada server.",
        },
      },
      { status: 500 }
    );
  }
}
