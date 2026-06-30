import type { Metadata } from "next";
import { fmtDateTime as fmt } from "@/lib/date-formats";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { listPublished } from "@/server/events/service";
import { formatPaise } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";

export const metadata: Metadata = {
  title: "Events & Tickets in Vadodara",
  description:
    "Upcoming BDQ Social events in Vadodara — book tickets to the city's premium curated lifestyle festival and night market: handpicked brands, gourmet food, and live music.",
  alternates: { canonical: "/events" },
};
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await listPublished();

  return (
    <>
      <section className="bdq-fire paint flex min-h-[60svh] items-end py-[var(--space-5xl)]">
        <div className="wrapper">
          <span className="kicker">What&apos;s on</span>
          <SplitReveal as="h1" className="f-exat mt-[var(--space-md)] f-h133">
            Events &amp; tickets
          </SplitReveal>
          <p className="f-paragraph mt-[var(--space-lg)] max-w-[44ch]">
            Pick a date and grab your tickets before they go.
          </p>
        </div>
      </section>

      <section className="paint py-[var(--space-4xl)]">
        <div className="wrapper">
          {events.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing on sale right now"
              description="Our next evening is being lined up. Check back soon — you won't want to miss it."
            />
          ) : (
            <Reveal stagger>
              {events.map((e) => {
                const prices = e.ticketTypes.map((t) => t.priceInPaise);
                const from = prices.length ? Math.min(...prices) : null;
                return (
                  <Link
                    key={e.id}
                    href={`/events/${e.slug}`}
                    data-cursor="view"
                    className="group flex flex-col gap-[var(--space-sm)] py-[var(--space-2xl)] transition-transform duration-300 sm:flex-row sm:items-end sm:justify-between lg:hover:translate-x-[var(--space-md)]"
                    style={{ borderTop: "1px solid var(--color)" }}
                  >
                    <div>
                      <h2 className="f-exat transition-opacity duration-300 group-hover:opacity-70 f-h76">{e.name}</h2>
                      <p className="f-paragraph mt-[var(--space-sm)] opacity-80">
                        {fmt(e.startsAt)}{e.location ? ` · ${e.location}` : ""}
                      </p>
                    </div>
                    <span className="f-exat shrink-0 f-h42">
                      {from != null ? `from ${formatPaise(from)}` : "Tickets soon"}
                    </span>
                  </Link>
                );
              })}
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
