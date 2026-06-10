import Image from "next/image";
import Link from "next/link";
import { listPublished } from "@/server/events/service";
import { listApprovedVendors } from "@/server/vendors/service";
import { sponsorsForEvent } from "@/server/sponsors/service";
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

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(d);

// Angled RPA tab button.
function Btn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn" data-cursor>
      <span className="btn__text">{children}</span>
    </Link>
  );
}

export default async function LandingPage() {
  const [events, brands] = await Promise.all([listPublished(), listApprovedVendors()]);
  const event = events[0];
  const featured = brands.slice(0, 6);
  const minPrice = event?.ticketTypes.length ? Math.min(...event.ticketTypes.map((t) => t.priceInPaise)) : null;
  const sponsors = event ? await sponsorsForEvent(event.id) : [];
  const heroImg = featured.map((v) => primaryLogo(v.assets)).find(Boolean) ?? null;

  return (
    <div>
      {/* ============ HERO (cabecera--home) — navy / light-blue ============ */}
      <section className="gama-1 bg-1 paint relative flex min-h-[100svh] items-center overflow-hidden">
        <div className="wrapper grid w-full items-center gap-[var(--space-3xl)] py-[var(--space-5xl)] lg:grid-cols-2">
          <div>
            <Reveal>
              <span className="kicker block">{event?.location ?? "Vadodara"} · Curated night market</span>
            </Reveal>
            <SplitReveal as="h1" mode="chars" className="f-exat mt-[var(--space-md)] max-w-[14ch]" style={{ fontSize: "var(--h133)", lineHeight: 0.98 }}>
              The city&apos;s most curated night market
            </SplitReveal>
            <Reveal stagger delay={0.2}>
              <p className="f-paragraph mt-[var(--space-lg)] max-w-[34ch] opacity-80">
                An evening of handpicked brands, gourmet food, and live music — the warm, grown-up
                alternative to the usual mela.
              </p>
              {event && (
                <p className="kicker mt-[var(--space-lg)]">
                  {fmtDate(event.startsAt)} · {event.location}
                </p>
              )}
              {event && <div className="mt-[var(--space-md)]"><Countdown target={event.startsAt.toISOString()} /></div>}
              <div className="mt-[var(--space-xl)] flex flex-wrap items-center gap-[var(--space-lg)]">
                <Btn href="/events">Tickets</Btn>
                <Btn href="/vendors">Brands</Btn>
                {minPrice != null && (
                  <span className="f-paragraph-small opacity-70">from {formatPaise(minPrice)}</span>
                )}
              </div>
            </Reveal>
          </div>

          <Reveal effect="clip" className="hidden lg:block">
            <Parallax amount={10}>
              <div className="svg svg--form11 media-tint mx-auto w-[80%]">
                {heroImg ? (
                  <Image src={heroImg} alt="" fill className="svg__img" sizes="40vw" priority />
                ) : (
                  <div className="svg__bg" />
                )}
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
                "80+ curated brands",
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

      {/* ============ MANIFESTO (mod-text--big) — cream / ink ============ */}
      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper">
          <SplitReveal
            as="p"
            className="f-exat max-w-[18ch]"
            style={{ fontSize: "var(--h100)", lineHeight: 1.05, textIndent: "2em" }}
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
              <SplitReveal as="h2" mode="chars" className="f-exat" style={{ fontSize: "var(--h133)", lineHeight: 1.0 }}>
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
                <span key={`${name}-${i}`} className="f-exat px-[var(--space-3xl)]" style={{ fontSize: "var(--h60)" }}>
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
            duration={24}
            rowClassName="f-h133"
            className="pointer-events-none absolute inset-0 flex flex-col justify-between py-[var(--space-lg)] opacity-10"
          />
          <div className="wrapper relative w-full text-center">
            <Reveal>
              <span className="kicker block">Up next</span>
              <h2 className="f-exat mx-auto mt-[var(--space-md)] max-w-[16ch]" style={{ fontSize: "var(--h133)", lineHeight: 1.0 }}>
                {event.name}
              </h2>
              <p className="f-paragraph mt-[var(--space-lg)]">
                {fmtDate(event.startsAt)} · {event.location}
                {minPrice != null && <> · from {formatPaise(minPrice)}</>}
              </p>
              <div className="mt-[var(--space-2xl)] flex justify-center">
                <Link href={`/events/${event.slug}`} className="btn btn--lg" data-cursor>
                  <span className="btn__text">Get tickets</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ============ FAQ — cream / ink ============ */}
      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper max-w-[60rem]">
          <h2 className="f-exat" style={{ fontSize: "var(--h60)", lineHeight: 1.05 }}>Good to know</h2>
          <div className="mt-[var(--space-2xl)]">
            {[
              ["When is it?", "An evening event — gates open in the late afternoon and we go into the night, the weekend before Diwali."],
              ["How do I get in?", "Book online and we'll send a QR code to your phone. Show it at the gate — that's it."],
              ["Can I get a refund?", "All sales are final, so pick your date with confidence. No refunds."],
              ["Is there food?", "Plenty. A full food court with the city's best cafés, bakers, and street food."],
            ].map(([q, a]) => (
              <details key={q} className="group py-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
                <summary className="f-exat flex cursor-pointer list-none items-center justify-between gap-[var(--space-lg)]" style={{ fontSize: "var(--h60)", lineHeight: 1.05 }}>
                  {q}
                  <span aria-hidden className="shrink-0 transition-transform duration-300 group-open:rotate-45" style={{ fontSize: "var(--h42)" }}>+</span>
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
