/**
 * Ticket order pricing. Pure + deterministic. All amounts in integer paise.
 *
 * Rules (Docs/BUSINESS-RULES.md §9): every price/discount comes from per-event config — nothing
 * is hardcoded. Candidates {early-bird, bulk, coupon} do NOT stack; the customer gets the single
 * best (lowest) total. Bulk triggers only when total ticket qty > 5.
 */

export type DiscountSource = "NONE" | "EARLY_BIRD" | "BULK" | "COUPON";

export interface LineItem {
  /** base unit price (paise) for this ticket type */
  priceInPaise: number;
  /** optional explicit early-bird unit price (paise) */
  earlyPriceInPaise?: number | null;
  qty: number;
}

export interface BulkTier {
  minQty: number;
  percent: number; // 0..100
}

export interface EventPricing {
  /** ordered or unordered list; highest applicable minQty wins */
  bulkTiers?: BulkTier[] | null;
  earlyBird?: { active: boolean; percent?: number | null } | null;
}

export interface AppliedCoupon {
  type: "FLAT" | "PERCENT";
  value: number; // paise (FLAT) or 0..100 (PERCENT)
  minOrder?: number | null;
}

export interface PriceResult {
  subtotal: number;
  discount: number;
  total: number;
  discountSource: DiscountSource;
}

const clampPaise = (n: number) => Math.max(0, Math.round(n));

function earlyBirdTotal(items: LineItem[], percent?: number | null): number {
  return items.reduce((sum, it) => {
    const unit =
      it.earlyPriceInPaise != null
        ? it.earlyPriceInPaise
        : percent != null
          ? it.priceInPaise * (1 - percent / 100)
          : it.priceInPaise;
    return sum + clampPaise(unit) * it.qty;
  }, 0);
}

function bulkTotal(base: number, totalQty: number, tiers?: BulkTier[] | null): number | null {
  if (totalQty <= 5 || !tiers?.length) return null;
  const tier = tiers
    .filter((t) => totalQty >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];
  if (!tier) return null;
  return clampPaise(base * (1 - tier.percent / 100));
}

function couponTotal(base: number, coupon?: AppliedCoupon | null): number | null {
  if (!coupon) return null;
  if (coupon.minOrder != null && base < coupon.minOrder) return null;
  const total = coupon.type === "FLAT" ? base - coupon.value : base * (1 - coupon.value / 100);
  return clampPaise(total);
}

export function priceOrder(
  items: LineItem[],
  event: EventPricing = {},
  coupon?: AppliedCoupon | null,
): PriceResult {
  const subtotal = items.reduce((s, it) => s + it.priceInPaise * it.qty, 0);
  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  const candidates: { source: DiscountSource; total: number }[] = [];
  if (event.earlyBird?.active) {
    candidates.push({ source: "EARLY_BIRD", total: earlyBirdTotal(items, event.earlyBird.percent) });
  }
  const bulk = bulkTotal(subtotal, totalQty, event.bulkTiers);
  if (bulk != null) candidates.push({ source: "BULK", total: bulk });
  const coup = couponTotal(subtotal, coupon);
  if (coup != null) candidates.push({ source: "COUPON", total: coup });

  // best single discount wins; only count candidates that actually beat the base
  const better = candidates.filter((c) => c.total < subtotal).sort((a, b) => a.total - b.total);
  const winner = better[0] ?? { source: "NONE" as DiscountSource, total: subtotal };

  return {
    subtotal,
    total: winner.total,
    discount: subtotal - winner.total,
    discountSource: winner.source,
  };
}
