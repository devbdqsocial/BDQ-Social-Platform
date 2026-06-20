"use server";

import { db } from "@/server/db";
import { listPublished } from "@/server/events/service";
import { primaryLogo } from "@/lib/vendor-assets";
import { canRedeem } from "@/lib/offer";
import { featureEnabled } from "@/server/settings/service";

export interface OfferDto {
  id: string;
  title: string;
  terms: string;
  kind: string;
  startsAtIso: string;
  endsAtIso: string;
  status: string;
  maxRedemptions: number | null;
  redeemedCount: number;
  brandName: string | null;
  logo: string | null;
}

const select = {
  id: true, title: true, terms: true, kind: true, startsAt: true, endsAt: true, status: true,
  maxRedemptions: true, redeemedCount: true,
  vendorProfile: { select: { brandName: true, assets: { select: { kind: true, url: true } } } },
  sponsor: { select: { name: true, logoUrl: true } },
} as const;

type Row = {
  id: string; title: string; terms: string; kind: string; startsAt: Date; endsAt: Date; status: string;
  maxRedemptions: number | null; redeemedCount: number;
  vendorProfile: { brandName: string; assets: { kind: string; url: string }[] } | null;
  sponsor: { name: string; logoUrl: string | null } | null;
};

const toDto = (o: Row): OfferDto => ({
  id: o.id, title: o.title, terms: o.terms, kind: o.kind,
  startsAtIso: o.startsAt.toISOString(), endsAtIso: o.endsAt.toISOString(), status: o.status,
  maxRedemptions: o.maxRedemptions, redeemedCount: o.redeemedCount,
  brandName: o.vendorProfile?.brandName ?? o.sponsor?.name ?? null,
  logo: o.vendorProfile ? primaryLogo(o.vendorProfile.assets) : o.sponsor?.logoUrl ?? null,
});

/** PUBLISHED offers for the active event (time-greying is done client-side via `offerPhase`). */
export async function listVisibleOffers(): Promise<OfferDto[]> {
  if (!(await featureEnabled("offers"))) return [];
  const [event] = await listPublished();
  if (!event) return [];
  const rows = await db.offer.findMany({ where: { eventId: event.id, status: "PUBLISHED" }, orderBy: { endsAt: "asc" }, select });
  return rows.map(toDto);
}

/** Nav/section gate — does the active event have any published offer? */
export async function hasPublishedOffers(): Promise<boolean> {
  if (!(await featureEnabled("offers"))) return false;
  const [event] = await listPublished();
  if (!event) return false;
  return (await db.offer.count({ where: { eventId: event.id, status: "PUBLISHED" } })) > 0;
}

/** A single brand's live published offers (for the vendor detail page). */
export async function listVendorOffers(vendorProfileId: string): Promise<OfferDto[]> {
  const rows = await db.offer.findMany({ where: { vendorProfileId, status: "PUBLISHED" }, orderBy: { endsAt: "asc" }, select });
  return rows.map(toDto);
}

/** Soft redemption (no auth, customer-portal §3.6): bump the count if under the cap. */
export async function markOfferUsedAction(id: string): Promise<{ ok: boolean; redeemedCount: number }> {
  const o = await db.offer.findUnique({ where: { id }, select: { status: true, maxRedemptions: true, redeemedCount: true } });
  if (!o || o.status !== "PUBLISHED" || !canRedeem(o.maxRedemptions, o.redeemedCount)) {
    return { ok: false, redeemedCount: o?.redeemedCount ?? 0 };
  }
  const updated = await db.offer.update({ where: { id }, data: { redeemedCount: { increment: 1 } }, select: { redeemedCount: true } });
  return { ok: true, redeemedCount: updated.redeemedCount };
}
