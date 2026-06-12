import { describe, it, expect } from "vitest";
import { bucketByDay, tally } from "./analytics-buckets";

describe("bucketByDay", () => {
  it("returns one bucket per day, newest last, with zeros filled", () => {
    const out = bucketByDay([], 7);
    expect(out).toHaveLength(7);
    expect(out.every((b) => b.orders === 0 && b.revenue === 0)).toBe(true);
  });

  it("sums today's orders + revenue", () => {
    const now = new Date();
    const out = bucketByDay(
      [
        { createdAt: now, total: 49900 },
        { createdAt: now, total: 89900 },
      ],
      3,
    );
    const today = out[out.length - 1];
    expect(today.orders).toBe(2);
    expect(today.revenue).toBe(139800);
  });
});

describe("tally", () => {
  it("counts + sums by key, sorted by count desc, skipping empty keys", () => {
    const rows = tally(
      [
        { src: "instagram", amt: 100 },
        { src: "instagram", amt: 200 },
        { src: "google", amt: 50 },
        { src: null, amt: 9 },
      ],
      (r) => r.src,
      (r) => r.amt,
    );
    expect(rows).toEqual([
      { key: "instagram", count: 2, sum: 300 },
      { key: "google", count: 1, sum: 50 },
    ]);
  });
});
