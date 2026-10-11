
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  AUTH_COOKIE,
  getAuthCookieOptions,
  getJwtSecret,
  signAuthToken,
} from "@/lib/auth";

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
        { success: false, error: "Введите email и пароль" },
        { status: 400 }
      );
    }

    const secret = getJwtSecret();

    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Сервер авторизации не настроен" },
        { status: 500 }
      );
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Login lookup failed:", error.message);

      return NextResponse.json(
        { success: false, error: "Не удалось выполнить вход. Попробуйте позже." },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    const token = signAuthToken(
      {
        id: Number(user.id),
        email: user.email,
      },
      secret
    );

    const response = NextResponse.json({ success: true });

    response.cookies.set(
      AUTH_COOKIE,
      token,
      getAuthCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("Login failed:", error);

    return NextResponse.json(
      { success: false, error: "Не удалось войти. Проверьте настройки сервера." },
      { status: 500 }
    );
  }
}
