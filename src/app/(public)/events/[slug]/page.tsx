import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBySlug } from "@/server/events/service";
import { getEventGuide } from "@/server/map/guide";
import { sponsorsForEventPublic } from "@/server/sponsors/service";
import { listApprovedVendors } from "@/server/vendors/service";
import { listEventRuleDocs, parseSections } from "@/server/legal/docs";
import { mergeSections } from "@/server/legal/tokens";
import { DocSectionsView } from "@/components/legal/DocSections";
import { primaryLogo } from "@/lib/vendor-assets";
import { formatPaise } from "@/lib/utils";
import { fmtDateFull, fmtTime, fmtDayLabel } from "@/lib/date-formats";
import { Countdown } from "@/components/landing/Countdown";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { BdqWorld } from "@/components/motion/BdqWorld";
import { EventGuide } from "@/components/map/EventGuide";
import { TicketCheckout } from "@/components/tickets/TicketCheckout";
import { SponsorStrip } from "@/components/landing/SponsorStrip";
import { NotifyMe } from "@/components/events/NotifyMe";
import { StickyBuyBar } from "@/components/events/StickyBuyBar";
import { JsonLd } from "@/components/seo/JsonLd";
import { eventLd, breadcrumbLd } from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic";

const fmt = fmtDateFull;
const time = fmtTime;
const dayLabel = fmtDayLabel;

