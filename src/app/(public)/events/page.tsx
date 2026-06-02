import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { listPublished } from "@/server/events/service";
import { formatPaise } from "@/lib/utils";
import { Container } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function EventsPage() {
  const events = await listPublished();

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">What&apos;s on</h1>
      <p className="mt-2 text-muted-foreground">Pick a date and grab your tickets before they go.</p>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          className="mt-10"
          title="Nothing on sale right now"
          description="Our next evening is being lined up. Check back soon — you won't want to miss it."
        />
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const prices = e.ticketTypes.map((t) => t.priceInPaise);
            const from = prices.length ? Math.min(...prices) : null;
            return (
              <Link
                key={e.id}
                href={`/events/${e.slug}`}
                className="card-hover group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <h2 className="font-display text-xl font-semibold group-hover:text-primary">{e.name}</h2>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" /> {fmt(e.startsAt)}
                </p>
                {e.location && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-4" /> {e.location}
                  </p>
                )}
                <div className="mt-4">
                  {from != null ? (
                    <Badge variant="primary">From {formatPaise(from)}</Badge>
                  ) : (
                    <Badge variant="neutral">Tickets soon</Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
