/** Pure analytics rollups (no db) — unit-testable. Money stays integer paise. */

export interface DayBucket {
  day: string; // YYYY-MM-DD
  orders: number;
  revenue: number; // paise
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Bucket paid orders into the last `days` days (oldest→newest), filling empty days with zeros. */
export function bucketByDay(orders: { createdAt: Date; total: number }[], days: number): DayBucket[] {
  const map = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const k = dayKey(o.createdAt);
    const cur = map.get(k) ?? { orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += o.total;
    map.set(k, cur);
  }

  const out: DayBucket[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const cur = map.get(k) ?? { orders: 0, revenue: 0 };
    out.push({ day: k, orders: cur.orders, revenue: cur.revenue });
  }
  return out;
}

export interface TallyRow {
  key: string;
  count: number;
  sum: number;
}

/** Group items by a key, counting and summing an (optional) amount; sorted by count desc. */
export function tally<T>(items: T[], keyFn: (t: T) => string | null | undefined, amountFn?: (t: T) => number): TallyRow[] {
  const map = new Map<string, { count: number; sum: number }>();
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    const cur = map.get(k) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += amountFn ? amountFn(it) : 0;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, count: v.count, sum: v.sum }))
    .sort((a, b) => b.count - a.count);
}
