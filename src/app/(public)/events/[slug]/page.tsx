import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { getBySlug } from "@/server/events/service";
import { sponsorsForEvent } from "@/server/sponsors/service";
import { BookingFloorPlan } from "@/components/map/BookingFloorPlan";
import { TicketCheckout } from "@/components/tickets/TicketCheckout";
import { SponsorStrip } from "@/components/landing/SponsorStrip";
import { NotifyMe } from "@/components/events/NotifyMe";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);
const time = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getBySlug(slug);
  return { title: event?.name ?? "Event" };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getBySlug(slug);
  if (!event || (event.status !== "PUBLISHED" && event.status !== "LIVE")) notFound();

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
  }));

  const sponsors = await sponsorsForEvent(event.id);
  const soldOut = event.ticketTypes.length > 0 && event.ticketTypes.every((t) => t.soldQty >= t.totalQty);
  const theme = (event.theme as { primary?: string; accent?: string } | null) ?? null;
  const themeStyle = theme ? ({ "--primary": theme.primary, "--accent": theme.accent } as React.CSSProperties) : undefined;

  return (
    <div style={themeStyle}>
      {/* Event header band */}
      <section className="bg-hero text-[#EDE6DA]">
        <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
          <h1 className="font-display text-4xl font-semibold text-balance sm:text-5xl">{event.name}</h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#C9BDA8]">
            <span className="flex items-center gap-1.5"><CalendarDays className="size-4" /> {fmt(event.startsAt)}</span>
            {event.location && <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {event.location}</span>}
          </div>
          {event.description && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#D9CFBE] text-pretty">{event.description}</p>}
        </div>
      </section>

      <main className="mx-auto max-w-[800px] px-4 py-12 sm:px-6">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">Get your tickets</h2>
          {event.ticketTypes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-muted-foreground">
              Ticket sales open soon — check back shortly.
            </p>
          ) : soldOut ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <p className="font-display text-lg font-semibold">Sold out</p>
              <p className="mt-1 text-sm text-muted-foreground">Leave your email and we&apos;ll tell you the moment more tickets open up.</p>
              <div className="mt-4"><NotifyMe eventId={event.id} /></div>
            </div>
          ) : (
            <TicketCheckout
              eventId={event.id}
              ticketTypes={event.ticketTypes.map((t) => ({ id: t.id, name: t.name, priceInPaise: t.priceInPaise }))}
            />
          )}
        </section>

        {event.schedule.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">What&apos;s happening</h2>
            <ul className="mt-4 space-y-2.5">
              {event.schedule.map((s) => (
                <li key={s.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                  <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
                    <Clock className="size-4" /> {time(s.startsAt)}
                  </span>
                  <span className="text-sm">
                    {s.title}
                    {s.stageOrZone ? <span className="text-muted-foreground"> · {s.stageOrZone}</span> : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {mapStalls.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">Floor plan</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Selling at the market? Browse live availability and tap an open stall to hold it.
            </p>
            <BookingFloorPlan stalls={mapStalls} />
          </section>
        )}

        {sponsors.length > 0 && (
          <section className="mt-12">
            <SponsorStrip sponsors={sponsors} />
          </section>
        )}
      </main>
    </div>
  );
}
