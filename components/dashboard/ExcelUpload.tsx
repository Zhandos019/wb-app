"use client";

import { FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { parseWbExcel } from "@/lib/excel/parseWbExcel";
import type { DashboardStats } from "@/lib/excel/types";

type ExcelUploadProps = {
  onData: (stats: DashboardStats) => void;
  onError: (message: string | null) => void;
};

export function ExcelUpload({ onData, onError }: ExcelUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    onError(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const stats = parseWbExcel(buffer);
      onData(stats);
    } catch (err) {
      setFileName(null);
      onError(err instanceof Error ? err.message : "Ошибка чтения файла");
    } finally {
      setLoading(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
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
        Перетащите .xlsx или нажмите для выбора
      </p>

      {fileName && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          <FileSpreadsheet className="h-4 w-4 text-violet-500" />
          <span className="max-w-[200px] truncate">{fileName}</span>
        </div>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
      >
        {loading ? "Обработка…" : "Выбрать файл"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
