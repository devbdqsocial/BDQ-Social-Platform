import Image from "next/image";
import Link from "next/link";
import { listPublished } from "@/server/events/service";
import { listApprovedVendors } from "@/server/vendors/service";
import { sponsorsForEvent } from "@/server/sponsors/service";
import { primaryLogo } from "@/lib/vendor-assets";
import { formatPaise } from "@/lib/utils";
import { Countdown } from "@/components/landing/Countdown";
import { Reveal } from "@/components/motion/Reveal";
import { Marquee } from "@/components/motion/Marquee";
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
          <Reveal stagger>
            <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.18em" }}>
              {event?.location ?? "Vadodara"} · Curated night market
            </span>
            <h1 className="f-exat mt-[var(--space-md)]" style={{ fontSize: "var(--h133)", lineHeight: 1.0 }}>
              The city&apos;s most curated night market
            </h1>
            <p className="f-paragraph mt-[var(--space-lg)] max-w-[34ch] opacity-80">
              An evening of handpicked brands, gourmet food, and live music — the warm, grown-up
              alternative to the usual mela.
            </p>
            {event && (
              <p className="f-paragraph-small f-bold mt-[var(--space-lg)] t-upper" style={{ letterSpacing: "0.12em" }}>
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

          <Reveal className="hidden lg:block">
            <div className="svg svg--form11 mx-auto w-[80%]">
              {heroImg ? (
                <Image src={heroImg} alt="" fill className="svg__img" sizes="40vw" priority />
              ) : (
                <div className="svg__bg" />
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ MANIFESTO (mod-text--big) — cream / ink ============ */}
      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper">
          <Reveal>
            <p
              className="f-exat max-w-[18ch]"
              style={{ fontSize: "var(--h100)", lineHeight: 1.05, textIndent: "2em" }}
            >
              One unforgettable evening a year — set to a warm fairy-light glow.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ SERVICES — servicios--anima (pinned horizontal) ============ */}
      <PinnedServices />

      {/* ============ BRANDS (proyectos) — navy / pink, masked cards ============ */}
      {featured.length > 0 && (
        <section className="gama-2 surface-2 paint py-[var(--space-5xl)]">
          <div className="wrapper">
            <div className="flex items-end justify-between gap-4">
              <h2 className="f-exat" style={{ fontSize: "var(--h76)", lineHeight: 1.05 }}>The brands</h2>
              <Link href="/vendors" data-cursor className="f-paragraph-small f-bold t-upper">See all →</Link>
            </div>
            <div className="mt-[var(--space-3xl)]">
              <BrandsCarousel
                brands={featured.map((v) => ({ id: v.id, brandName: v.brandName, logo: primaryLogo(v.assets) ?? null }))}
              />
            </div>
          </div>
        </section>
      )}

      {/* ============ SPONSORS marquee (clientes) — dark-green / green ============ */}
      {(sponsors.length > 0 || brands.length > 4) && (
        <section className="gama-1 bg-2 paint overflow-hidden py-[var(--space-4xl)]">
          <Marquee speed={28}>
            {(sponsors.length ? sponsors.map((s) => s.name) : brands.map((b) => b.brandName)).map((name, i) => (
              <span key={`${name}-${i}`} className="f-exat px-[var(--space-3xl)]" style={{ fontSize: "var(--h60)" }}>
                {name}
              </span>
            ))}
          </Marquee>
        </section>
      )}

      {/* ============ CIERRE CTA — dark-red / green ============ */}
      {event && (
        <section className="gama-3 bg-3 paint flex min-h-[80svh] items-center py-[var(--space-5xl)]">
          <div className="wrapper text-center">
            <Reveal>
              <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.18em" }}>Up next</span>
              <h2 className="f-exat mx-auto mt-[var(--space-md)] max-w-[16ch]" style={{ fontSize: "var(--h133)", lineHeight: 1.0 }}>
                {event.name}
              </h2>
              <p className="f-paragraph mt-[var(--space-lg)]">
                {fmtDate(event.startsAt)} · {event.location}
                {minPrice != null && <> · from {formatPaise(minPrice)}</>}
              </p>
              <div className="mt-[var(--space-2xl)] flex justify-center">
                <Btn href={`/events/${event.slug}`}>Get tickets</Btn>
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
                <summary className="f-exat cursor-pointer list-none" style={{ fontSize: "var(--h32)" }}>{q}</summary>
                <p className="f-paragraph mt-[var(--space-sm)] opacity-80">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
