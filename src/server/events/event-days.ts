import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/**
 * Per-day operating windows for multi-day events (e.g. 30 Oct 16:00–23:00). The schedule run-of-show
 * groups by these; `Event.startsAt/endsAt` is kept as the overall envelope (min/max of days) so
 * home-mode / reminders / SEO keep working unchanged.
 */

export interface DayWindow {
  id: string;
  startsAt: Date;
  endsAt: Date;
}

/** Pure: the event day whose [startsAt, endsAt] window contains `t` (handles overnight). Null if none. */
export function dayForTime<T extends DayWindow>(days: T[], t: Date): T | null {
  const ms = t.getTime();
  for (const d of days) {
    if (ms >= d.startsAt.getTime() && ms <= d.endsAt.getTime()) return d;
  }
  return null;
}

export function listDays(eventId: string) {
  return db.eventDay.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } });
}

/** Recompute Event.startsAt/endsAt from the min/max of its days. No-op when the event has no days. */
export async function recomputeEventWindow(eventId: string): Promise<void> {
  const agg = await db.eventDay.aggregate({
    where: { eventId },
    _min: { startsAt: true },
    _max: { endsAt: true },
  });
  if (agg._min.startsAt && agg._max.endsAt) {
    await db.event.update({ where: { id: eventId }, data: { startsAt: agg._min.startsAt, endsAt: agg._max.endsAt } });
  }
}

export interface EventDayInput {
  startsAt: Date;
  endsAt: Date;
  label?: string;
}

export function addDay(session: Session, eventId: string, input: EventDayInput) {
  return withAudit(session, { action: "CREATE", entity: "EventDay", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const count = await db.eventDay.count({ where: { eventId } });
      const day = await db.eventDay.create({ data: { eventId, ...input, sortOrder: count } });
      await recomputeEventWindow(eventId);
      return { result: day, after: day };
    },
  }));
}

export function updateDay(session: Session, id: string, input: EventDayInput) {
  return withAudit(session, { action: "UPDATE", entity: "EventDay", entityId: id }, async () => {
    const before = await db.eventDay.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        const day = await db.eventDay.update({ where: { id }, data: input });
        await recomputeEventWindow(day.eventId);
        return { result: day, after: day };
      },
    };
  });
}

export function deleteDay(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "EventDay", entityId: id }, async () => {
    const before = await db.eventDay.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        await db.eventDay.delete({ where: { id } }); // schedule items keep their times; eventDayId nulled (SetNull)
        if (before) await recomputeEventWindow(before.eventId);
        return { result: { id }, after: null };
      },
    };
  });
}
