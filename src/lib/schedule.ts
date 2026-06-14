import { DEFAULT_ITEM_MS, type ScheduleSlot } from "@/lib/home-mode";

/**
 * Festival-timeline helpers (customer-portal §3.3, R3.6). Pure + DB-free. Now/next itself lives in
 * `home-mode.ts` (`resolveNowNext`); this adds the per-item phase, day grouping, and stage list the
 * live timeline renders. `now` is injectable so the now-line is unit-testable.
 */

export type Phase = "done" | "live" | "soon" | "upcoming";

/** Items starting within this window read as "starting soon". */
export const SOON_MS = 30 * 60 * 1000;

const itemEnd = (s: ScheduleSlot) => (s.endsAt ?? new Date(s.startsAt.getTime() + DEFAULT_ITEM_MS)).getTime();

export function itemPhase(item: ScheduleSlot, now: Date = new Date()): Phase {
  const t = now.getTime();
  const start = item.startsAt.getTime();
  if (t >= itemEnd(item)) return "done";
  if (t >= start) return "live";
  if (start - t <= SOON_MS) return "soon";
  return "upcoming";
}

/** Local day key (YYYY-M-D) so multi-day festivals group correctly across midnight. */
export const dayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export interface ScheduleDay<T extends ScheduleSlot> { key: string; date: Date; items: T[] }

/** Group sorted items into days (preserving order); each day keeps the first item's date. */
export function groupByDay<T extends ScheduleSlot>(items: T[]): ScheduleDay<T>[] {
  const map = new Map<string, ScheduleDay<T>>();
  for (const it of items) {
    const k = dayKey(it.startsAt);
    const day = map.get(k);
    if (day) day.items.push(it);
    else map.set(k, { key: k, date: it.startsAt, items: [it] });
  }
  return [...map.values()];
}

/** Distinct stage/zone names in first-seen order (the filter chips). */
export function stagesOf(items: ScheduleSlot[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const s = it.stageOrZone?.trim();
    if (s && !seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out;
}
