import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireVendor } from "@/server/auth/guard";
import { listPublished } from "@/server/events/service";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Book a stall" };

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d);

export default async function VendorEventsPage() {
  await requireVendor();
  const events = await listPublished();

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Pick a market</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose an upcoming event to see the floor plan and grab your stall.</p>
      </div>
      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No markets open yet" description="New dates are added regularly — check back soon to book your spot." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/vendor/events/${e.id}`} className="group flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50">
                <div>
                  <p className="font-medium group-hover:text-primary">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{fmt(e.startsAt)} · {e.location}</p>
                </div>
                <span className="text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">Book →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
