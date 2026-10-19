
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
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

    // Проверяем профиль в базе приложения.
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("users")
        .select("id, auth_user_id")
        .ilike("email", email)
        .maybeSingle();

    if (profileError) {
      console.error("Profile lookup failed:", profileError.message);

      return NextResponse.json(
        { success: false, error: "Не удалось проверить email. Попробуйте позже." },
        { status: 500 }
      );
    }

    if (profile?.auth_user_id) {
      const { data: authUser, error: authUserError } =
        await supabaseAdmin.auth.admin.getUserById(profile.auth_user_id);

      if (authUserError) {
        console.error("Auth user lookup failed:", authUserError.message);

        return NextResponse.json(
          { success: false, error: "Не удалось проверить аккаунт. Попробуйте позже." },
          { status: 500 }
        );
      }

      if (authUser.user?.email_confirmed_at) {
        return NextResponse.json(
          {
            success: false,
            error: "Эта почта уже зарегистрирована. Войдите в свой аккаунт или используйте другую почту.",
          },
          { status: 409 }
        );
      }
    }

    // Проверяем Auth, в том числе пользователей без связанного профиля.
    const { data: usersPage, error: listError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (listError) {
      console.error("Auth users lookup failed:", listError.message);

      return NextResponse.json(
        { success: false, error: "Не удалось проверить email. Попробуйте позже." },
        { status: 500 }
      );
    }

    const existingAuthUser = usersPage.users.find(
      (user) => user.email?.toLowerCase() === email
    );

    if (existingAuthUser?.email_confirmed_at) {
      return NextResponse.json(
        {
          success: false,
          error: "Эта почта уже зарегистрирована. Войдите в свой аккаунт или используйте другую почту.",
        },
        { status: 409 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const emailRedirectTo = new URL(
      "/auth/callback",
      req.url
    ).toString();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (error) {
      console.error("Supabase registration failed:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Не удалось начать регистрацию. Попробуйте позже или проверьте настройки email.",
        },
        { status: 400 }
      );
    }

    // Supabase может не сообщать о существовании email
    // в обычном ответе signUp. Не показываем успех, если
    // подтверждённый пользователь уже существовал.
    if (
      existingAuthUser?.id &&
      data.user?.id === existingAuthUser.id &&
      existingAuthUser.email_confirmed_at
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Эта почта уже зарегистрирована. Войдите в свой аккаунт или используйте другую почту.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Если регистрация доступна, код будет отправлен на вашу почту. Проверьте также папку «Спам».",
    });
  } catch (error) {
    console.error("Register failed:", error);

    return NextResponse.json(
      { success: false, error: "Не удалось создать аккаунт. Попробуйте позже." },
      { status: 500 }
    );
  }
}
