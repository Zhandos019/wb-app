"use client";

import { FileSpreadsheet, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { parseWbExcel } from "@/lib/excel/parseWbExcel";
import type { DashboardStats } from "@/lib/excel/types";

type ExcelUploadProps = {
  onData: (stats: DashboardStats) => void;
  onError: (message: string | null) => void;
  userId?: number | string;
};

function combineStats(
  first: DashboardStats,
  second: DashboardStats
): DashboardStats {
  const chartMap = new Map<string, number>();

  for (const item of first.chart) {
    chartMap.set(item.name, (chartMap.get(item.name) ?? 0) + item.sales);
  }

  for (const item of second.chart) {
    chartMap.set(item.name, (chartMap.get(item.name) ?? 0) + item.sales);
  }

  const chart = [...chartMap.entries()]
    .filter(([name, sales]) => name !== "Без артикула" && sales !== 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, sales]) => ({
      name,
      sales,
    }));

  const totalSales = first.totalSales + second.totalSales;
  const orders = first.orders + second.orders;

  return {
    totalSales,
    orders,
    avgCheck: orders ? totalSales / orders : 0,
    profit: first.profit + second.profit,
    chart,
    storage: first.storage + second.storage,
  };
}

export function ExcelUpload({
  onData,
  onError,
  userId,
}: ExcelUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  async function processFiles(selectedFiles: File[]) {
    if (!selectedFiles.length) return;

    if (selectedFiles.length > 2) {
      onError("Можно загрузить максимум 2 Excel-файла");
      return;
    }

    setLoading(true);
    onError(null);

    try {
      const parsedStats: DashboardStats[] = [];

      for (const file of selectedFiles) {
        const buffer = await file.arrayBuffer();
        const stats = parseWbExcel(buffer);

        parsedStats.push(stats);

        if (userId) {
          const formData = new FormData();

          formData.append("file", file);
          formData.append("userId", String(userId));

          await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
        }
      }

      let combinedStats = parsedStats[0];

      if (parsedStats.length === 2) {
        combinedStats = combineStats(
          parsedStats[0],
          parsedStats[1]
        );
      }

      onData(combinedStats);
      setFiles(selectedFiles);
    } catch (err) {
      setFiles([]);
      onError(
        err instanceof Error
          ? err.message
          : "Ошибка чтения файла"
      );
    } finally {
      setLoading(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? []);

    if (selectedFiles.length) {
      void processFiles(selectedFiles);
    }

    // Позволяет повторно выбрать тот же файл
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) =>
        file.name.toLowerCase().endsWith(".xlsx") ||
        file.name.toLowerCase().endsWith(".xls")
    );

    if (!droppedFiles.length) {
      onError("Можно загружать только Excel-файлы");
      return;
    }

    void processFiles(droppedFiles.slice(0, 2));
  }

  function removeFile(index: number) {
    const newFiles = files.filter((_, i) => i !== index);

    setFiles(newFiles);
    onError(null);

    if (newFiles.length === 0) {
      inputRef.current?.click();
      return;
    }

    void processFiles(newFiles);
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-6 py-8 transition-colors hover:border-violet-400 hover:bg-violet-50/70"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
        {loading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        ) : (
          <Upload className="h-6 w-6" />
        )}
      </div>

      <p className="mt-4 text-center text-sm font-semibold text-slate-800">
        Загрузить отчёт Excel
      </p>

      <p className="mt-1 text-center text-xs text-slate-500">
        Перетащите до 2 файлов .xlsx или нажмите для выбора
      </p>

      {files.length > 0 && (
        <div className="mt-4 flex w-full max-w-[320px] flex-col gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-violet-500" />

                <span className="truncate">
                  {file.name}
                </span>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => removeFile(index)}
                className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={loading || files.length >= 2}
        onClick={() => inputRef.current?.click()}
        className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
      >
        {loading
          ? "Обработка…"
          : files.length >= 2
            ? "Загружено 2 файла"
            : files.length === 1
              ? "Добавить второй файл"
              : "Выбрать файл"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        multiple
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}