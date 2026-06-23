import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicLineup } from "@/server/artists/public";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";

export const metadata: Metadata = {
  title: "Lineup",
  description: "The artist lineup for BDQ Social — live music, DJs, and performers at Vadodara's night market.",
  alternates: { canonical: "/lineup" },
};
export const dynamic = "force-dynamic";

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fmtTime = (d: Date) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);

export default async function LineupPage() {
  const data = await getPublicLineup();
  if (!data) notFound(); // feature flag off or no active event

  return (
    <section data-header-mode="dark" className="paint py-[var(--space-4xl)]">
      <div className="wrapper max-w-[var(--w-content)]">
        <Reveal><span className="kicker opacity-70">Who&apos;s playing</span></Reveal>
        <SplitReveal as="h1" className="f-exat mt-[var(--space-sm)] f-h76">The lineup</SplitReveal>

        <div className="mt-[var(--space-2xl)]">
          {data.bookings.length === 0 ? (
            <div className="p-[var(--space-3xl)] text-center" style={{ border: "1px dashed var(--color)" }}>
              <p className="f-exat f-h42">Lineup dropping soon</p>
              <p className="f-paragraph-small mt-[var(--space-sm)] opacity-70">Acts are being confirmed. Check back shortly.</p>
            </div>
          ) : (
            <div className="grid gap-[var(--grid-gap)] sm:grid-cols-2 lg:grid-cols-3">
              {data.bookings.map((b) => (
                <article key={b.id} className="p-[var(--space-xl)]" style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)", borderRadius: "var(--radius-lg)" }}>
                  <p className="f-exat f-h42">{b.artist.stageName}</p>
                  <p className="f-paragraph-small mt-[var(--space-xs)] opacity-70">
                    {[titleCase(b.artist.type), b.artist.genre].filter(Boolean).join(" · ")}
                  </p>
                  {b.artist.bio && <p className="f-paragraph-small mt-[var(--space-sm)] opacity-80 line-clamp-3">{b.artist.bio}</p>}
                  <p className="f-paragraph-small mt-[var(--space-md)] font-bold">
                    {b.setStartsAt ? fmtTime(b.setStartsAt) : "Time TBA"}
                    {b.stageOrZone ? ` · ${b.stageOrZone}` : ""}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
