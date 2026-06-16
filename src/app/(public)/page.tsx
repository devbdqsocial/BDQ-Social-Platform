import { fmtDateLong as fmtDate } from "@/lib/date-formats";
import Link from "next/link";
import { listPublished } from "@/server/events/service";
import { listApprovedVendors } from "@/server/vendors/service";
import { sponsorsForEventPublic } from "@/server/sponsors/service";
import { getHomeMode } from "@/lib/home-mode";
import { getHappeningStrip } from "@/server/content/happening";
import { HappeningStrip } from "@/components/events/HappeningStrip";
import { FestivalCompanion } from "@/components/landing/FestivalCompanion";
import { PostEventMemories } from "@/components/landing/PostEventMemories";
import { homeFocus } from "@/lib/home-content";
import { primaryLogo } from "@/lib/vendor-assets";
import { formatPaise } from "@/lib/utils";
import { Countdown } from "@/components/landing/Countdown";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Parallax } from "@/components/motion/Parallax";
import { Marquee } from "@/components/motion/Marquee";
import { WordmarkWall } from "@/components/motion/WordmarkWall";
import { PinnedServices } from "@/components/motion/PinnedServices";
import { BrandsCarousel } from "@/components/motion/BrandsCarousel";

// ISR (R3.2): statically cached, revalidated every 5 min — landing has no per-request data.
export const revalidate = 300;

// Angled RPA tab button.
function Btn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn" data-cursor>
      <span className="btn__text">{children}</span>
    </Link>
  );
}

// Proof-band stat — a real count, never a fabricated claim (R3.2 / design-debt D25).
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <Reveal>
      <div className="f-exat tabular-nums f-h100">{n}</div>
      <div className="kicker mt-[var(--space-xs)]">{label}</div>
    </Reveal>
  );
}

