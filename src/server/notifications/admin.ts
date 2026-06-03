import "server-only";
import { db } from "@/server/db";

/** In-app admin notifications (header bell + feed). Distinct from the ticket-delivery outbox. */

export interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  href?: string;
  eventId?: string;
}

/** Best-effort: emitting a notification must never break the calling flow. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.notification.create({ data: input });
  } catch (e) {
    console.error("notify", e);
  }
}

export function listNotifications(limit = 30) {
  return db.notification.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}

export function unreadCount() {
  return db.notification.count({ where: { readAt: null } });
}

export async function markAllRead(): Promise<void> {
  await db.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
}
