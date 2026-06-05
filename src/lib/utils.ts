import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse a pagination `skip` query param to a safe non-negative integer (NaN/negatives → 0). */
export function parseSkip(v: string | null): number {
  const n = Math.floor(Number(v ?? "0"));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Format integer paise as INR. Money is always Int paise (see Docs/SCHEMA.md). */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100)
}
