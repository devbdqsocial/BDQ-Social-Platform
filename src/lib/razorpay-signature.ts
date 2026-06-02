import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a Razorpay webhook signature (HMAC-SHA256 of the raw body with the webhook secret).
 * Pure + DB/SDK-free so it's unit-testable. Fulfilment must never trust the client callback.
 */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
