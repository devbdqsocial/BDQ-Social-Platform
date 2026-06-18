import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqLd } from "@/lib/seo/jsonld";

/* DRAFT — owner review before launch. Evergreen SEO/GEO hub targeting "night markets / flea markets
   in Vadodara". Copy is factual and on-brand-adjacent; refine voice before go-live. */

export const metadata: Metadata = {
  title: "Night Markets & Flea Markets in Vadodara",
  description:
    "A guide to night markets and flea markets in Vadodara — what to expect, and why BDQ Social is the city's premium curated night market of indie brands, food, and live music.",
  alternates: { canonical: "/night-markets-vadodara" },
};

const FAQS: readonly (readonly [string, string])[] = [
  ["Are there night markets in Vadodara?", "Yes. Vadodara's night-market and flea scene has grown into curated evenings of shopping, food, and live music. BDQ Social is the premium edition — handpicked brands and a designed evening rather than a sprawling bazaar."],
  ["What is a curated night market?", "A curated night market is an evening event where every brand and food vendor is selected for quality, with live music and atmosphere designed around the visitor — the opposite of an open, crowded flea market."],
  ["When is the BDQ Social night market?", "BDQ Social is held as one evening a year, the weekend before Diwali, in Vadodara. Check the events page for the next edition's date and tickets."],
  ["How much are tickets?", "Tickets are priced per edition and sold online — you receive a QR code on your phone for entry. See the events page for current pricing."],
];

export default function NightMarketsVadodaraPage() {
  return (
    <div>
      <JsonLd data={faqLd(FAQS)} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Night markets in Vadodara", path: "/night-markets-vadodara" }]} />

      <section className="paint py-[var(--space-4xl)]">
        <div className="wrapper max-w-[60rem]">
          <span className="kicker block">Vadodara · Night markets</span>
          <h1 className="f-exat mt-[var(--space-md)] f-h133">Night markets &amp; flea markets in Vadodara</h1>
          <p className="f-paragraph mt-[var(--space-lg)] max-w-[52ch]">
            The flea market has grown up in Vadodara. What was once a weekend bazaar is now an evening
            out — shopping, food, and live music under one sky. Here&apos;s what to expect, and where
            BDQ Social fits as the city&apos;s premium curated night market.
          </p>
        </div>
      </section>

      {/* DRAFT — owner review: expand with what to expect, timings, and how to choose a market. */}
      <section className="gama-2 surface-2 paint py-[var(--space-5xl)]">
        <div className="wrapper max-w-[60rem]">
          <h2 className="f-exat f-h60">Curated, not crowded</h2>
          <p className="f-paragraph mt-[var(--space-lg)] max-w-[52ch]">
            BDQ Social handpicks every brand and food vendor, sequences the music through the evening,
            and produces the whole night with the polish of a premium festival. It&apos;s the warm,
            grown-up alternative to the usual mela.
          </p>
          <div className="mt-[var(--space-xl)] flex flex-wrap gap-[var(--space-lg)]">
            <Link href="/events" className="btn" data-cursor><span className="btn__text">Get tickets</span></Link>
            <Link href="/vendors" className="kicker link-underline" data-cursor>See the brands →</Link>
          </div>
        </div>
      </section>

      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper max-w-[60rem]">
          <h2 className="f-exat f-h60">Good to know</h2>
          <div className="mt-[var(--space-2xl)]">
            {FAQS.map(([q, a]) => (
              <details key={q} className="group py-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
                <summary className="f-exat flex cursor-pointer list-none items-center justify-between gap-[var(--space-lg)] f-h42">
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
