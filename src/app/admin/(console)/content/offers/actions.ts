"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/server/auth/guard";
import { createOffer, updateOffer, publishOffer, endOffer, deleteOffer } from "@/server/content/admin-offers";
import { createOfferSchema, updateOfferSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

const OFFERS = "/admin/content/offers";

/** A single "link" select carries either a vendor or a sponsor id (prefix v:/s:). */
function parseLink(raw: string): { vendorProfileId: string | null; sponsorId: string | null } {
  if (raw.startsWith("v:")) return { vendorProfileId: raw.slice(2), sponsorId: null };
  if (raw.startsWith("s:")) return { vendorProfileId: null, sponsorId: raw.slice(2) };
  return { vendorProfileId: null, sponsorId: null };
}

const common = (fd: FormData) => ({
  ...parseLink(String(fd.get("link") ?? "")),
  title: fd.get("title"),
  terms: fd.get("terms"),
  kind: fd.get("kind"),
  startsAt: fd.get("startsAt"),
  endsAt: fd.get("endsAt"),
  maxRedemptions: fd.get("maxRedemptions") || undefined,
});

export async function createOfferAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const input = parseOrThrow(createOfferSchema, { eventId: String(formData.get("eventId")), ...common(formData) });
  await createOffer(session, input);
  revalidatePath(OFFERS);
}

export async function updateOfferAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const input = parseOrThrow(updateOfferSchema, { id: String(formData.get("id")), eventId: String(formData.get("eventId")), ...common(formData) });
  await updateOffer(session, input);
  revalidatePath(OFFERS);
}

export async function publishOfferAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await publishOffer(session, String(formData.get("id")));
  revalidatePath(OFFERS);
}

export async function endOfferAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await endOffer(session, String(formData.get("id")));
  revalidatePath(OFFERS);
}

export async function deleteOfferAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await deleteOffer(session, String(formData.get("id")));
  revalidatePath(OFFERS);
}
