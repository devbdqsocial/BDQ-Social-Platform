import "server-only";
import Razorpay from "razorpay";

/** Razorpay adapter — create orders server-side. Fulfilment is webhook-driven (see webhook route). */

let instance: Razorpay | null = null;

function client(): Razorpay {
  if (!instance) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) throw new Error("Razorpay not configured");
    instance = new Razorpay({ key_id, key_secret });
  }
  return instance;
}

export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  notes?: Record<string, string>,
): Promise<{ id: string }> {
  const order = await client().orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes,
  });
  return { id: String(order.id) };
}

/** Find a captured payment for a Razorpay order (used by the reconcile cron for missed webhooks). */
export async function fetchCapturedPayment(razorpayOrderId: string): Promise<{ id: string } | null> {
  const res = (await client().orders.fetchPayments(razorpayOrderId)) as { items?: { id: string; status: string }[] };
  const captured = res.items?.find((p) => p.status === "captured");
  return captured ? { id: String(captured.id) } : null;
}

export { verifyWebhookSignature } from "@/lib/razorpay-signature";
