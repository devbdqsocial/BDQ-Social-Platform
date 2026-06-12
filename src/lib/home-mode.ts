/**
 * Time-based customer home modes + now/next schedule resolution (customer-portal §3.1/§3.3,
 * build-plan R1.5). Pure — consumed by the home page, happening strip, and concierge replies.
 */

export type HomeMode = "PRE" | "LIVE" | "POST";

const HOUR = 60 * 60 * 1000;
const LIVE_BEFORE_MS = 6 * HOUR; // LIVE window opens startsAt − 6h
const LIVE_AFTER_MS = 2 * HOUR; // …and closes endsAt + 2h
const POST_WINDOW_MS = 14 * 24 * HOUR; // POST runs endsAt + 2h → +14 days
/** Open-ended schedule items run 45 minutes (customer-portal §3.3). */
export const DEFAULT_ITEM_MS = 45 * 60 * 1000;

export interface HomeModeEvent {
  startsAt: Date;
  endsAt: Date;
  status: string; // EventStatus — LIVE gate only applies within the time window
}

/**
 * PRE (default) · LIVE (startsAt−6h → endsAt+2h, while the event is PUBLISHED/LIVE) ·
 * POST (endsAt+2h → +14d). No event → PRE (the page renders its hold state).
 */
export function getHomeMode(event: HomeModeEvent | null, now: Date = new Date()): HomeMode {
  if (!event) return "PRE";
  const t = now.getTime();
  const liveFrom = event.startsAt.getTime() - LIVE_BEFORE_MS;
  const liveTo = event.endsAt.getTime() + LIVE_AFTER_MS;
  const sellable = event.status === "PUBLISHED" || event.status === "LIVE";
  if (sellable && t >= liveFrom && t < liveTo) return "LIVE";
  if (t >= liveTo && t < liveTo + POST_WINDOW_MS) return "POST";
  return "PRE";
}

export interface ScheduleSlot {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  stageOrZone: string | null;
  performer: string | null;
}

export interface NowNext<T extends ScheduleSlot = ScheduleSlot> {
  now: T[]; // currently running (one per stage at most, ordered by start)
  next: T[]; // first upcoming item per stage, ordered by start
}

const itemEnd = (s: ScheduleSlot) => (s.endsAt ?? new Date(s.startsAt.getTime() + DEFAULT_ITEM_MS)).getTime();

/**
 * now = startsAt <= t < (endsAt ?? startsAt+45m); next = first item after t per stage.
 * `items` must be sorted by startsAt ascending (the DB query's orderBy).
 */
export function resolveNowNext<T extends ScheduleSlot>(items: T[], now: Date = new Date()): NowNext<T> {
  const t = now.getTime();
  const running: T[] = [];
  const nextByStage = new Map<string, T>();
  for (const item of items) {
    const stage = item.stageOrZone ?? "";
    if (item.startsAt.getTime() <= t && t < itemEnd(item)) {
      running.push(item);
    } else if (item.startsAt.getTime() > t && !nextByStage.has(stage)) {
      nextByStage.set(stage, item);
    }
  }
  return { now: running, next: [...nextByStage.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()) };
}
