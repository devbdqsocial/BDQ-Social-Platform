"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { createCoupon, setCouponActive, CouponCodeTakenError } from "@/server/coupons/admin-service";
import { couponSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";
import { couponValueToStored } from "@/lib/coupon-input";

export async function saveCouponAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const type = String(formData.get("type")) as "FLAT" | "PERCENT";
  const value = couponValueToStored(type, Number(formData.get("value")));
  const num = (k: string) => (formData.get(k) ? Number(formData.get(k)) : undefined);

  const data = parseOrThrow(couponSchema, {
    code: formData.get("code"),
    type,
    value,
    maxUses: num("maxUses"),
    perUserLimit: num("perUserLimit") ?? 1,
    minOrder: formData.get("minOrderRupees") ? Math.round(Number(formData.get("minOrderRupees")) * 100) : undefined,
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
    active: formData.get("active") === "on",
  });

  const eventId = String(formData.get("eventId") || "") || undefined;
  try {
    await createCoupon(session, { ...data, eventId });
  } catch (e) {
    if (e instanceof CouponCodeTakenError) throw new Error("That code already exists.");
    throw e;
  }
  revalidatePath("/admin/tickets/coupons");
}

export async function toggleCouponAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  await setCouponActive(session, String(formData.get("id")), formData.get("active") === "true");
  revalidatePath("/admin/tickets/coupons");
}
