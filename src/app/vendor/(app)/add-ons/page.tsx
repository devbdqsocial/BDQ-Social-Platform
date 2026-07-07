import type { Metadata } from "next";
import Link from "next/link";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { db } from "@/server/db";
import { formatPaise } from "@/lib/utils";
import { listActiveAddOns, listBookingAddOns, addOnOrdersOpen } from "@/server/addons/service";
import { AddOnsClient } from "@/components/vendor/AddOnsClient";
import { VendorPageHeader } from "@/components/vendor/VendorPageHeader";

export const metadata: Metadata = { title: "Add-ons" };
export const dynamic = "force-dynamic";

export default async function VendorAddOnsPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) {
    return <p className="f-paragraph-small opacity-70">Set up your brand first to order add-ons.</p>;
  }

  // Multi-event: a vendor can hold BOOKED stalls at more than one market — default to the soonest.
  const bookings = await db.booking.findMany({
    where: { vendorProfileId: profile.id, status: "BOOKED" },
    orderBy: { event: { startsAt: "asc" } },
    include: { event: { select: { name: true, startsAt: true, addOnCloseHours: true } }, stall: { select: { label: true } } },
  });
  const { booking: requestedId } = await searchParams;
  const booking =
    bookings.find((b) => b.id === requestedId) ??
    bookings.find((b) => b.event.startsAt >= new Date()) ??
    bookings[bookings.length - 1] ??
    null;

  if (!booking) {
    return (
      <div className="max-w-[var(--w-prose)] space-y-[var(--space-lg)]">
        <VendorPageHeader kicker="Add-ons" title="Stall add-ons" />
        <p className="f-paragraph-small opacity-75 text-pretty">
          Tables, chairs, power and signage become available here once your stall is confirmed.{" "}
          <Link href="/vendor/home" className="font-bold underline underline-offset-2" style={{ color: "var(--light-blue)" }}>Go to your home →</Link>
        </p>
      </div>
    );
  }

  const open = addOnOrdersOpen(booking.event.startsAt, booking.event.addOnCloseHours ?? 48);
  const [addOns, ordered] = await Promise.all([listActiveAddOns(booking.eventId), listBookingAddOns(booking.id)]);

  const items = addOns.map((a) => ({
    id: a.id,
    name: a.name,
    pricePaise: a.pricePaise,
    maxPerBooking: a.maxPerBooking,
    remaining: a.stock == null ? null : Math.max(0, a.stock - a.sold),
  }));

  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-2xl)]">
      <VendorPageHeader
        kicker="Add-ons"
        title="Stall add-ons"
        action={<p className="f-paragraph-small opacity-60">Stall {booking.stall.label} · {booking.event.name}</p>}
      />

      {bookings.length > 1 && (
        <div className="flex flex-wrap gap-[var(--space-sm)]">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/vendor/add-ons?booking=${b.id}`}
              className={b.id === booking.id ? "badge-bdq" : "f-paragraph-small rounded-full px-[var(--space-md)] py-[2px] font-bold"}
              style={b.id === booking.id ? undefined : { border: "1px solid color-mix(in srgb, currentColor 28%, transparent)" }}
            >
              {b.event.name}
            </Link>
          ))}
        </div>
      )}

      {ordered.length > 0 && (
        <div className="rounded-[var(--radius-lg)] p-[var(--space-lg)]" style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}>
          <p className="kicker opacity-60">Already ordered</p>
          <ul className="mt-[var(--space-sm)] space-y-1">
            {ordered.flatMap((o) => o.lines).map((l) => (
              <li key={l.id} className="f-paragraph-small flex justify-between gap-[var(--space-md)]">
                <span>{l.qty}× {l.addOn.name}</span>
                <span className="opacity-70">{formatPaise(l.pricePaise * l.qty)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!open ? (
        <p className="f-paragraph-small opacity-75">Add-on orders are closed — bring what you need or ask the floor team.</p>
      ) : items.length === 0 ? (
        <p className="f-paragraph-small opacity-70">No add-ons are offered for this market yet — check back soon.</p>
      ) : (
        <AddOnsClient items={items} />
      )}
    </div>
  );
}
