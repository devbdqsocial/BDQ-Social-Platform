import "server-only";
import { db } from "@/server/db";
import { ACTIVE_BOOKING_STATUSES } from "@/server/bookings/status";
import { upgradeLayout } from "@/lib/map/layout-v2";
import { layoutExtras } from "@/lib/map/lens";
import { stallsToRenderLayout } from "@/lib/map/normalize";
import type { RenderExtras, RenderLayout, StatusMap } from "@/lib/map/render-types";

/** Live ops map data: row-sourced stall geometry/status + operations-lens venue context. */
export async function getOpsMap(eventId: string): Promise<{ layout: RenderLayout; statuses: StatusMap; extras: RenderExtras } | null> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      mapLayout: { select: { layoutJson: true, opsLayerJson: true } },
      stalls: { select: { kind: true, status: true, label: true, xFt: true, yFt: true, widthFt: true, heightFt: true, rotation: true }, orderBy: { label: "asc" } },
    },
  });
  if (!event || event.stalls.length === 0) return null;
  const v2 = event.mapLayout ? upgradeLayout(event.mapLayout.layoutJson, event.mapLayout.opsLayerJson) : null;
  const { layout, statuses } = stallsToRenderLayout(event.stalls, v2?.canvas);
  return { layout, statuses, extras: v2 ? layoutExtras(v2, "operations") : {} };
}

/** Admin stall inventory for an event: each sellable stall + its type, status, and assigned vendor. */
export function listStallsForEvent(eventId: string) {
  return db.stall.findMany({
    where: { eventId, kind: "STALL" },
    orderBy: { label: "asc" },
    select: {
      id: true,
      label: true,
      status: true,
      widthFt: true,
      heightFt: true,
      priceInPaise: true,
      stallType: { select: { name: true } },
      bookings: {
        where: { status: { in: ACTIVE_BOOKING_STATUSES } },
        select: { status: true, vendorProfile: { select: { brandName: true } } },
        take: 1,
      },
    },
  });
}
