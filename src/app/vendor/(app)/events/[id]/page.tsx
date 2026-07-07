import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVendor } from "@/server/auth/guard";
import { getEventWithStalls } from "@/server/events/service";
import { upgradeLayout } from "@/lib/map/layout-v2";
import { layoutExtras } from "@/lib/map/lens";
import { scoreLayout, describeStall } from "@/server/map/scoring";
import { zoneOf } from "@/lib/map/zones";
import { VendorStallReserve, type StallDetail } from "@/components/vendor/VendorStallReserve";
import { VendorPageHeader } from "@/components/vendor/VendorPageHeader";
import { StallWaitlistJoin } from "@/components/vendor/StallWaitlistJoin";

export const metadata: Metadata = { title: "Pick a stall" };

const TIER_LABEL: Record<string, string> = { PREMIUM: "Prime spot", STRONG: "Great spot", STANDARD: "Good spot", VALUE: "Value spot" };

export default async function VendorEventStallsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireVendor();
  const { id } = await params;
  const event = await getEventWithStalls(id);
  if (!event) notFound();

  const realStalls = event.stalls.filter((s) => s.kind !== "INFRA");
  const soldOut = realStalls.length > 0 && !realStalls.some((s) => s.status === "AVAILABLE");

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
        quality: sc ? `${TIER_LABEL[sc.tier] ?? sc.tier} · ${sc.total}/100` : null,
      };
    }
  }

  return (
    <div className="space-y-[var(--space-xl)]">
      <VendorPageHeader
        kicker="Book a stall"
        title={<>Pick your stall · {event.name}</>}
        description="Tap an open stall to reserve it. You'll sign the agreement next; we verify by call and approve you before payment."
        action={
          <Link href="/vendor/events" className="link--split f-paragraph-small font-bold">
            <span className="arrow">←</span> All markets
          </Link>
        }
      />

      {!event.vendorStallsEnabled ? (
        <p className="f-paragraph-small opacity-70">This event doesn&apos;t take vendor stalls.</p>
      ) : mapStalls.length === 0 ? (
        <p className="f-paragraph-small opacity-70">The event layout for this market isn&apos;t ready yet — check back soon.</p>
      ) : (
        <>
          {soldOut && (
            <div
              className="space-y-[var(--space-md)] rounded-[var(--radius-lg)] p-[var(--space-xl)]"
              style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)", background: "color-mix(in srgb, currentColor 3%, transparent)" }}
            >
              <p className="f-h32 f-exat">All stalls are taken</p>
              <p className="f-paragraph-small opacity-75 text-pretty">
                Join the waitlist — if a stall frees up we hold it for the first vendor in line for 24 hours and message you right away.
              </p>
              <StallWaitlistJoin eventId={id} />
            </div>
          )}
          <VendorStallReserve eventId={id} stalls={mapStalls} details={details} extras={v2 ? layoutExtras(v2, "vendor") : undefined} />
        </>
      )}
    </div>
  );
}
