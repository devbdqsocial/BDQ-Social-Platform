import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { PinnedConcepts } from "@/components/motion/PinnedConcepts";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "About Us",
  description: "BDQ Social is Vadodara's premium curated lifestyle festival and night market — handpicked indie brands, gourmet food, and live music, one unforgettable evening a year.",
  alternates: { canonical: "/about" },
};

const WHAT: [string, string][] = [
  ["Curated, not crowded", "Every brand is handpicked. No filler stalls, no hard sell — just makers worth your evening."],
  ["An evening, designed", "Food, music, light and little surprises, sequenced so the night builds the way a good night should."],
  ["Local, elevated", "Vadodara's best, given the production and polish a premium festival deserves."],
];

function Btn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn" data-cursor>
      <span className="btn__text">{children}</span>
    </Link>
  );
}

export default function AboutPage() {
  return (
    <>
      <section className="gama-1 bg-2 paint flex min-h-[70svh] items-end py-[var(--space-5xl)]">
        <div className="wrapper">
          <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.18em" }}>About</span>
          <SplitReveal as="h1" className="f-exat mt-[var(--space-md)] max-w-[16ch] f-h133">
            The warm, grown-up night market
          </SplitReveal>
        </div>
      </section>

      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper">
          <Reveal>
            <p className="f-exat max-w-[24ch] f-h76" style={{ textIndent: "2em" }}>
              {LEGAL.brand} curates one unforgettable evening a year — indie brands, gourmet food, and
              live music, set to a warm fairy-light glow.
            </p>
          </Reveal>
        </div>
      </section>

      {/* conceptos — pinned crossfade steps */}
      <PinnedConcepts />

      <section className="gama-2 surface-1 paint py-[var(--space-5xl)]">
        <div className="wrapper">
          <h2 className="f-exat f-h60">What we&apos;re about</h2>
          <Reveal stagger className="mt-[var(--space-3xl)] grid gap-[var(--space-2xl)] sm:grid-cols-3">
            {WHAT.map(([title, body], i) => (
              <div key={title} className="pt-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
                <span className="f-exat f-h32">0{i + 1}</span>
                <h3 className="f-exat mt-[var(--space-md)] f-h42">{title}</h3>
                <p className="f-paragraph mt-[var(--space-sm)] opacity-80">{body}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="gama-3 bg-3 paint flex min-h-[70svh] items-center py-[var(--space-5xl)]">
        <div className="wrapper text-center">
          <Reveal>
            <h2 className="f-exat mx-auto max-w-[18ch] f-h100">
              Come for the finds, stay for the night.
            </h2>
            <div className="mt-[var(--space-2xl)] flex justify-center gap-[var(--space-lg)]">
              <Btn href="/events">Tickets</Btn>
              <Btn href="/vendor/login">Sell with us</Btn>
            </div>
            <p className="f-paragraph-small mt-[var(--space-2xl)] opacity-60">
              {LEGAL.entity} · {LEGAL.address} · {LEGAL.email}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
