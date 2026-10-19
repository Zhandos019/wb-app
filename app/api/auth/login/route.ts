
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody;

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!email || !isValidEmail(email) || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Введите корректный email и пароль",
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error || !data.user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Не удалось войти. Проверьте email и пароль, а также подтвердите email по ссылке из письма.",
        },
        { status: 401 }
      );
    }

    const { data: dbUser, error: dbError } =
      await supabaseAdmin
        .from("users")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

    if (dbError) {
      console.error(
        "Login user lookup failed:",
        dbError.message
      );

      await supabase.auth.signOut();

      return NextResponse.json(
        {
          success: false,
          error: "Не удалось загрузить профиль. Попробуйте позже.",
        },
        { status: 500 }
      );
    }

    if (!dbUser) {
      await supabase.auth.signOut();

      return NextResponse.json(
        {
          success: false,
          error:
            "Профиль не связан с аккаунтом. Подтвердите email по ссылке из письма или обратитесь в поддержку.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не удалось войти. Попробуйте позже.",
      },
      { status: 500 }
    );
  }
}
