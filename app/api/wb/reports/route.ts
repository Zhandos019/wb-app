
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSubscriptionAccess } from "@/lib/subscription";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Необходима авторизация" },
      { status: 401 }
    );
  }
  const subscription = await getSubscriptionAccess(user.id);

  if (!subscription.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Пробный период завершён или подписка неактивна",
        code: "SUBSCRIPTION_REQUIRED",
        reason: subscription.reason,
        endsAt: subscription.endsAt,
      },
      { status: 403 }
    );
  }
  const apiToken = process.env.WB_API_TOKEN;

  if (!apiToken) {
    return NextResponse.json(
      { success: false, error: "WB_API_TOKEN не настроен" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (
    !dateFrom ||
    !dateTo ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateTo) ||
    dateFrom > dateTo
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Укажите корректные даты dateFrom и dateTo в формате YYYY-MM-DD",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      "https://finance-api.wildberries.ru/api/finance/v1/sales-reports/list",
      {
        method: "POST",
        headers: {
          Authorization: apiToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          dateFrom,
          dateTo,
          limit: 1000,
          offset: 0,
          period: "weekly",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      }
    );

    if (response.status === 204) {
      return NextResponse.json({
        success: true,
        reports: [],
        count: 0,
      });
    }

    const text = await response.text();

    if (!response.ok) {
      const retryAfter = response.headers.get("X-RateLimit-Retry");

      console.error(
        "WB reports list error:",
        response.status,
        text.slice(0, 500)
      );

      return NextResponse.json(
        {
          success: false,
          error:
            response.status === 429
              ? "Wildberries ограничил частоту запросов. Подождите перед повторной попыткой."
              : "Не удалось получить список отчётов Wildberries",
          status: response.status,
          retryAfter,
        },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const data: unknown = text ? JSON.parse(text) : [];

    if (!Array.isArray(data)) {
      return NextResponse.json(
        {
          success: false,
          error: "Wildberries вернул неожиданный формат списка отчётов",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      reports: data,
    });
  } catch (error) {
    console.error("WB reports list request failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Не удалось подключиться к Wildberries",
      },
      { status: 500 }
    );
  }
}
