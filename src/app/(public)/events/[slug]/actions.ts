"use server";

import { headers } from "next/headers";
import { getSession } from "@/server/auth/guard";
import { CheckoutError, quoteTicketOrder } from "@/server/tickets/service";
import { createOrderSchema } from "@/server/schemas";
import { enforceRateLimit } from "@/lib/ratelimit";
import { logError } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";

export interface OrderQuote {
  subtotal: number;
  discount: number;
  total: number;
  discountSource: string;
}

/**
 * Read-only pricing preview for the checkout coupon input (customer-portal §3.10, R1.4).
 * Anonymous allowed (per-user coupon caps re-checked at order creation). Rate-limited per
 * BUSINESS-RULES §8 (coupon apply: 15 / 10 min) so codes can't be enumerated.
 */
export async function quoteOrderAction(raw: unknown): Promise<Result<OrderQuote>> {
  const limited = await enforceRateLimit(
    new Request("http://internal/quote", { headers: await headers() }),
    "coupon-quote",
    15,
    10 * 60 * 1000,
  );
  if (limited) return err("RATE_LIMITED", "Too many tries — wait a few minutes.");

  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) return err("VALIDATION");

  const session = await getSession();
  try {
    const { pricing } = await quoteTicketOrder(
      parsed.data.eventId,
      parsed.data.items,
      parsed.data.couponCode,
      session?.userId ?? null,
    );
    return ok(pricing);
  } catch (e) {
    if (e instanceof CheckoutError) return err(e.code);
    logError("quoteOrder", e, { eventId: parsed.data.eventId });
    return err("INTERNAL");
  }
}
