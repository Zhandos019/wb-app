
export type ReportPeriod = {
  start: string;
  end: string;
  label: string;
};

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function generateMonthPeriods(
  year: number,
  month: number
): ReportPeriod[] {
  // month: от 1 до 12
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Месяц должен быть числом от 1 до 12");
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Некорректный год");
  }

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const periods: ReportPeriod[] = [];
  let currentStart = new Date(firstDay);

  while (currentStart <= lastDay) {
    const daysUntilSunday = (7 - currentStart.getDay()) % 7;

    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + daysUntilSunday);

    if (currentEnd > lastDay) {
      currentEnd.setTime(lastDay.getTime());
    }

    periods.push({
      start: toISODate(currentStart),
      end: toISODate(currentEnd),
      label: `${formatDate(currentStart)}–${formatDate(currentEnd)}`,
    });

    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return periods;
}
