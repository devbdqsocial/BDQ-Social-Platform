import { db } from "@/server/db";
import { listPublished } from "@/server/events/service";
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
  return <ComingSoonClient count={count} event={event} />;
}
