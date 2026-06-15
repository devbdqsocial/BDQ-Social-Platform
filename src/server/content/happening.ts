import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { offerPhase } from "@/lib/offer";
import { DEFAULT_ITEM_MS } from "@/lib/home-mode";
import { KIND_EMOJI, KIND_RANK, type StripItem } from "@/lib/happening";
import type { CreateHappeningInput, UpdateHappeningInput } from "@/server/schemas";

/**
 * Happening Strip (R6.3 / customer-portal §3) — the event heartbeat. `getHappeningStrip` MERGES three
 * sources into one sorted list: admin-scheduled `HappeningItem`s, the live/next `ScheduleItem`s, and
 * live `Offer`s — so the schedule + offers are never re-entered by hand. Visibility is a query-time
 * window (auto-hide / auto-expire). Pure ordering; no realtime infra.
 */

export type { StripItem };

const SOON_MS = 30 * 60 * 1000;
const MAX_ITEMS = 14;

/** The merged, sorted, currently-visible strip for an event. */
export async function getHappeningStrip(eventId: string, now: Date = new Date()): Promise<StripItem[]> {
  const t = now.getTime();
  const [manual, schedule, offers] = await Promise.all([
    db.happeningItem.findMany({ where: { eventId, published: true, archived: false } }),
    db.scheduleItem.findMany({ where: { eventId }, orderBy: { startsAt: "asc" } }),
    db.offer.findMany({ where: { eventId, status: "PUBLISHED" } }),
  ]);

  const rows: (StripItem & { _rank: number; _weight: number })[] = [];
  const push = (it: StripItem, weight = 0) => rows.push({ ...it, _rank: KIND_RANK[it.kind] ?? 9, _weight: weight });

  for (const m of manual) {
    if (m.startsAt && m.startsAt.getTime() > t) continue; // not yet visible
    if (m.endsAt && m.endsAt.getTime() < t) continue; // expired (auto-hide)
    push({ id: m.id, kind: m.kind, emoji: m.emoji || KIND_EMOJI[m.kind] || "•", title: m.title, detail: m.detail ?? undefined, href: m.href ?? undefined, source: "manual" }, m.priority);
  }

  for (const s of schedule) {
    const start = s.startsAt.getTime();
    const end = (s.endsAt ?? new Date(start + DEFAULT_ITEM_MS)).getTime();
    if (start <= t && t < end) {
      push({ id: `sch-${s.id}`, kind: "LIVE_NOW", emoji: KIND_EMOJI.LIVE_NOW, title: s.title, detail: s.stageOrZone ?? s.performer ?? undefined, href: "/schedule", source: "schedule" });
    } else if (start > t && start - t <= SOON_MS) {
      const mins = Math.max(1, Math.round((start - t) / 60000));
      push({ id: `sch-${s.id}`, kind: "STARTING_SOON", emoji: KIND_EMOJI.STARTING_SOON, title: s.title, detail: `starts in ${mins} min${s.stageOrZone ? ` · ${s.stageOrZone}` : ""}`, href: "/schedule", source: "schedule" });
    }
  }

  for (const o of offers) {
    if (offerPhase({ startsAt: o.startsAt, endsAt: o.endsAt, status: o.status }, now) !== "live") continue;
    push({ id: `off-${o.id}`, kind: "OFFER", emoji: KIND_EMOJI.OFFER, title: o.title, detail: o.terms ? o.terms.slice(0, 64) : undefined, href: "/offers", source: "offer" });
  }

  rows.sort((a, b) => a._rank - b._rank || b._weight - a._weight);
  return rows.slice(0, MAX_ITEMS).map(({ _rank, _weight, ...it }) => { void _rank; void _weight; return it; });
}

// ── admin CRUD (audited) ─────────────────────────────────────────────────────────
export function listHappeningForAdmin(eventId: string) {
  return db.happeningItem.findMany({ where: { eventId, archived: false }, orderBy: [{ kind: "asc" }, { priority: "desc" }, { createdAt: "desc" }] });
}

const data = (i: CreateHappeningInput | UpdateHappeningInput) => ({
  kind: i.kind,
  emoji: i.emoji?.trim() || null,
  title: i.title,
  detail: i.detail?.trim() || null,
  href: i.href?.trim() || null,
  priority: i.priority,
  startsAt: i.startsAt ?? null,
  endsAt: i.endsAt ?? null,
});

export function createHappening(session: Session, input: CreateHappeningInput) {
  return withAudit(session, { action: "CREATE", entity: "HappeningItem" }, async () => ({
    before: null,
    run: async () => {
      const row = await db.happeningItem.create({ data: { eventId: input.eventId, ...data(input) } });
      return { result: row, after: row };
    },
  }));
}

export function updateHappening(session: Session, input: UpdateHappeningInput) {
  return withAudit(session, { action: "UPDATE", entity: "HappeningItem", entityId: input.id }, async () => {
    const before = await db.happeningItem.findUnique({ where: { id: input.id } });
    return {
      before,
      run: async () => {
        const row = await db.happeningItem.update({ where: { id: input.id }, data: data(input) });
        return { result: row, after: row };
      },
    };
  });
}

export function setHappeningPublished(session: Session, id: string, published: boolean) {
  return withAudit(session, { action: "UPDATE", entity: "HappeningItem", entityId: id }, async () => {
    const before = await db.happeningItem.findUnique({ where: { id }, select: { published: true } });
    return {
      before,
      run: async () => {
        const row = await db.happeningItem.update({ where: { id }, data: { published } });
        return { result: row, after: { published: row.published } };
      },
    };
  });
}

export function archiveHappening(session: Session, id: string) {
  return withAudit(session, { action: "UPDATE", entity: "HappeningItem", entityId: id }, async () => {
    const before = await db.happeningItem.findUnique({ where: { id }, select: { archived: true } });
    return {
      before,
      run: async () => {
        const row = await db.happeningItem.update({ where: { id }, data: { archived: true, published: false } });
        return { result: row, after: { archived: true } };
      },
    };
  });
}
