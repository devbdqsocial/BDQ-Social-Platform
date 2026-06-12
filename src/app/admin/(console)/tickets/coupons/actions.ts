"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action, ActionError } from "@/server/action";
import { createCoupon, setCouponActive, CouponCodeTakenError } from "@/server/coupons/admin-service";
import { couponSchema, idActiveSchema } from "@/server/schemas";
import { couponValueToStored } from "@/lib/coupon-input";
import type { Result } from "@/lib/result";

// Pilot of the action() pipeline (build-plan R0.3). Services audit internally.

const save = action({
  auth: "ADMIN",
  input: couponSchema.extend({ eventId: z.string().min(1).optional() }),
  handler: async (s, d) => {
    try {
      return await createCoupon(s, d);
    } catch (e) {
      if (e instanceof CouponCodeTakenError) throw new ActionError("CODE_TAKEN", "That code already exists.");
      throw e;
    }
  },
});

const toggle = action({
  auth: "ADMIN",
  input: idActiveSchema,
  handler: (s, d) => setCouponActive(s, d.id, d.active),
});

export async function saveCouponAction(formData: FormData): Promise<Result<unknown>> {
  const type = String(formData.get("type")) as "FLAT" | "PERCENT";
  const value = couponValueToStored(type, Number(formData.get("value")));
  const num = (k: string) => (formData.get(k) ? Number(formData.get(k)) : undefined);

  const res = await save({
    code: formData.get("code"),
    type,
    value,
    maxUses: num("maxUses"),
    perUserLimit: num("perUserLimit") ?? 1,
    minOrder: formData.get("minOrderRupees") ? Math.round(Number(formData.get("minOrderRupees")) * 100) : undefined,
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
    active: formData.get("active") === "on",
    eventId: String(formData.get("eventId") || "") || undefined,
  });
  if (res.ok) revalidatePath("/admin/tickets/coupons");
  return res;
}

export async function toggleCouponAction(formData: FormData): Promise<Result<unknown>> {
  const res = await toggle({ id: String(formData.get("id")), active: formData.get("active") === "true" });
  if (res.ok) revalidatePath("/admin/tickets/coupons");
  return res;
}
