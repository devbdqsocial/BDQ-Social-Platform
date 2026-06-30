"use server";

import { revalidatePath } from "next/cache";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { createVendorOffer, publishVendorOffer, endVendorOffer, deleteVendorOffer } from "@/server/vendors/offers";
import { vendorOfferSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

async function vendorId() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) throw new Error("Set up your brand first.");
  return profile.id;
}

export async function createVendorOfferAction(formData: FormData): Promise<void> {
  const id = await vendorId();
  const data = parseOrThrow(vendorOfferSchema, {
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    terms: formData.get("terms"),
    kind: formData.get("kind"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });
  await createVendorOffer(id, data);
  revalidatePath("/vendor/offers");
  revalidatePath("/offers");
}

export async function publishVendorOfferAction(formData: FormData): Promise<void> {
  await publishVendorOffer(await vendorId(), String(formData.get("offerId")));
  revalidatePath("/vendor/offers");
  revalidatePath("/offers");
}

export async function endVendorOfferAction(formData: FormData): Promise<void> {
  await endVendorOffer(await vendorId(), String(formData.get("offerId")));
  revalidatePath("/vendor/offers");
  revalidatePath("/offers");
}

export async function deleteVendorOfferAction(formData: FormData): Promise<void> {
  await deleteVendorOffer(await vendorId(), String(formData.get("offerId")));
  revalidatePath("/vendor/offers");
}
