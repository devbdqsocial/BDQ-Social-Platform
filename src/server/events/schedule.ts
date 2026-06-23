import { db } from "@/server/db";
import { listPublished } from "@/server/events/service";

/** Active published event + its schedule (customer-portal §3.3, R3.6). Null when nothing is live. */
export async function getActiveSchedule() {
  const [pub] = await listPublished();
  if (!pub) return null;
  return db.event.findUnique({
    where: { id: pub.id },
    select: {
      name: true, slug: true, location: true, startsAt: true, endsAt: true, status: true,
      days: { orderBy: { sortOrder: "asc" }, select: { id: true, startsAt: true, endsAt: true, label: true } },
      schedule: {
        orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }],
        select: { id: true, title: true, startsAt: true, endsAt: true, stageOrZone: true, performer: true, eventDayId: true },
      },
    },
  });
}
