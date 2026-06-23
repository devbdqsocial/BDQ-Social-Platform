import "server-only";
import { db } from "@/server/db";
import { featureEnabled } from "@/server/settings/service";
import { listPublished } from "@/server/events/service";

/** Public artist lineup for the active event — confirmed, published sets only. Null when off/empty. */
export async function getPublicLineup() {
  if (!(await featureEnabled("lineup"))) return null;
  const [ev] = await listPublished();
  if (!ev) return null;
  const bookings = await db.artistBooking.findMany({
    where: { eventId: ev.id, status: "CONFIRMED", published: true },
    orderBy: [{ setStartsAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      setStartsAt: true,
      setEndsAt: true,
      stageOrZone: true,
      artist: { select: { stageName: true, type: true, genre: true, bio: true, instagram: true } },
    },
  });
  return { eventName: ev.name, bookings };
}
