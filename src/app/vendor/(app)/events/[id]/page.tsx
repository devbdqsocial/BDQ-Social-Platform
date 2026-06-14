import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVendor } from "@/server/auth/guard";
import { getEventWithStalls } from "@/server/events/service";
import { upgradeLayout } from "@/lib/map/layout-v2";
import { scoreLayout, describeStall } from "@/server/map/scoring";
import { zoneOf } from "@/lib/map/zones";
import { VendorStallReserve, type StallDetail } from "@/components/vendor/VendorStallReserve";

export const metadata: Metadata = { title: "Pick a stall" };

export default async function VendorEventStallsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireVendor();
  const { id } = await params;
  const event = await getEventWithStalls(id);
  if (!event) notFound();

  const mapStalls = event.stalls.map((s) => ({
    id: s.id,
    label: s.label,
    status: s.status,
    kind: s.kind,
    xFt: s.xFt,
    yFt: s.yFt,
    widthFt: s.widthFt,
    heightFt: s.heightFt,
    rotation: s.rotation,
    priceInPaise: s.priceInPaise ?? s.stallType?.priceInPaise ?? null,
  }));

  // "Why this stall" (map-system §11, reuses R2.5.10 scoring): score the real layout and surface
  // describeStall bullets + zone + size, keyed by stall label.
  const v2 = event.mapLayout?.layoutJson ? upgradeLayout(event.mapLayout.layoutJson) : null;
  const details: Record<string, StallDetail> = {};
  if (v2) {
    const scores = scoreLayout(v2.elements, v2.zones, v2.pathways);
    for (const el of v2.elements) {
      if (el.kind !== "stall") continue;
      const sc = scores.get(el.id);
      details[el.label] = {
        typeName: el.type,
        zone: v2.zones.length ? zoneOf(el, v2.zones)?.name ?? null : null,
        bullets: sc ? describeStall(sc) : [],
        sizeFt: `${el.widthFt} × ${el.heightFt} ft (${Math.round(el.widthFt * el.heightFt)} sq ft)`,
      };
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Pick your stall · {event.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Tap an open stall to reserve it. You&apos;ll sign the agreement next; we verify by call and approve you before payment.
          </p>
        </div>
        <Link href="/vendor/events" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">← All markets</Link>
      </header>

      {mapStalls.length === 0 ? (
        <p className="text-sm text-muted-foreground">The event layout for this market isn&apos;t ready yet — check back soon.</p>
      ) : (
        <VendorStallReserve eventId={id} stalls={mapStalls} details={details} />
      )}
    </div>
  );
}
