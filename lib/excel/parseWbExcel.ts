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

export function parseWbExcel(buffer: ArrayBuffer): DashboardStats {
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

    /**
     * 📦 1. ХРАНЕНИЕ (ОТДЕЛЬНО)
     */
    if (reason.includes("хранение")) {
      totalStorage += storage;
    }

    /**
     * 📊 2. РАСХОДЫ (без трогания хранения)
     */
    const expenses = storage + deductions + logistics + fines;

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

    if (nextType.includes("продажа")) {
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