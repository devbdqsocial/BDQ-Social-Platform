import { db } from "@/server/db";
import { listPublished } from "@/server/events/service";
import { whatsAppConfigured } from "@/lib/whatsapp";
import { ComingSoonClient } from "./ComingSoonClient";

export const dynamic = "force-dynamic";

export default async function ComingSoonPage() {
  const [count, events] = await Promise.all([
    db.waitlist.count({ where: { source: "PLATFORM" } }),
    listPublished(),
  ]);
  const next = events[0];
  const event = next
    ? { name: next.name, location: next.location, startsAtIso: next.startsAt.toISOString() }
    : null;

  // JSON-LD Event for rich results / GEO while the public site is gated behind this page.
  const jsonLd = next
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: next.name,
        startDate: next.startsAt.toISOString(),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: next.location
          ? { "@type": "Place", name: next.location, address: next.location }
          : { "@type": "Place", name: "Vadodara", address: "Vadodara, Gujarat, India" },
        organizer: { "@type": "Organization", name: "BDQ Social" },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}
      <ComingSoonClient count={count} event={event} whatsappEnabled={whatsAppConfigured()} />
    </>
  );
}
