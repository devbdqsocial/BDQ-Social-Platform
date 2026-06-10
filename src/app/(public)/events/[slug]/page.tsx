import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { getBySlug } from "@/server/events/service";
import { sponsorsForEvent } from "@/server/sponsors/service";
import { fmtDateFull, fmtTime, fmtDayLabel } from "@/lib/date-formats";
import { BookingFloorPlan } from "@/components/map/BookingFloorPlan";
import { TicketCheckout } from "@/components/tickets/TicketCheckout";
import { SponsorStrip } from "@/components/landing/SponsorStrip";
import { NotifyMe } from "@/components/events/NotifyMe";

export const dynamic = "force-dynamic";

const fmt = fmtDateFull;
const time = fmtTime;
const dayLabel = fmtDayLabel;

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

  const mapCanvas = (event.mapLayout?.layoutJson as { canvas?: { widthFt: number; heightFt: number } } | null)?.canvas;
  const sponsors = await sponsorsForEvent(event.id);
  const soldOut = event.ticketTypes.length > 0 && event.ticketTypes.every((t) => t.soldQty >= t.totalQty);
  const theme = (event.theme as { primary?: string; accent?: string } | null) ?? null;
  const themeStyle = theme ? ({ "--primary": theme.primary, "--accent": theme.accent } as React.CSSProperties) : undefined;

  return (
    <div style={themeStyle}>
      {/* Event header — cabecera--proyecto */}
      <section className="gama-1 bg-1 paint flex min-h-[65svh] items-end py-[var(--space-5xl)]">
        <div className="wrapper">
          <h1 className="f-exat" style={{ fontSize: "var(--h133)", lineHeight: 0.95 }}>{event.name}</h1>
          <div className="f-paragraph-small f-bold mt-[var(--space-lg)] flex flex-wrap gap-[var(--space-lg)] t-upper" style={{ letterSpacing: "0.12em" }}>
            <span>{fmt(event.startsAt)}</span>
            {event.location && <span>{event.location}</span>}
          </div>
          {event.description && (
            <p className="f-paragraph mt-[var(--space-lg)] max-w-[52ch] opacity-80">{event.description}</p>
          )}
        </div>
      </section>

      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper max-w-[62rem]">
          <h2 className="f-exat mb-[var(--space-lg)]" style={{ fontSize: "var(--h42)" }}>Get your tickets</h2>
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

          {event.schedule.length > 0 && (
            <div className="mt-[var(--space-4xl)]">
              <h2 className="f-exat" style={{ fontSize: "var(--h42)" }}>What&apos;s happening</h2>
              <div className="mt-[var(--space-lg)] space-y-6">
                {Object.entries(
                  event.schedule.reduce<Record<string, typeof event.schedule>>((acc, s) => {
                    (acc[dayLabel(s.startsAt)] ??= []).push(s);
                    return acc;
                  }, {}),
                ).map(([day, items]) => (
                  <div key={day}>
                    <h3 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{day}</h3>
                    <ul className="space-y-2.5">
                      {items.map((s) => (
                        <li key={s.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                          <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
                            <Clock className="size-4" /> {time(s.startsAt)}{s.endsAt ? `–${time(s.endsAt)}` : ""}
                          </span>
                          <span className="text-sm">
                            {s.title}
                            {s.stageOrZone ? <span className="text-muted-foreground"> · {s.stageOrZone}</span> : ""}
                            {s.performer ? <span className="text-muted-foreground"> · {s.performer}</span> : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mapStalls.length > 0 && (
            <div className="mt-[var(--space-4xl)]">
              <h2 className="f-exat" style={{ fontSize: "var(--h42)" }}>Event layout</h2>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                Selling at the market? Browse live availability and tap an open stall to hold it.
              </p>
              <BookingFloorPlan stalls={mapStalls} canvas={mapCanvas} />
            </div>
          )}

          {sponsors.length > 0 && (
            <div className="mt-[var(--space-4xl)]">
              <SponsorStrip sponsors={sponsors} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
