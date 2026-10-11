import * as XLSX from "xlsx";
import type { DashboardStats } from "./types";

function num(v: unknown): number {
  const n = parseFloat(
    String(v ?? "0")
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  return isNaN(n) ? 0 : n;
}

function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;

    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }

  const text = String(value).trim();

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const ru = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (ru) return `${ru[3]}-${ru[2]}-${ru[1]}`;

  return null;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export function parseWbExcel(
  buffer: ArrayBuffer,
  periodStart?: string,
  periodEnd?: string
): DashboardStats {
  const wb = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const sheet = wb.Sheets[wb.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: "",
  });

  if (!rows.length) {
    throw new Error("Файл пустой");
  }

  if (periodStart && periodEnd) {
    const invalidDates: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rawDate = rows[i]["Дата продажи"];

      // Пустые даты пропускаем
      if (rawDate === "") continue;

      const saleDate = parseDate(rawDate);

      if (!saleDate) {
        invalidDates.push(`строка ${i + 2}: не удалось распознать дату`);
      } else if (saleDate < periodStart || saleDate > periodEnd) {
        invalidDates.push(`строка ${i + 2}: ${formatDate(saleDate)}`);
      }

      if (invalidDates.length >= 10) break;
    }

    if (invalidDates.length > 0) {
      throw new Error(
        `Дата продажи не соответствует периоду ${formatDate(periodStart)}–${formatDate(periodEnd)}. Проверьте строки: ${invalidDates.join("; ")}. Отчёт не сохранён.`
      );
    }
  }

  const byArticle = new Map<string, number>();

  let totalRevenue = 0;
  let orders = 0;
  let totalStorage = 0;

  for (let i = 0; i < rows.length; i++) {
    const currentRow = rows[i];
    const nextRow = rows[i + 1];

    const reason = String(
      currentRow["Обоснование для оплаты"] || ""
    ).toLowerCase();


    const storage = num(currentRow["Хранение"]);
    const deductions = num(currentRow["Удержания"]);
    const logistics = num(
      currentRow["Услуги по доставке товара покупателю"]
    );
    const fines = num(currentRow["Общая сумма штрафов"]);
    const acceptance = num(currentRow["Операции на приемке"]);

    /**
     * 📦 1. ХРАНЕНИЕ (ОТДЕЛЬНО)
     */
    if (reason.includes("хранение")) {
      totalStorage += storage;
    }

    /**
     * 📊 2. РАСХОДЫ (без трогания хранения)
     */
    const expenses =
  storage + deductions + logistics + fines + acceptance;

    /**
     * 📦 3. ПРОДАЖИ (как у тебя)
     */
    let nextCE = 0;
    let nextType = "";

    if (nextRow) {
      nextType = String(nextRow["Тип документа"] || "").toLowerCase();

      const nextAH = num(
        nextRow["К перечислению Продавцу за реализованный Товар"]
      );

      if (nextType.includes("продажа")) {
        nextCE = nextAH;
      }

      if (nextType.includes("возврат")) {
        nextCE = -nextAH;
      }
    }

    const finalMoney = nextCE - expenses;

    totalRevenue += finalMoney;

    if (reason.includes("продажа")) {
  orders += 1;
}

    /**
     * 📦 4. ТОЛЬКО ТОВАРЫ (БЕЗ ХРАНЕНИЯ)
     */
    const isStorage = reason.includes("хранение");

    if (!isStorage) {
      const article = String(
        currentRow?.["Артикул поставщика"] ||
          nextRow?.["Артикул поставщика"] ||
          "Без артикула"
      );
    
      const prev = byArticle.get(article) || 0;
      byArticle.set(article, prev + finalMoney);
    };
  }

  const chart = [...byArticle.entries()]
    .filter(([name, sales]) => name !== "Без артикула" && sales !== 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, sales]) => ({
      name,
      sales,
    }));

  return {
    totalSales: totalRevenue,
    orders,
    avgCheck: orders ? totalRevenue / orders : 0,
    profit: totalRevenue,
    chart,
    storage: -totalStorage,
  };
}