const POLICIES: [string, string][] = [
  ["Support", "Need help with your booking? Contact support with your order reference and we will guide you through the available options."],
  ["Entry", "Your QR code is your ticket. Show it at the gate from your phone — one QR admits your whole group."],
  ["Security", "Bag checks at entry for everyone's safety. No outside alcohol; please travel light."],
  ["Parking", "On-site and nearby parking available. Arrive a little early on peak evenings."],
  ["Kids", "Family-friendly until early evening. Little ones enter free with a paying adult."],
  ["Photography", "Bring your camera — it's made for photos. We may capture the event for our channels."],
];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getBySlug(slug);
  if (!event) return { title: "Event" };
  const description =
    event.description?.trim() ||
    `${event.name} — a curated lifestyle night market${event.location ? ` in ${event.location}` : " in Vadodara"}. Book tickets and meet handpicked brands over food and live music.`;
  const url = `/events/${slug}`;
  return {
    title: event.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: event.name, description, images: [{ url: `/api/og/event/${slug}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: event.name, description, images: [`/api/og/event/${slug}`] },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getBySlug(slug);
  if (!event || (event.status !== "PUBLISHED" && event.status !== "LIVE")) notFound();

  const [sponsors, vendors, ruleDocs] = await Promise.all([sponsorsForEventPublic(event.id), listApprovedVendors(), listEventRuleDocs(event.id)]);
  const brands = vendors.slice(0, 8);
  const hasStallLayout = event.vendorStallsEnabled && !!event.mapLayout && event._count.stalls > 0;
  const guide = hasStallLayout ? await getEventGuide({ includeLayout: true, slug }) : null;

  const hasTickets = event.ticketTypes.length > 0;
  const soldOut = hasTickets && event.ticketTypes.every((t) => t.soldQty >= t.totalQty);
  const minPrice = hasTickets ? Math.min(...event.ticketTypes.map((t) => t.priceInPaise)) : null;
  const totalCap = event.ticketTypes.reduce((s, t) => s + t.totalQty, 0);
  const remaining = event.ticketTypes.reduce((s, t) => s + Math.max(0, t.totalQty - t.soldQty), 0);
  const availLabel = soldOut ? "Sold out" : !hasTickets ? "On sale soon" : totalCap > 0 && remaining / totalCap <= 0.15 ? "Selling fast" : "On sale now";
  const priceLabel = minPrice != null ? `from ${formatPaise(minPrice)}` : null;

  const theme = (event.theme as { primary?: string; accent?: string } | null) ?? null;
  const themeStyle = theme ? ({ "--primary": theme.primary, "--accent": theme.accent } as React.CSSProperties) : undefined;

  return (
    <div style={themeStyle}>
      <JsonLd
        data={[
          eventLd({
            name: event.name,
            slug: event.slug,
            description: event.description,
            location: event.location,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            ticketTypes: event.ticketTypes,
            performers: event.schedule.map((s) => s.performer),
          }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Events", path: "/events" },
            { name: event.name, path: `/events/${event.slug}` },
          ]),
        ]}
      />
      {/* ===== HERO — sell the night, CTA above the fold ===== */}
      <section data-header-mode="light" className="bdq-night paint relative flex min-h-[78svh] items-end overflow-hidden py-[var(--space-5xl)]">
        <BdqWorld tint="var(--light-blue)" className="opacity-25" />
        <div className="wrapper relative z-10">
          <Reveal><span className="kicker">{availLabel}{event.location ? ` · ${event.location}` : ""}</span></Reveal>
          <SplitReveal as="h1" mode="chars" className="f-exat mt-[var(--space-sm)] f-h133">{event.name}</SplitReveal>
          <Reveal stagger delay={0.15}>
            <div className="mt-[var(--space-lg)] flex flex-wrap items-center gap-[var(--space-lg)]">
              <span className="kicker">{fmt(event.startsAt)}</span>
              {priceLabel && <span className="kicker">Tickets {priceLabel}</span>}
            </div>
            {event.description && <p className="f-paragraph mt-[var(--space-lg)] max-w-[52ch]">{event.description}</p>}
            <div className="mt-[var(--space-xl)]"><Countdown target={event.startsAt.toISOString()} /></div>
            <div id="event-hero-cta" className="mt-[var(--space-xl)] flex flex-wrap items-center gap-[var(--space-lg)]">
              {hasTickets && !soldOut && (
                <Magnetic><a href="#tickets" className="btn btn--lg" data-cursor><span className="btn__text">Get tickets</span></a></Magnetic>
              )}
              <Link href="/vendors" className="kicker link-underline" data-cursor>See the brands →</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== TICKETS ===== */}
      <section id="tickets" className="paint py-[var(--space-5xl)]" style={{ scrollMarginTop: "var(--space-xl)" }}>
        <div className="wrapper max-w-[var(--w-content)]">
          <h2 className="f-exat mb-[var(--space-lg)] f-h42">Get your tickets</h2>
          {!hasTickets ? (
            <p className="f-paragraph p-[var(--space-xl)] text-center opacity-70" style={{ border: "1px dashed var(--color)" }}>
              Ticket sales open soon — check back shortly.
            </p>
          ) : soldOut ? (
            <div className="p-[var(--space-xl)]" style={{ border: "1px solid var(--color)" }}>
              <p className="f-exat f-h42">Sold out</p>
              <p className="f-paragraph-small mt-[var(--space-sm)] opacity-70">Leave your email and we&apos;ll tell you the moment more tickets open up.</p>
              <div className="mt-[var(--space-lg)]"><NotifyMe eventId={event.id} /></div>
            </div>
          ) : (
            <TicketCheckout
              eventId={event.id}
              ticketTypes={event.ticketTypes.map((t) => ({ id: t.id, name: t.name, priceInPaise: t.priceInPaise, remaining: Math.max(0, t.totalQty - t.soldQty) }))}
            />
          )}
        </div>
      </section>

      {/* ===== FEATURED BRANDS — real approved vendors ===== */}
      {brands.length > 0 && (
        <section className="bdq-rose paint py-[var(--space-5xl)]">
          <div className="wrapper">
            <div className="flex items-end justify-between gap-4">
              <h2 className="f-exat f-h60">The brands you&apos;ll meet</h2>
              <Link href="/vendors" data-cursor className="kicker link-underline">See all →</Link>
            </div>
            <ul className="mt-[var(--space-2xl)] grid grid-cols-2 gap-[var(--space-lg)] sm:grid-cols-3 lg:grid-cols-4">
              {brands.map((v) => {
                const logo = primaryLogo(v.assets);
                return (
                  <li key={v.id} className="bdq-surface flex aspect-[4/3] items-center justify-center overflow-hidden p-[var(--space-lg)]" style={{ border: "1px solid color-mix(in srgb, currentColor 20%, transparent)" }}>
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt={v.brandName} className="max-h-full max-w-full object-contain" loading="lazy" />
                    ) : (
                      <span className="f-exat text-center f-h32">{v.brandName}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* ===== SCHEDULE ===== */}
      {event.schedule.length > 0 && (
        <section id="schedule" className="paint py-[var(--space-5xl)]" style={{ scrollMarginTop: "var(--space-xl)" }}>
          <div className="wrapper max-w-[var(--w-content)]">
            <h2 className="f-exat f-h60">What&apos;s happening</h2>
            <div className="mt-[var(--space-2xl)] space-y-[var(--space-2xl)]">
              {Object.entries(
                event.schedule.reduce<Record<string, typeof event.schedule>>((acc, s) => {
                  (acc[dayLabel(s.startsAt)] ??= []).push(s);
                  return acc;
                }, {}),
              ).map(([day, items]) => (
                <div key={day}>
                  <h3 className="kicker mb-[var(--space-md)] opacity-70">{day}</h3>
                  <ul>
                    {items.map((s) => (
                      <li key={s.id} className="flex items-baseline gap-[var(--space-xl)] py-[var(--space-md)]" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 30%, transparent)" }}>
                        <span className="f-paragraph-small f-bold w-[9ch] shrink-0 tabular-nums">{time(s.startsAt)}{s.endsAt ? `–${time(s.endsAt)}` : ""}</span>
                        <span className="f-paragraph">
                          {s.title}
                          {s.stageOrZone ? <span className="opacity-60"> · {s.stageOrZone}</span> : ""}
                          {s.performer ? <span className="opacity-60"> · {s.performer}</span> : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== VENUE & ARRIVAL ===== */}
      <section className="bdq-grove paint py-[var(--space-5xl)]">
        <div className="wrapper max-w-[var(--w-content)]">
          <h2 className="f-exat f-h60">Getting there</h2>
          <div className="mt-[var(--space-lg)] grid gap-[var(--space-xl)] sm:grid-cols-2">
            <div><p className="kicker opacity-70">Venue</p><p className="f-paragraph mt-[var(--space-xs)]">{event.location ?? "Vadodara"}</p></div>
            <div><p className="kicker opacity-70">When</p><p className="f-paragraph mt-[var(--space-xs)]">{fmt(event.startsAt)}</p></div>
            <div><p className="kicker opacity-70">Parking</p><p className="f-paragraph mt-[var(--space-xs)]">On-site and nearby — arrive early on peak evenings.</p></div>
            <div><p className="kicker opacity-70">Accessibility</p><p className="f-paragraph mt-[var(--space-xs)]">Step-free entry and accessible restrooms on site.</p></div>
          </div>
          {guide && (guide.hasLayout || guide.brands.length > 0) && (
            <div className="mt-[var(--space-2xl)]">
              <p className="f-paragraph-small mb-[var(--space-md)] opacity-70">Find the brands, food and experiences across the venue.</p>
              <EventGuide guide={guide} />
            </div>
          )}
        </div>
      </section>

      {/* ===== POLICIES (trust) ===== */}
      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper max-w-[var(--w-content)]">
          <h2 className="f-exat f-h60">Good to know</h2>
          <div className="mt-[var(--space-2xl)]">
            {POLICIES.map(([q, a]) => (
              <details key={q} className="group py-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
                <summary className="f-exat flex cursor-pointer list-none items-center justify-between gap-[var(--space-lg)] f-h42">
                  {q}
                  <span aria-hidden className="shrink-0 transition-transform duration-300 group-open:rotate-45 f-h42">+</span>
                </summary>
                <p className="f-paragraph mt-[var(--space-md)] max-w-[52ch] opacity-80">{a}</p>
              </details>
            ))}
            {ruleDocs.map((a) => {
              const { sections } = mergeSections(parseSections(a.doc.sections), {
                event: { name: event.name, startsAt: event.startsAt, location: event.location },
              });
              return (
                <details key={a.id} className="group py-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
                  <summary className="f-exat flex cursor-pointer list-none items-center justify-between gap-[var(--space-lg)] f-h42">
                    {a.doc.title}
                    <span aria-hidden className="shrink-0 transition-transform duration-300 group-open:rotate-45 f-h42">+</span>
                  </summary>
                  <div className="f-paragraph-small mt-[var(--space-md)] max-w-[60ch] [&_a]:underline [&_h2]:mt-[var(--space-lg)] [&_h2]:font-bold [&_li]:mb-[var(--space-2xs)] [&_li]:opacity-80 [&_ol]:mt-[var(--space-sm)] [&_ol]:list-decimal [&_ol]:pl-[var(--space-lg)] [&_p]:mt-[var(--space-sm)] [&_p]:opacity-80 [&_strong]:font-bold [&_ul]:mt-[var(--space-sm)] [&_ul]:list-disc [&_ul]:pl-[var(--space-lg)]">
                    <DocSectionsView sections={sections} />
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </section>

      {sponsors.length > 0 && (
        <section className="paint pb-[var(--space-5xl)]">
          <div className="wrapper max-w-[var(--w-content)]"><SponsorStrip sponsors={sponsors} /></div>
        </section>
      )}

      {/* ===== FINAL CTA ===== */}
      {hasTickets && !soldOut && (
        <section className="bdq-spark paint relative flex min-h-[60svh] items-center overflow-hidden py-[var(--space-5xl)]">
          <div className="wrapper text-center">
            <span className="kicker block">{availLabel}</span>
            <h2 className="f-exat mx-auto mt-[var(--space-md)] max-w-[16ch] f-h133">Don&apos;t miss {event.name}</h2>
            <p className="f-paragraph mt-[var(--space-lg)]">{fmt(event.startsAt)}{priceLabel ? ` · Tickets ${priceLabel}` : ""}</p>
            <div className="mt-[var(--space-2xl)] flex justify-center">
              <a href="#tickets" className="btn btn--lg" data-cursor><span className="btn__text">Get tickets</span></a>
            </div>
          </div>
        </section>
      )}

      {hasTickets && !soldOut && <StickyBuyBar priceLabel={priceLabel} />}
    </div>
  );
}
