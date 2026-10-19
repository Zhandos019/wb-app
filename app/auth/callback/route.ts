
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", requestUrl.origin)
    );
  }

  const supabase = await createSupabaseServerClient();

  // Обмениваем код подтверждения на сессию Supabase
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(
      "Email confirmation failed:",
      exchangeError.message
    );

    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", requestUrl.origin)
    );
  }

  // Получаем пользователя непосредственно из Supabase Auth
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError ||
    !user ||
    !user.email ||
    !user.email_confirmed_at
  ) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", requestUrl.origin)
    );
  }

  // Связываем подтверждённый аккаунт с записью приложения
  const { error: linkError } = await supabaseAdmin.rpc(
    "link_confirmed_auth_user",
    {
      p_auth_user_id: user.id,
      p_email: user.email,
    }
  );

  if (linkError) {
    console.error(
      "Account linking failed:",
      linkError.message
    );

    return NextResponse.redirect(
      new URL("/login?error=account_link_failed", requestUrl.origin)
    );
  }

  return NextResponse.redirect(
    new URL("/login?confirmed=1", requestUrl.origin)
  );
}
