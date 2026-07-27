// CSV 생성/다운로드 (외부 라이브러리 없이)

export interface CsvColumn<T> {
  key: string; // 열 머리글 (한국어)
  value: (row: T) => string | number | boolean | null | undefined;
}

// 값 하나를 CSV 규칙에 맞게 감싼다 (쉼표·따옴표·줄바꿈 처리)
function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// 행 목록 → CSV 문자열
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.key)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(","));
  return [header, ...body].join("\r\n");
}

// CSV 문자열을 파일로 내려받는다.
// 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다.
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 파일명에 붙일 날짜 (2026-07-27)
export function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
