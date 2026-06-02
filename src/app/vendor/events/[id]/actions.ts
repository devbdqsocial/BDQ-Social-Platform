"use server";

import { requireVendor } from "@/server/auth/guard";
import { StallUnavailableError } from "@/server/bookings/service";
import { getProfile } from "@/server/vendors/service";
import { createStallOrder } from "@/server/bookings/payment";

export interface StallPayResult {
  ok: boolean;
  razorpayOrderId?: string;
  amountPaise?: number;
  keyId?: string;
  error?: string;
  unauthorized?: boolean;
}

/** Start a Razorpay payment for a stall (creates a HELD Booking + order). */
export async function createStallOrderAction(stallId: string): Promise<StallPayResult> {
  let session;
  try {
    session = await requireVendor();
  } catch {
    return { ok: false, unauthorized: true };
  }
  const profile = await getProfile(session.userId);
  if (!profile) return { ok: false, error: "Create your vendor profile first." };
  try {
    const r = await createStallOrder(profile.id, stallId);
    return { ok: true, razorpayOrderId: r.razorpayOrderId, amountPaise: r.amountPaise, keyId: r.keyId };
  } catch (e) {
    if (e instanceof StallUnavailableError) return { ok: false, error: "That stall is no longer available." };
    return { ok: false, error: e instanceof Error ? e.message : "Payment failed" };
  }
}
