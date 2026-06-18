import type { Metadata } from "next";
import { getGuide } from "@/server/content/service";

export const metadata: Metadata = {
  title: "Festival Guide",
  description: "Know before you go — timings, getting there, food, family, accessibility, and house rules for BDQ Social in Vadodara.",
  alternates: { canonical: "/guide" },
};
export const dynamic = "force-dynamic";

const anchor = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default async function GuidePage() {
  const guide = await getGuide();

  return (
    <section className="paint py-[var(--space-4xl)]">
      <div className="wrapper max-w-[52rem]">
        <span className="kicker opacity-70">Know before you go</span>
        <h1 className="f-exat mt-[var(--space-sm)] f-h76">Festival guide</h1>

        {!guide || guide.sections.length === 0 ? (
          <div className="mt-[var(--space-2xl)] p-[var(--space-3xl)] text-center" style={{ border: "1px dashed var(--color)" }}>
            <p className="f-exat f-h42">The guide goes live closer to the event</p>
            <p className="f-paragraph-small mt-[var(--space-sm)] opacity-70">Timings, directions and everything you need to know will appear here.</p>
          </div>
        ) : (
          <>
            {/* anchor chip row */}
            <nav aria-label="Sections" className="mt-[var(--space-xl)] flex flex-wrap gap-[var(--space-sm)]">
              {guide.sections.map((s) => (
                <a key={s.heading} href={`#${anchor(s.heading)}`} data-cursor className="rounded-full px-[var(--space-md)] py-[var(--space-xs)] f-paragraph-small f-bold" style={{ border: "1px solid color-mix(in srgb, currentColor 35%, transparent)" }}>{s.heading}</a>
              ))}
            </nav>

            <div className="mt-[var(--space-3xl)] space-y-[var(--space-3xl)]">
              {guide.sections.map((s) => (
                <section key={s.heading} id={anchor(s.heading)} style={{ scrollMarginTop: "var(--space-xl)" }}>
                  <h2 className="f-exat f-h60">{s.heading}</h2>
                  <ul className="mt-[var(--space-md)] space-y-[var(--space-sm)]">
                    {s.body.map((line, i) => (
                      <li key={i} className="f-paragraph opacity-85">{line}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
