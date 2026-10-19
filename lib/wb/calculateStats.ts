
import type { DashboardStats } from "@/lib/excel/types";

type WbOperation = {
  vendorCode?: string;
  vendor_code?: string;
  supplier_oper_name?: string;
  sellerOperName?: string;
  forPay?: number | string;
  for_pay?: number | string;
  deliveryService?: number | string;
  delivery_service?: number | string;
  penalty?: number | string;
  paidStorage?: number | string;
  paid_storage?: number | string;
  deduction?: number | string;
  paidAcceptance?: number | string;
  paid_acceptance?: number | string;
  [key: string]: unknown;
};

function toNumber(value: unknown): number {
  const parsed = Number(
    String(value ?? "0").replace(/\s/g, "").replace(",", ".")
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function getOperation(row: WbOperation): string {
  return String(
    row.supplier_oper_name ?? row.sellerOperName ?? ""
  )
    .trim()
    .toLowerCase();
}

function getArticle(row: WbOperation): string {
  return String(row.vendorCode ?? row.vendor_code ?? "").trim();
}

function getValue(
  row: WbOperation,
  camelCase: string,
  snakeCase?: string
): number {
  return toNumber(
    row[camelCase] ?? (snakeCase ? row[snakeCase] : undefined)
  );
}

export function calculateWbStats(
  rows: WbOperation[]
): DashboardStats {
  const articles = new Map<string, number>();

  let totalSales = 0;
  let orders = 0;
  let storage = 0;

  for (const row of rows) {
    const operation = getOperation(row);

    // Полностью игнорируем возмещение издержек.
    // rebillLogisticCost нигде не используется.
    if (operation.includes("возмещение издержек")) {
      continue;
    }

    const forPay = getValue(row, "forPay", "for_pay");
    const deliveryService = getValue(
      row,
      "deliveryService",
      "delivery_service"
    );
    const penalty = getValue(row, "penalty");
    const paidStorage = getValue(
      row,
      "paidStorage",
      "paid_storage"
    );
    const deduction = getValue(row, "deduction");
    const paidAcceptance = getValue(
      row,
      "paidAcceptance",
      "paid_acceptance"
    );

    // Одна формула для каждой строки отчёта.
    const rowAmount =
      forPay -
      deliveryService -
      penalty -
      paidStorage -
      deduction -
      paidAcceptance;

    totalSales += rowAmount;

    // Количество продаж — только строки с операцией «Продажа».
    if (operation === "продажа") {
      orders += 1;
    }

    // Хранение учитываем отдельно для карточки расходов.
    if (operation.includes("хранение")) {
      storage += Math.abs(paidStorage);
    }

    // В график попадают суммы только строк с артикулом.
    const article = getArticle(row);

    if (article) {
      articles.set(
        article,
        (articles.get(article) ?? 0) + rowAmount
      );
    }
  }

  const chart = [...articles.entries()]
    .filter(([name, amount]) => name !== "Без артикула" && amount !== 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, sales]) => ({ name, sales }));

  return {
    totalSales,
    orders,
    avgCheck: orders > 0 ? totalSales / orders : 0,
    profit: totalSales,
    chart,
    storage: -storage,
  };
}
