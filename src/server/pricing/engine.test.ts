import { describe, expect, it } from "vitest";
import { isCouponRedeemable, priceOrder, type CouponState, type LineItem } from "./engine";

const gen = (priceInPaise: number, qty: number, earlyPriceInPaise?: number): LineItem => ({
  priceInPaise,
  qty,
  earlyPriceInPaise,
});

describe("priceOrder", () => {
  it("no discounts → NONE, total = subtotal", () => {
    const r = priceOrder([gen(50000, 2)]);
    expect(r).toEqual({ subtotal: 100000, discount: 0, total: 100000, discountSource: "NONE" });
  });

  it("bulk applies only when qty > 5", () => {
    const tiers = [{ minQty: 6, percent: 10 }];
    expect(priceOrder([gen(10000, 5)], { bulkTiers: tiers }).discountSource).toBe("NONE");
    const r = priceOrder([gen(10000, 6)], { bulkTiers: tiers });
    expect(r.discountSource).toBe("BULK");
    expect(r.total).toBe(54000); // 60000 - 10%
  });

  it("bulk picks the highest applicable tier", () => {
    const tiers = [
      { minQty: 6, percent: 10 },
      { minQty: 10, percent: 15 },
    ];
    const r = priceOrder([gen(10000, 12)], { bulkTiers: tiers });
    expect(r.total).toBe(102000); // 120000 - 15%
  });

  it("early-bird uses explicit early price when present", () => {
    const r = priceOrder([gen(50000, 2, 40000)], { earlyBird: { active: true } });
    expect(r.discountSource).toBe("EARLY_BIRD");
    expect(r.total).toBe(80000);
  });

  it("early-bird falls back to percent when no explicit price", () => {
    const r = priceOrder([gen(50000, 2)], { earlyBird: { active: true, percent: 20 } });
    expect(r.total).toBe(80000); // 40000 * 2
  });

  it("coupon FLAT and PERCENT", () => {
    expect(priceOrder([gen(100000, 1)], {}, { type: "FLAT", value: 25000 }).total).toBe(75000);
    expect(priceOrder([gen(100000, 1)], {}, { type: "PERCENT", value: 30 }).total).toBe(70000);
  });

  it("coupon respects minOrder", () => {
    const r = priceOrder([gen(40000, 1)], {}, { type: "FLAT", value: 10000, minOrder: 50000 });
    expect(r.discountSource).toBe("NONE");
  });

  it("best single discount wins (no stacking)", () => {
    const r = priceOrder(
      [gen(10000, 10)], // subtotal 100000
      { bulkTiers: [{ minQty: 6, percent: 10 }] }, // bulk → 90000
      { type: "PERCENT", value: 25 }, // coupon → 75000 (better)
    );
    expect(r.discountSource).toBe("COUPON");
    expect(r.total).toBe(75000);
  });

  it("never goes below zero", () => {
    const r = priceOrder([gen(10000, 1)], {}, { type: "FLAT", value: 99999 });
    expect(r.total).toBe(0);
    expect(r.discount).toBe(10000);
  });

  it("empty order is zero", () => {
    expect(priceOrder([]).total).toBe(0);
  });
});

const coupon: CouponState = {
  active: true,
  eventId: null,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  usedCount: 0,
  perUserLimit: 1,
};
const now = new Date("2026-06-05T12:00:00Z");

describe("isCouponRedeemable", () => {
  it("accepts a valid coupon for a first-time user", () => {
    expect(isCouponRedeemable(coupon, "ev1", now, 0)).toBe(true);
  });

  it("rejects null / inactive coupons", () => {
    expect(isCouponRedeemable(null, "ev1", now, 0)).toBe(false);
    expect(isCouponRedeemable({ ...coupon, active: false }, "ev1", now, 0)).toBe(false);
  });

  it("rejects when scoped to a different event", () => {
    expect(isCouponRedeemable({ ...coupon, eventId: "ev2" }, "ev1", now, 0)).toBe(false);
    expect(isCouponRedeemable({ ...coupon, eventId: "ev1" }, "ev1", now, 0)).toBe(true);
  });

  it("respects the start/end window", () => {
    expect(isCouponRedeemable({ ...coupon, startsAt: new Date("2026-06-06") }, "ev1", now, 0)).toBe(false);
    expect(isCouponRedeemable({ ...coupon, endsAt: new Date("2026-06-04") }, "ev1", now, 0)).toBe(false);
  });

  it("enforces the global maxUses cap", () => {
    expect(isCouponRedeemable({ ...coupon, maxUses: 10, usedCount: 9 }, "ev1", now, 0)).toBe(true);
    expect(isCouponRedeemable({ ...coupon, maxUses: 10, usedCount: 10 }, "ev1", now, 0)).toBe(false);
  });

  it("enforces the per-user limit (no reuse of a perUserLimit:1 coupon)", () => {
    expect(isCouponRedeemable(coupon, "ev1", now, 1)).toBe(false);
    expect(isCouponRedeemable({ ...coupon, perUserLimit: 3 }, "ev1", now, 2)).toBe(true);
    expect(isCouponRedeemable({ ...coupon, perUserLimit: 3 }, "ev1", now, 3)).toBe(false);
  });
});