export default async function LandingPage() {
  const [events, brands] = await Promise.all([listPublished(), listApprovedVendors()]);
  const event = events[0];
  const featured = brands.slice(0, 6);
  const minPrice = event?.ticketTypes.length ? Math.min(...event.ticketTypes.map((t) => t.priceInPaise)) : null;
  const sponsors = event ? await sponsorsForEventPublic(event.id) : [];

  // Lifecycle orchestration (R3.10): the home shifts focus PRE → LIVE → POST, same page + nav.
  const mode = getHomeMode(event ? { startsAt: event.startsAt, endsAt: event.endsAt, status: event.status } : null);
  const focus = homeFocus(mode);
  // Happening strip (R6.3): the event heartbeat. Hidden POST; PRE shows upcoming, LIVE refreshes.
  const happenings = event && mode !== "POST" ? await getHappeningStrip(event.id) : [];

  return (
    <div>
      {/* ============ HERO (cabecera--home) — navy / light-blue ============ */}
      <section className="gama-1 bg-1 paint relative flex min-h-[100svh] items-center overflow-hidden">
        <div className="wrapper grid w-full items-center gap-[var(--space-3xl)] py-[var(--space-5xl)] lg:grid-cols-2">
          <div>
            <Reveal>
              <span className="kicker block">{event?.location ?? "Vadodara"} · {focus.kicker}</span>
            </Reveal>
            <SplitReveal as="h1" mode="chars" className="f-exat mt-[var(--space-md)] max-w-[14ch] f-h133">
              The city&apos;s most curated night market
            </SplitReveal>
            <Reveal stagger delay={0.2}>
              <p className="f-paragraph mt-[var(--space-lg)] max-w-[34ch]">
                An evening of handpicked brands, gourmet food, and live music — the warm, grown-up
                alternative to the usual mela.
              </p>
              {event && (
                <p className="kicker mt-[var(--space-lg)]">
                  {fmtDate(event.startsAt)} · {event.location}
                </p>
              )}
              {event && focus.showCountdown && <div className="mt-[var(--space-md)]"><Countdown target={event.startsAt.toISOString()} /></div>}
              <div className="mt-[var(--space-xl)] flex flex-wrap items-center gap-[var(--space-lg)]">
                <Btn href={focus.primary.href}>{focus.primary.label}</Btn>
                {focus.secondary.map((a) => <Btn key={a.href} href={a.href}>{a.label}</Btn>)}
                {minPrice != null && focus.showTicketPrice && (
                  <span className="f-paragraph-small">from {formatPaise(minPrice)}</span>
                )}
              </div>
            </Reveal>
          </div>

          {/* Intentional RPA key art (D24): the branded form shape, not a borrowed vendor logo. */}
          <Reveal effect="clip" className="hidden lg:block">
            <Parallax amount={10}>
              <div className="svg svg--form11 media-tint mx-auto w-[80%]">
                <div className="svg__bg" />
              </div>
            </Parallax>
          </Reveal>
        </div>

        {/* event-facts ticker pinned to the hero's bottom edge */}
        {event && (
          <div
            className="absolute inset-x-0 bottom-0 py-[var(--space-md)]"
            style={{ borderTop: "1px solid color-mix(in srgb, currentColor 25%, transparent)" }}
          >
            <Marquee speed={32}>
              {[
                event.name,
                fmtDate(event.startsAt),
                event.location ?? "Vadodara",
                ...(minPrice != null ? [`Tickets from ${formatPaise(minPrice)}`] : []),
                ...(brands.length > 0 ? [`${brands.length} curated brands`] : []),
                "Live music",
              ].map((fact, i) => (
                <span key={i} className="kicker px-[var(--space-2xl)]">
                  {fact} <span className="opacity-50">·</span>
                </span>
              ))}
            </Marquee>
          </div>
        )}
      </section>

      {/* ============ HAPPENING STRIP (R6.3) — the event heartbeat, PRE/LIVE only ============ */}
      {event && happenings.length > 0 && (
        <HappeningStrip eventId={event.id} initial={happenings} live={mode === "LIVE"} />
      )}

      {/* ============ FESTIVAL COMPANION (R6.4) — utility-first quick-nav when LIVE ============ */}
      {event && mode === "LIVE" && <FestivalCompanion />}

      {/* ============ POST-EVENT MEMORIES (R6.5) — attendance → memories when the event ends ====== */}
      {event && mode === "POST" && <PostEventMemories eventName={event.name} brandCount={brands.length} sponsorCount={sponsors.length} />}

      {/* ============ PROOF BAND (R3.2) — real counts, no static claims ============ */}
      {(brands.length > 0 || sponsors.length > 0) && (
        <section className="gama-2 surface-2 paint py-[var(--space-4xl)]">
          <div className="wrapper grid grid-cols-2 gap-[var(--space-xl)] text-center sm:grid-cols-3">
            <Stat n={brands.length} label="Curated brands" />
            {sponsors.length > 0 && <Stat n={sponsors.length} label={sponsors.length === 1 ? "Partner" : "Partners"} />}
            <Stat n={events.length} label={events.length === 1 ? "Edition" : "Editions"} />
          </div>
        </section>
      )}

      {/* ============ MANIFESTO (mod-text--big) — cream / ink ============ */}
      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper">
          <SplitReveal
            as="p"
            className="f-exat max-w-[18ch] f-h100" style={{ textIndent: "2em" }}
          >
            One unforgettable evening a year — set to a warm fairy-light glow.
          </SplitReveal>
        </div>
      </section>

      {/* ============ SERVICES — servicios--anima (pinned horizontal) ============ */}
      <PinnedServices />

      {/* ============ BRANDS (proyectos) — navy / pink, masked cards ============ */}
      {featured.length > 0 && (
        <section className="gama-2 surface-2 paint py-[var(--space-5xl)]">
          <div className="wrapper">
            <div className="flex items-end justify-between gap-4">
              <SplitReveal as="h2" mode="chars" className="f-exat f-h133">
                The brands
              </SplitReveal>
              <Link href="/vendors" data-cursor className="kicker link-underline">See all →</Link>
            </div>
            <div className="mt-[var(--space-3xl)]">
              <BrandsCarousel
                brands={featured.map((v) => ({ id: v.id, brandName: v.brandName, logo: primaryLogo(v.assets) ?? null }))}
              />
            </div>
          </div>
        </section>
      )}

      {/* ============ SPONSORS marquee (clientes) — dark-green / green, opposite rows ============ */}
      {(sponsors.length > 0 || brands.length > 4) && (
        <section className="gama-1 bg-2 paint overflow-hidden py-[var(--space-4xl)]">
          {[false, true].map((reverse) => (
            <Marquee key={String(reverse)} speed={reverse ? 36 : 28} reverse={reverse} className={reverse ? "mt-[var(--space-lg)] opacity-60" : ""}>
              {(sponsors.length ? sponsors.map((s) => s.name) : brands.map((b) => b.brandName)).map((name, i) => (
                <span key={`${name}-${i}`} className="f-exat px-[var(--space-3xl)] f-h60">
                  {name}
                </span>
              ))}
            </Marquee>
          ))}
        </section>
      )}

      {/* ============ CIERRE CTA — dark-red / green, wall texture ============ */}
      {event && (
        <section className="gama-3 bg-3 paint relative flex min-h-[80svh] items-center overflow-hidden py-[var(--space-5xl)]">
          <WordmarkWall
            rows={5}
            mobileRows={3}
            duration={24}
            rowClassName="f-h133"
            className="pointer-events-none absolute inset-0 flex flex-col justify-between py-[var(--space-lg)] opacity-10"
          />
          <div className="wrapper relative w-full text-center">
            <Reveal>
              <span className="kicker block">{focus.kicker}</span>
              <h2 className="f-exat mx-auto mt-[var(--space-md)] max-w-[16ch] f-h133">
                {focus.closing.heading(event.name)}
              </h2>
              <p className="f-paragraph mt-[var(--space-lg)]">
                {fmtDate(event.startsAt)} · {event.location}
                {minPrice != null && focus.showTicketPrice && <> · from {formatPaise(minPrice)}</>}
              </p>
              <div className="mt-[var(--space-2xl)] flex justify-center">
                <Link href={focus.closing.action.href} className="btn btn--lg" data-cursor>
                  <span className="btn__text">{focus.closing.action.label}</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ============ FAQ — cream / ink ============ */}
      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper max-w-[60rem]">
          <h2 className="f-exat f-h60">Good to know</h2>
          <div className="mt-[var(--space-2xl)]">
            {[
              ["When is it?", "An evening event — gates open in the late afternoon and we go into the night, the weekend before Diwali."],
              ["How do I get in?", "Book online and we'll send a QR code to your phone. Show it at the gate — that's it."],
              ["Can I get a refund?", "All sales are final, so pick your date with confidence. No refunds."],
              ["Is there food?", "Plenty. A full food court with the city's best cafés, bakers, and street food."],
            ].map(([q, a]) => (
              <details key={q} className="group py-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
                <summary className="f-exat flex cursor-pointer list-none items-center justify-between gap-[var(--space-lg)] f-h60">
                  {q}
                  <span aria-hidden className="shrink-0 transition-transform duration-300 group-open:rotate-45 f-h42">+</span>
                </summary>
                <p className="f-paragraph mt-[var(--space-md)] max-w-[52ch] opacity-80">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
