
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encryptWbToken } from "@/lib/wbTokenCrypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: "Необходимо войти в аккаунт" },
      { status: 401 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("wb_connections")
    .select("status, token_last4, last_checked_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("WB connection lookup failed:", error.message);
    return NextResponse.json(
      { error: "Не удалось получить статус подключения" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    connected: data?.status === "connected",
    status: data?.status ?? "disconnected",
    tokenLast4: data?.token_last4 ?? null,
    lastCheckedAt: data?.last_checked_at ?? null,
  });
}

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: "Необходимо войти в аккаунт" },
      { status: 401 }
    );
  }

  let body: { token?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректный формат запроса" },
      { status: 400 }
    );
  }

  if (
    typeof body.token !== "string" ||
    !body.token.trim() ||
    body.token.trim().length > 5000
  ) {
    return NextResponse.json(
      { error: "Вставьте корректный токен Wildberries" },
      { status: 400 }
    );
  }

  const token = body.token.trim();

  let wbResponse: Response;

  try {
    wbResponse = await fetch(
      "https://common-api.wildberries.ru/ping",
      {
        method: "GET",
        headers: {
          Authorization: token,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Не удалось связаться с Wildberries. Попробуйте позже.",
      },
      { status: 502 }
    );
  }

  if (!wbResponse.ok) {
    if (wbResponse.status === 401 || wbResponse.status === 403) {
      return NextResponse.json(
        {
          error:
            "Wildberries отклонил токен. Проверьте его правильность и права доступа.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Wildberries не подтвердил токен. Попробуйте позже.",
      },
      { status: 502 }
    );
  }

  let encrypted: ReturnType<typeof encryptWbToken>;

  try {
    encrypted = encryptWbToken(token);
  } catch (error) {
    console.error(
      "WB token encryption failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Не удалось безопасно сохранить токен" },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("wb_connections")
    .upsert(
      {
        user_id: user.id,
        token_encrypted: encrypted.encrypted,
        token_iv: encrypted.iv,
        token_auth_tag: encrypted.authTag,
        token_last4: token.slice(-4),
        status: "connected",
        last_checked_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("WB connection save failed:", error.message);

    return NextResponse.json(
      { error: "Не удалось сохранить подключение" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    connected: true,
    tokenLast4: token.slice(-4),
    lastCheckedAt: now,
    message: "Токен проверен и сохранён",
  });
}
