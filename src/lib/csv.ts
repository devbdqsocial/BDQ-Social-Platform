/** Minimal RFC-4180 CSV builder. Values are stringified; quotes/commas/newlines are escaped. */

export interface CsvColumn<T> {
  key: keyof T | string;
  label: string;
  get?: (row: T) => unknown;
}

function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => cell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => cell(c.get ? c.get(r) : r[c.key as keyof T])).join(","));
  return [header, ...body].join("\r\n");
}
