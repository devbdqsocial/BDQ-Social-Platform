import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqLd } from "@/lib/seo/jsonld";

/* DRAFT — owner review before launch. Evergreen SEO/GEO hub targeting "things to do in Vadodara".
   Copy is factual and on-brand-adjacent; refine voice and add seasonal specifics before go-live. */

export const metadata: Metadata = {
  title: "Things to Do in Vadodara",
  description:
    "A guide to the best things to do in Vadodara — from curated markets and live music to food and weekend events. Discover BDQ Social, the city's premium lifestyle night market.",
  alternates: { canonical: "/things-to-do-in-vadodara" },
};

const FAQS: readonly (readonly [string, string])[] = [
  ["What is there to do in Vadodara on weekends?", "Vadodara's weekends range from heritage spots like Laxmi Vilas Palace and Sayaji Baug to live comedy, concerts, exhibitions, and curated markets. For a premium evening out, BDQ Social brings together handpicked brands, gourmet food, and live music."],
  ["What is BDQ Social?", "BDQ Social is Vadodara's premium curated lifestyle festival and night market — a single, designed evening of indie brands, gourmet food, and live music, held the weekend before Diwali."],
  ["How is BDQ Social different from a regular flea market or mela?", "It is curated, not crowded — every brand is handpicked, the food and music are sequenced through the evening, and the whole night is produced with the polish of a premium festival rather than a sprawling bazaar."],
  ["Where can I find upcoming events in Vadodara?", "See the BDQ Social events page for dates and tickets to the next edition, and the brands page to preview who you'll meet."],
];

export default function ThingsToDoVadodaraPage() {
  return (
    <div>
      <JsonLd data={faqLd(FAQS)} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Things to do in Vadodara", path: "/things-to-do-in-vadodara" }]} />

      <section className="paint py-[var(--space-4xl)]">
        <div className="wrapper max-w-[60rem]">
          <span className="kicker block">Vadodara · City guide</span>
          <h1 className="f-exat mt-[var(--space-md)] f-h133">Things to do in Vadodara</h1>
          <p className="f-paragraph mt-[var(--space-lg)] max-w-[52ch]">
            Vadodara — Baroda to locals — pairs Gujarat&apos;s cultural heritage with a fast-growing
            scene of food, music, and design. Whether you have an afternoon or a full weekend, here&apos;s
            how to spend it well, and where a curated night market fits in.
          </p>
        </div>
      </section>

      {/* DRAFT — owner review: expand each category with specific, current recommendations. */}
      <section className="bdq-rose paint py-[var(--space-5xl)]">
        <div className="wrapper max-w-[60rem]">
          <h2 className="f-exat f-h60">Markets, shopping & lifestyle</h2>
          <p className="f-paragraph mt-[var(--space-lg)] max-w-[52ch]">
            The city&apos;s most talked-about evenings now happen at curated markets, where independent
            brands, food, and live music come together. BDQ Social is the premium take on this — a
            designed, grown-up alternative to the usual mela.
          </p>
          <div className="mt-[var(--space-xl)] flex flex-wrap gap-[var(--space-lg)]">
            <Link href="/events" className="btn" data-cursor><span className="btn__text">See upcoming events</span></Link>
            <Link href="/vendors" className="kicker link-underline" data-cursor>Meet the brands →</Link>
          </div>
        </div>
      </section>

      {/* DRAFT — owner review: add heritage, food, and family sections with local detail. */}
      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper max-w-[60rem]">
          <h2 className="f-exat f-h60">A curated evening, not a crowd</h2>
          <p className="f-paragraph mt-[var(--space-lg)] max-w-[52ch]">
            One unforgettable evening a year, set to a warm fairy-light glow: handpicked brands,
            gourmet food, and live music. Read more <Link href="/about" data-cursor className="link-underline">about BDQ Social</Link>{" "}
            or <Link href="/guide" data-cursor className="link-underline">plan your visit</Link>.
          </p>
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
