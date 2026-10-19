
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { AUTH_COOKIE, getAuthCookieOptions } from "@/lib/auth";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase logout failed:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Не удалось завершить сессию. Попробуйте ещё раз.",
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ success: true });

    // Удаляем cookie старой системы авторизации.
    response.cookies.set(AUTH_COOKIE, "", {
      ...getAuthCookieOptions(0),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не удалось выйти из аккаунта.",
      },
      { status: 500 }
    );
  }
}
