
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const AUTH_COOKIE = "wb_auth";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export type AuthUser = {
  id: number;
  email: string;
};

export function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not configured");
    return null;
  }

  return secret;
}

export function getAuthCookieOptions(maxAge = TOKEN_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export function signAuthToken(user: AuthUser, secret: string) {
  return jwt.sign(
    { id: user.id, email: user.email },
    secret,
    { expiresIn: TOKEN_MAX_AGE }
  );
}

export async function getAuthUser(): Promise<AuthUser | null> {
  // Новый способ: проверяем сессию Supabase Auth.
  await cookies();
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      // Находим внутренний числовой ID пользователя.
      const { data: dbUser, error: dbError } =
        await supabaseAdmin
          .from("users")
          .select("id, email")
          .eq("auth_user_id", user.id)
          .maybeSingle();

      if (dbError) {
        console.error(
          "Failed to find linked user:",
          dbError.message
        );
        return null;
      }

      // Нет связи с public.users — не считаем пользователя
      // авторизованным в аналитическом приложении.
      if (!dbUser) {
        return null;
      }

      return {
        id: Number(dbUser.id),
        email: dbUser.email,
      };
    }
  } catch (error) {
    console.error("Supabase session check failed:", error);
  }

  // Временная совместимость со старыми JWT-сессиями.
  const secret = getJwtSecret();

  if (!secret) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret);

    if (typeof payload !== "object" || payload === null) {
      return null;
    }

    const id = Number((payload as jwt.JwtPayload).id);
    const email = (payload as jwt.JwtPayload).email;

    if (
      !Number.isInteger(id) ||
      typeof email !== "string" ||
      !email
    ) {
      return null;
    }

    return { id, email };
  } catch {
    return null;
  }
}
