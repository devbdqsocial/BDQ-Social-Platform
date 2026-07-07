import type { Metadata } from "next";
import { fmtDate as fmt } from "@/lib/date-formats";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireVendor } from "@/server/auth/guard";
import { listPublished } from "@/server/events/service";
import { EmptyState } from "@/components/ui/empty-state";
import { VendorPageHeader } from "@/components/vendor/VendorPageHeader";

export const metadata: Metadata = { title: "Book a stall" };

export default async function VendorEventsPage() {
  await requireVendor();
  const events = (await listPublished()).filter((e) => e.vendorStallsEnabled);

  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-xl)]">
      <VendorPageHeader
        kicker="Book a stall"
        title="Pick a market"
        description="Choose an upcoming event to see the layout and grab your stall."
      />
      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No markets open yet" description="New dates are added regularly — check back soon to book your spot." />
      ) : (
        <ul className="overflow-hidden rounded-[var(--radius-lg)]" style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}>
          {events.map((e, i) => (
            <li key={e.id} style={i > 0 ? { borderTop: "1px solid color-mix(in srgb, currentColor 12%, transparent)" } : undefined}>
              <Link
                href={`/vendor/events/${e.id}`}
                className="group flex items-center justify-between gap-[var(--space-lg)] p-[var(--space-lg)]"
              >
                <div>
                  <p className="f-h32 f-exat">{e.name}</p>
                  <p className="f-paragraph-small opacity-60">{fmt(e.startsAt)} · {e.location}</p>
                </div>
                <span className="link--split f-paragraph-small shrink-0 font-bold" style={{ color: "var(--light-blue)" }}>
                  Book <span className="arrow">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
