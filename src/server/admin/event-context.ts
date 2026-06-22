import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/server/db";

/** Global "active event" for the admin console (cookie-scoped). Reused by every event-scoped page. */

export const ACTIVE_EVENT_COOKIE = "bdq_admin_event";

export interface ActiveEventLite {
  id: string;
  name: string;
  slug: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
}

/** Request-scoped: the layout + every event-scoped page reuse one query per render. */
export const listAdminEvents = cache((): Promise<ActiveEventLite[]> => {
  return db.event.findMany({
    orderBy: { startsAt: "desc" },
    select: { id: true, name: true, slug: true, status: true, startsAt: true, endsAt: true },
  });
});

/** Resolve the active event from the cookie, else fall back to LIVE → upcoming → latest. (deduped per request) */
export const getActiveEvent = cache(async (): Promise<{ active: ActiveEventLite | null; events: ActiveEventLite[] }> => {
  const events = await listAdminEvents();
  if (events.length === 0) return { active: null, events };
  const id = (await cookies()).get(ACTIVE_EVENT_COOKIE)?.value;
  const byCookie = id ? events.find((e) => e.id === id) : undefined;
  const now = Date.now();
  const fallback =
    events.find((e) => e.status === "LIVE") ??
    [...events].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).find((e) => e.endsAt.getTime() >= now) ??
    events.find((e) => e.status === "PUBLISHED") ??
    events[0];
  return { active: byCookie ?? fallback, events };
});

/** Convenience: the active event id (or null) for service queries. */
export async function getActiveEventId(): Promise<string | null> {
  return (await getActiveEvent()).active?.id ?? null;
}
