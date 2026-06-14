import { redirect } from "next/navigation";
import { listPublished } from "@/server/events/service";

// Temporary bridge (R3.4): the standalone schedule page is R3.6. Until then the Schedule tab lands
// on the active event's schedule so the companion tab bar never dead-ends. Replaced by R3.6.
export const dynamic = "force-dynamic";

export default async function ScheduleBridge() {
  const events = await listPublished();
  redirect(events[0] ? `/events/${events[0].slug}#schedule` : "/events");
}
