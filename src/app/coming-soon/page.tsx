import { db } from "@/server/db";
import { listPublished } from "@/server/events/service";
import { ComingSoonClient } from "./ComingSoonClient";

export const dynamic = "force-dynamic";

export default async function ComingSoonPage() {
  // Countdown target is dynamic (R3.1): the next upcoming published/live event's start, never hardcoded.
  const [count, events] = await Promise.all([
    db.waitlist.count({ where: { source: "PLATFORM" } }),
    listPublished(),
  ]);
  const targetIso = events[0]?.startsAt.toISOString() ?? null;
  return <ComingSoonClient count={count} targetIso={targetIso} />;
}
