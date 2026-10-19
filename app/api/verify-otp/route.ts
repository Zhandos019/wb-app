
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const token =
      typeof body.token === "string" ? body.token.trim() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Введите корректный email" },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { success: false, error: "Введите шестизначный код" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error || !data.user || !data.user.email_confirmed_at) {
      return NextResponse.json(
        {
          success: false,
          error: "Неверный или просроченный код. Проверьте код и попробуйте снова.",
        },
        { status: 400 }
      );
    }

    const { error: linkError } = await supabaseAdmin.rpc(
      "link_confirmed_auth_user",
      {
        p_auth_user_id: data.user.id,
        p_email: data.user.email,
      }
    );

    if (linkError) {
      console.error("Account linking failed:", linkError.message);

      return NextResponse.json(
        {
          success: false,
          error: "Email подтверждён, но профиль не удалось создать. Обратитесь в поддержку.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email подтверждён.",
    });
  } catch (error) {
    console.error("OTP verification failed:", error);

    return NextResponse.json(
      { success: false, error: "Не удалось проверить код. Попробуйте позже." },
      { status: 500 }
    );
  }
}
