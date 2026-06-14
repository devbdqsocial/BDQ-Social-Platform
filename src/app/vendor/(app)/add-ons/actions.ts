"use server";

import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { db } from "@/server/db";
import { createAddOnOrder, type AddOnOrderResult } from "@/server/addons/service";
import { addOnOrderSchema } from "@/server/schemas";

type OrderResponse = ({ ok: true } & AddOnOrderResult) | { ok: false; error: string };

/** Vendor orders add-ons for their own BOOKED stall. Booking is resolved server-side (not trusted). */
export async function orderAddOnsAction(items: { addOnId: string; qty: number }[]): Promise<OrderResponse> {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) return { ok: false, error: "Set up your brand first" };

  const booking = await db.booking.findFirst({
    where: { vendorProfileId: profile.id, status: "BOOKED" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!booking) return { ok: false, error: "Confirm your stall before ordering add-ons" };

  const parsed = addOnOrderSchema.safeParse({ bookingId: booking.id, items });
  if (!parsed.success) return { ok: false, error: "Choose at least one add-on" };

  try {
    const r = await createAddOnOrder(profile.id, parsed.data);
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start the order" };
  }
}
