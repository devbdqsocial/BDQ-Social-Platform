import type { Metadata } from "next";
import { getEventGuide } from "@/server/map/guide";
import { EventGuide } from "@/components/map/EventGuide";

export const metadata: Metadata = { title: "Explore the event" };
export const dynamic = "force-dynamic";

export default async function MapPage() {
  const guide = await getEventGuide();

  return (
    <section className="paint py-[var(--space-4xl)]">
      <div className="wrapper max-w-[64rem]">
        <span className="kicker opacity-70">{guide?.event.location ?? "The venue"}</span>
        <h1 className="f-exat mt-[var(--space-sm)] f-h76">Explore {guide?.event.name ?? "the event"}</h1>
        <p className="f-paragraph mt-[var(--space-md)] max-w-[52ch] opacity-80">
          Find the brands you love, the food you&apos;ll queue for, and everything happening across the venue.
        </p>

        <div className="mt-[var(--space-2xl)]">
          {!guide || (!guide.hasLayout && guide.brands.length === 0) ? (
            <div className="p-[var(--space-3xl)] text-center" style={{ border: "1px dashed var(--color)" }}>
              <p className="f-exat f-h42">The guide goes live closer to the event</p>
              <p className="f-paragraph-small mt-[var(--space-sm)] opacity-70">Brands and the full venue map appear here as the line-up is confirmed.</p>
            </div>
          ) : (
            <EventGuide guide={guide} />
          )}
        </div>
      </div>
    </section>
  );
}
