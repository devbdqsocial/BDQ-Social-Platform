"use server";

import { cookies } from "next/headers";
import { ACTIVE_EVENT_COOKIE } from "@/server/admin/event-context";

/** Set the admin console's active event (cookie). Client switcher calls this then router.refresh(). */
export async function setActiveEventAction(eventId: string): Promise<void> {
  (await cookies()).set(ACTIVE_EVENT_COOKIE, eventId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
