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
    await db.$transaction(async (tx) => {
      await tx.notification.create({ data: input });
      const count = await tx.notification.count();
      if (count > 150) {
        const oldestToKeep = await tx.notification.findMany({
          orderBy: { createdAt: "desc" },
          skip: 149,
          take: 1,
          select: { createdAt: true }
        });
        if (oldestToKeep.length > 0) {
          await tx.notification.deleteMany({
            where: { createdAt: { lt: oldestToKeep[0].createdAt } }
          });
        }
      }
    });
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
