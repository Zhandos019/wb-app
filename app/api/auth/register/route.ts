
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RegisterBody = {
  email?: unknown;
  password?: unknown;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Введите корректный email" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Пароль должен быть не короче 8 символов",
        },
        { status: 400 }
      );
    }

    const { data: existingUser, error: lookupError } =
      await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (lookupError) {
      console.error("Register lookup failed:", lookupError.message);

      return NextResponse.json(
        { success: false, error: "Не удалось проверить пользователя" },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Пользователь с таким email уже существует",
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "Пользователь с таким email уже существует",
          },
          { status: 409 }
        );
      }

      console.error("Register insert failed:", insertError.message);

      return NextResponse.json(
        {
          success: false,
          error: "Не удалось создать аккаунт. Попробуйте позже.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не удалось создать аккаунт. Проверьте настройки сервера.",
      },
      { status: 500 }
    );
  }
}
