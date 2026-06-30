import { db } from "@/server/db";
import { listPublished } from "@/server/events/service";
import { upgradeLayout, type Zone } from "@/lib/map/layout-v2";
import { zoneOf } from "@/lib/map/zones";
import { stallsToRenderLayout } from "@/lib/map/normalize";
import type { RenderLayout } from "@/lib/map/render-types";

/**
 * Customer event guide data (map-system §11b / customer-portal §3.4, R3.5). REAL data — the active
 * published event's layout + the brands on its BOOKED stalls. No fake `assignDemoStatuses`. The
 * customer sees brands/food/facilities, never availability (that's vendor-side).
 */

export type Bucket = "Food" | "Shopping" | "Experience";

export interface GuideBrand {
  stallLabel: string;
  brandName: string;
  bucket: Bucket;
  productCategory: string | null;
  description: string | null;
  vendorId: string;
  zone: string | null;
}

export interface GuideFacility { label: string }

export interface EventGuide {
  event: { name: string; slug: string; location: string | null; startsAtIso: string };
  hasLayout: boolean;
  layoutLocked: boolean;
  layout: RenderLayout | null; // booked stalls relabelled to brand names for the canvas
  brands: GuideBrand[];
  facilities: GuideFacility[];
  zones: { name: string }[];
}

/** Map a vendor's free-text category into one of the three customer buckets. */
export function bucketOf(productCategory?: string | null, category?: string | null): Bucket {
  const s = `${productCategory ?? ""} ${category ?? ""}`.toLowerCase();
  if (/food|drink|beverage|cafe|coffee|bakery|baker|eat|dining|f&b|snack|dessert|sweet/.test(s)) return "Food";
  if (/experience|art|workshop|activit|music|game|gaming|wellness|beauty|spa|tattoo|kids|play/.test(s)) return "Experience";
  return "Shopping";
}

export async function getEventGuide({ includeLayout, slug }: { includeLayout: boolean; slug?: string }): Promise<EventGuide | null> {
  // Scope to a specific event when a slug is given (event detail page); else the active published one.
  let eventId: string;
  if (slug) {
    const e = await db.event.findUnique({ where: { slug }, select: { id: true } });
    if (!e) return null;
    eventId = e.id;
  } else {
    const [pub] = await listPublished();
    if (!pub) return null;
    eventId = pub.id;
  }

  const vendorBooking = {
    where: { status: "BOOKED" as const, vendorProfileId: { not: null } },
    take: 1,
    include: { vendorProfile: { select: { id: true, brandName: true, productCategory: true, category: true, description: true } } },
  };
  const event = includeLayout
    ? await db.event.findUnique({
        where: { id: eventId },
        include: {
          mapLayout: { select: { layoutJson: true } },
          stalls: { include: { bookings: vendorBooking } },
        },
      })
    : await db.event.findUnique({
        where: { id: eventId },
        include: {
          mapLayout: { select: { id: true } },
          stalls: {
            select: {
              label: true,
              kind: true,
              status: true,
              bookings: vendorBooking,
            },
          },
        },
      });
  if (!event) return null;

  const layoutJson = includeLayout && event.mapLayout && "layoutJson" in event.mapLayout ? event.mapLayout.layoutJson : null;
  const layoutV2 = layoutJson ? upgradeLayout(layoutJson) : null;
  const zones: Zone[] = layoutV2?.zones ?? [];
  const hasLayout = !!event.mapLayout && event.stalls.length > 0;

  // Each booked stall → its brand (if any). Compute the stall's zone for the locator text.
  const brandByLabel = new Map<string, GuideBrand>();
  const brands: GuideBrand[] = [];
  for (const s of event.stalls) {
    const vp = s.bookings[0]?.vendorProfile;
    if (s.status !== "BOOKED" || !vp) continue;
    const zone = zones.length && "xFt" in s ? zoneOf({ id: s.id, kind: "stall", type: "STALL", label: s.label, xFt: s.xFt, yFt: s.yFt, widthFt: s.widthFt, heightFt: s.heightFt, rotation: s.rotation }, zones)?.name ?? null : null;
    const b: GuideBrand = { stallLabel: s.label, brandName: vp.brandName, bucket: bucketOf(vp.productCategory, vp.category), productCategory: vp.productCategory, description: vp.description, vendorId: vp.id, zone };
    brands.push(b);
    brandByLabel.set(s.label, b);
  }
  brands.sort((a, b) => a.brandName.localeCompare(b.brandName));

  // Render layout: booked stalls show the brand name; facilities keep their label.
  const { layout } = includeLayout
    ? stallsToRenderLayout(
        event.stalls.map((s) => ({
          kind: s.kind,
          status: s.status,
          label: brandByLabel.get(s.label)?.brandName ?? s.label,
          xFt: "xFt" in s ? s.xFt : 0,
          yFt: "yFt" in s ? s.yFt : 0,
          widthFt: "widthFt" in s ? s.widthFt : 0,
          heightFt: "heightFt" in s ? s.heightFt : 0,
          rotation: "rotation" in s ? s.rotation : 0,
        })),
        layoutV2?.canvas,
      )
    : { layout: null };

  const facilities: GuideFacility[] = event.stalls
    .filter((s) => s.kind === "INFRA")
    .map((s) => ({ label: s.label }));

  return {
    event: { name: event.name, slug: event.slug, location: event.location, startsAtIso: event.startsAt.toISOString() },
    hasLayout,
    layoutLocked: hasLayout && !includeLayout,
    layout,
    brands,
    facilities,
    zones: zones.map((z) => ({ name: z.name })),
  };
}
