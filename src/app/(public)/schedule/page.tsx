import type { Metadata } from "next";
import { getActiveSchedule } from "@/server/events/schedule";
import { ScheduleTimeline } from "@/components/events/ScheduleTimeline";

export const metadata: Metadata = {
  title: "Event Schedule",
  description: "The full schedule for BDQ Social — set times, stages, and what's on through the evening at Vadodara's curated lifestyle night market.",
  alternates: { canonical: "/schedule" },
};
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const event = await getActiveSchedule();

  return (
    <section className="paint py-[var(--space-4xl)]">
      <div className="wrapper max-w-[56rem]">
        <span className="kicker opacity-70">{event?.location ?? "The festival"}</span>
        <h1 className="f-exat mt-[var(--space-sm)] f-h76">What&apos;s on</h1>
        <p className="f-paragraph mt-[var(--space-md)] max-w-[48ch] opacity-80">
          The full evening, hour by hour — see what&apos;s live, what&apos;s next, and save the sets you don&apos;t want to miss.
        </p>

        <div className="mt-[var(--space-2xl)]">
          {!event ? (
            <div className="p-[var(--space-3xl)] text-center" style={{ border: "1px dashed var(--color)" }}>
              <p className="f-exat f-h42">The line-up goes live soon</p>
              <p className="f-paragraph-small mt-[var(--space-sm)] opacity-70">Times and stages appear here as the programme is confirmed.</p>
            </div>
          ) : (
            <ScheduleTimeline
              eventName={event.name}
              location={event.location}
              startsAtIso={event.startsAt.toISOString()}
              endsAtIso={event.endsAt.toISOString()}
              status={event.status}
              items={event.schedule.map((s) => ({
                id: s.id, title: s.title,
                startsAtIso: s.startsAt.toISOString(), endsAtIso: s.endsAt ? s.endsAt.toISOString() : null,
                stageOrZone: s.stageOrZone, performer: s.performer,
              }))}
            />
          )}
        </div>
      </div>
    </section>
  );
}
