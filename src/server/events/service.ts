import "server-only";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import { env } from "@/lib/env";
import { LEGAL } from "@/lib/legal";
import type { Session } from "@/server/auth/guard";
import { elementsToStallRows } from "@/lib/map/normalize";
import type { LayoutV2 } from "@/lib/map/layout-v2";

export interface TicketTypeInput {
  name: string;
  priceInPaise: number;
  earlyPricePaise?: number;
  totalQty: number;
  attendeesPer: number;
}

/** Event domain service. Prices are admin-entered (TicketType); money in paise. */

export interface CreateEventInput {
  name: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  capacity?: number;
}

export type EventReadinessIssue = { key: string; label: string; detail: string };

export class PublishBlockedError extends Error {
  constructor(public issues: EventReadinessIssue[]) {
    super(`Fix before publishing: ${issues.map((i) => i.label).join(", ")}`);
    this.name = "PublishBlockedError";
  }
}

const hasValue = (value?: string | null) => !!value?.trim();
const hasPlaceholder = (value: string) => value.includes("[") || value.includes("]");

/** Relation subset `deriveReadinessIssues` needs beyond plain scalar columns. Usable both as a
 * `select` (with the scalars below) and, unspread, as an `include` (scalars come free there). */
const READINESS_RELATIONS = {
  ticketTypes: { select: { priceInPaise: true, totalQty: true, attendeesPer: true } },
  mapLayout: { select: { id: true } },
  stalls: { where: { kind: "STALL" as const }, select: { priceInPaise: true, stallType: { select: { priceInPaise: true } } } },
} satisfies Prisma.EventInclude;

const READINESS_SELECT = {
  name: true,
  description: true,
  location: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  vendorStallsEnabled: true,
  ...READINESS_RELATIONS,
} satisfies Prisma.EventSelect;

type ReadinessInput = Prisma.EventGetPayload<{ select: typeof READINESS_SELECT }>;

/** Pure predicate set behind `getEventReadiness` — shared by the per-event page and the events
 * list's readiness badge so there's one definition of "ready to publish". */
export function deriveReadinessIssues(event: ReadinessInput): { issues: EventReadinessIssue[]; warnings: EventReadinessIssue[] } {
  const issues: EventReadinessIssue[] = [];
  const warnings: EventReadinessIssue[] = [];
  if (!hasValue(event.name) || !hasValue(event.description) || !hasValue(event.location)) {
    issues.push({ key: "details", label: "Public details", detail: "Add event name, short description, and venue/location." });
  }
  if (!(event.endsAt > event.startsAt)) {
    issues.push({ key: "dates", label: "Event dates", detail: "End time must be after start time." });
  }
  if (!event.ticketTypes.some((t) => t.priceInPaise > 0 && t.totalQty > 0 && t.attendeesPer > 0)) {
    issues.push({ key: "tickets", label: "Paid ticket type", detail: "Add at least one ticket type with price, capacity, and attendees per ticket." });
  }
  // Effective stall price mirrors what checkout charges: stall override, else its type's price.
  if (event.vendorStallsEnabled && (!event.mapLayout || !event.stalls.some((s) => (s.priceInPaise ?? s.stallType?.priceInPaise ?? 0) > 0))) {
    issues.push({ key: "venue", label: "Venue map and stall pricing", detail: "Attach a map layout and price at least one sellable stall (directly or via its stall type)." });
  }
  if ([LEGAL.entity, LEGAL.email, LEGAL.phone, LEGAL.address, LEGAL.grievanceOfficer, LEGAL.grievanceEmail].some(hasPlaceholder)) {
    issues.push({ key: "legal", label: "Legal/support details", detail: "Replace bracketed legal and support placeholders before launch." });
  }
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET) {
    issues.push({ key: "payments", label: "Razorpay live keys", detail: "Configure Razorpay key ID, key secret, and webhook secret." });
  }

  // Advisory only — never blocks publish. Capacity is optional; a ticket pool that can admit more
  // heads than the cap is worth a second look (couple passes count double).
  if (event.capacity != null) {
    const potentialAdmits = event.ticketTypes.reduce((sum, t) => sum + t.totalQty * t.attendeesPer, 0);
    if (potentialAdmits > event.capacity) {
      warnings.push({ key: "headcount", label: "Ticket headcount over capacity", detail: `Tickets can admit up to ${potentialAdmits} people but capacity is ${event.capacity}. Reduce quantities or raise the cap.` });
    }
  }

  return { issues, warnings };
}

export async function getEventReadiness(id: string): Promise<{ ready: boolean; issues: EventReadinessIssue[]; warnings: EventReadinessIssue[] }> {
  const event = await db.event.findUnique({ where: { id }, select: READINESS_SELECT });
  if (!event) return { ready: false, issues: [{ key: "event", label: "Event exists", detail: "The event could not be found." }], warnings: [] };

  const { issues, warnings } = deriveReadinessIssues(event);
  return { ready: issues.length === 0, issues, warnings };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event"
  );
}

async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  for (;;) {
    const existing = await db.event.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${n++}`;
  }
}

/* Public DISPLAY reads are cached 60s (owner-approved staleness). unstable_cache JSON-serializes,
   so Date fields come back as strings on cache hits — revive the ones consumers use.
   Checkout/hold/fulfilment paths query the DB directly and never read through this cache. */
const reviveEvent = <T extends { startsAt: Date; endsAt: Date; updatedAt: Date }>(e: T): T => ({
  ...e,
  startsAt: new Date(e.startsAt),
  endsAt: new Date(e.endsAt),
  updatedAt: new Date(e.updatedAt),
});

const listPublishedCached = unstable_cache(
  () =>
    db.event.findMany({
      where: { status: { in: ["PUBLISHED", "LIVE"] } },
      orderBy: { startsAt: "asc" },
      include: { ticketTypes: { orderBy: { priceInPaise: "asc" } } },
    }),
  ["events:published"],
  { revalidate: 60, tags: ["events"] },
);

export async function listPublished() {
  return (await listPublishedCached()).map(reviveEvent);
}

export function listAllForAdmin() {
  return db.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { ticketTypes: true, orders: true } } },
  });
}

/** Events list page only — do not use `listAllForAdmin` for this, it's shared by several
 * unrelated admin pages (waitlist, sponsors, check-in, analytics, expenses, coupons) that don't
 * need the extra readiness includes below. Computes each row's readiness in-memory (reusing
 * `deriveReadinessIssues`) instead of one `getEventReadiness` query per row. */
export async function listForAdminTable() {
  const events = await db.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { ticketTypes: true, orders: true } }, ...READINESS_RELATIONS },
  });
  return events.map((event) => {
    const { issues } = deriveReadinessIssues(event);
    return { ...event, readiness: { ready: issues.length === 0, issueCount: issues.length, missing: issues.map((i) => i.label) } };
  });
}

export function getByIdForAdmin(id: string) {
  return db.event.findUnique({
    where: { id },
    include: {
      ticketTypes: { orderBy: { priceInPaise: "asc" } },
      schedule: {
        orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }],
        include: { artistBooking: { select: { id: true, artistId: true } } },
      },
      days: { orderBy: { sortOrder: "asc" } },
      mapLayout: true,
    },
  });
}

export interface ScheduleItemInput {
  startsAt: Date;
  endsAt?: Date;
  title: string;
  stageOrZone?: string;
  performer?: string;
  eventDayId?: string;
}

export function addScheduleItem(session: Session, eventId: string, input: ScheduleItemInput) {
  return withAudit(session, { action: "CREATE", entity: "ScheduleItem", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const item = await db.scheduleItem.create({ data: { eventId, ...input } });
      return { result: item, after: item };
    },
  }));
}

export function deleteScheduleItem(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "ScheduleItem", entityId: id }, async () => {
    const before = await db.scheduleItem.findUnique({ where: { id }, include: { artistBooking: { select: { id: true } } } });
    // Artist sets are owned by their booking — deleting here would silently desync it. Manage in Lineup.
    if (before?.artistBooking) throw new Error("This is an artist set — manage it from the Lineup tab.");
    return {
      before,
      run: async () => {
        await db.scheduleItem.delete({ where: { id } });
        return { result: { id }, after: null };
      },
    };
  });
}

/** Copy a day's manual schedule items onto another day, shifted by the gap between the two day
 * starts. Artist sets are owned by their booking and skipped. */
export function cloneScheduleDay(session: Session, eventId: string, fromDayId: string, toDayId: string) {
  return withAudit(session, { action: "CREATE", entity: "ScheduleItem", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      if (fromDayId === toDayId) throw new Error("Pick a different day to copy into.");
      const [fromDay, toDay] = await Promise.all([
        db.eventDay.findUnique({ where: { id: fromDayId }, select: { startsAt: true, eventId: true } }),
        db.eventDay.findUnique({ where: { id: toDayId }, select: { startsAt: true, eventId: true } }),
      ]);
      if (!fromDay || !toDay || fromDay.eventId !== eventId || toDay.eventId !== eventId) throw new Error("Days not found for this event.");
      const offset = toDay.startsAt.getTime() - fromDay.startsAt.getTime();
      const items = await db.scheduleItem.findMany({
        where: { eventId, eventDayId: fromDayId, artistBooking: null },
      });
      if (items.length) {
        await db.scheduleItem.createMany({
          data: items.map((s) => ({
            eventId, eventDayId: toDayId, title: s.title, stageOrZone: s.stageOrZone, performer: s.performer, sortOrder: s.sortOrder,
            startsAt: new Date(s.startsAt.getTime() + offset),
            endsAt: s.endsAt ? new Date(s.endsAt.getTime() + offset) : null,
          })),
        });
      }
      return { result: { count: items.length }, after: { copied: items.length, toDayId } };
    },
  }));
}

/** Resolve same-stage overlaps on a day by pushing later manual items to start when the previous
 * one ends. Artist sets and untimed items are fixed anchors (never moved). */
export function autoStaggerDay(session: Session, eventId: string, dayId: string) {
  return withAudit(session, { action: "UPDATE", entity: "ScheduleItem", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const items = await db.scheduleItem.findMany({
        where: { eventId, eventDayId: dayId },
        include: { artistBooking: { select: { id: true } } },
      });
      const byStage = new Map<string, typeof items>();
      for (const i of items) {
        const stage = i.stageOrZone?.trim();
        if (!stage) continue;
        let list = byStage.get(stage);
        if (!list) { list = []; byStage.set(stage, list); }
        list.push(i);
      }
      const updates: { id: string; startsAt: Date; endsAt: Date }[] = [];
      for (const group of byStage.values()) {
        group.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
        let cursor = -Infinity;
        for (const i of group) {
          const start = i.startsAt.getTime();
          const fixed = i.artistBooking != null || i.endsAt == null;
          if (fixed) {
            cursor = Math.max(cursor, (i.endsAt ?? i.startsAt).getTime());
            continue;
          }
          const duration = i.endsAt!.getTime() - start;
          if (start < cursor) {
            const newEnd = cursor + duration;
            updates.push({ id: i.id, startsAt: new Date(cursor), endsAt: new Date(newEnd) });
            cursor = newEnd;
          } else {
            cursor = i.endsAt!.getTime();
          }
        }
      }
      if (updates.length) {
        await db.$transaction(updates.map((u) => db.scheduleItem.update({ where: { id: u.id }, data: { startsAt: u.startsAt, endsAt: u.endsAt } })));
      }
      return { result: { moved: updates.length }, after: { moved: updates.length, dayId } };
    },
  }));
}

export function addTicketType(session: Session, eventId: string, input: TicketTypeInput) {
  return withAudit(session, { action: "CREATE", entity: "TicketType", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const tt = await db.ticketType.create({ data: { eventId, ...input } });
      return { result: tt, after: tt };
    },
  }));
}

export function deleteTicketType(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "TicketType", entityId: id }, async () => {
    const before = await db.ticketType.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        await db.ticketType.delete({ where: { id } });
        return { result: { id }, after: null };
      },
    };
  });
}

export function getEventMap(eventId: string) {
  return db.mapLayout.findUnique({ where: { eventId } });
}

export function getEventWithStalls(id: string) {
  return db.event.findUnique({
    where: { id },
    include: {
      stalls: { include: { stallType: { select: { priceInPaise: true } } }, orderBy: { label: "asc" } },
      mapLayout: true,
    },
  });
}

export function saveEventMap(session: Session, eventId: string, layout: LayoutV2) {
  return withAudit(session, { action: "UPDATE", entity: "MapLayout", entityId: eventId }, async () => {
    const before = await db.mapLayout.findUnique({ where: { eventId }, select: { version: true } });
    return {
      before,
      run: async () => {
        const rows = elementsToStallRows(eventId, layout.elements);
        const layoutJson = layout as unknown as Prisma.InputJsonValue;
        const saved = await db.$transaction(async (tx) => {
          const ml = await tx.mapLayout.upsert({
            where: { eventId },
            update: { layoutJson, version: { increment: 1 } },
            create: { eventId, layoutJson },
          });
          // Merge by label so active (booked/held) stalls survive a re-save.
          const existing = await tx.stall.findMany({
            where: { eventId },
            select: { id: true, label: true, status: true, _count: { select: { bookings: true } } },
          });
          const byLabel = new Map(existing.map((s) => [s.label, s]));
          const desired = new Set(rows.map((r) => r.label));
          for (const r of rows) {
            const cur = byLabel.get(r.label);
            if (cur) {
              const locked = cur.status === "BOOKED" || cur.status === "HELD" || cur.status === "PENDING";
              await tx.stall.update({
                where: { id: cur.id },
                data: {
                  kind: r.kind,
                  stallTypeId: r.stallTypeId,
                  xFt: r.xFt,
                  yFt: r.yFt,
                  widthFt: r.widthFt,
                  heightFt: r.heightFt,
                  rotation: r.rotation,
                  priceInPaise: r.priceInPaise,
                  ...(locked ? {} : { status: r.status }),
                },
              });
            } else {
              await tx.stall.create({ data: r as Prisma.StallUncheckedCreateInput });
            }
          }
          // Remove stalls dropped from the layout — but never one with a booking.
          const orphans = existing.filter((s) => !desired.has(s.label) && s._count.bookings === 0).map((s) => s.id);
          if (orphans.length) await tx.stall.deleteMany({ where: { id: { in: orphans } } });
          return ml;
        });
        return { result: saved, after: { version: saved.version, stalls: rows.length } };
      },
    };
  });
}

const getBySlugCached = unstable_cache(
  (slug: string) =>
    db.event.findUnique({
      where: { slug },
      include: {
        ticketTypes: { orderBy: { priceInPaise: "asc" } },
        schedule: { orderBy: { startsAt: "asc" } },
        mapLayout: { select: { id: true } },
        _count: { select: { stalls: true } },
      },
    }),
  ["events:by-slug"],
  { revalidate: 60, tags: ["events"] },
);

export async function getBySlug(slug: string) {
  const e = await getBySlugCached(slug);
  if (!e) return null;
  return {
    ...reviveEvent(e),
    schedule: e.schedule.map((s) => ({
      ...s,
      startsAt: new Date(s.startsAt),
      endsAt: s.endsAt ? new Date(s.endsAt) : null,
    })),
  };
}

export async function getPublicEventLayout(slug: string) {
  const event = await db.event.findUnique({
    where: { slug },
    select: {
      mapLayout: { select: { layoutJson: true } },
      stalls: {
        orderBy: { label: "asc" },
        select: {
          id: true,
          label: true,
          status: true,
          kind: true,
          xFt: true,
          yFt: true,
          widthFt: true,
          heightFt: true,
          rotation: true,
        },
      },
    },
  });
  if (!event) return null;

  const canvas = (event.mapLayout?.layoutJson as { canvas?: { widthFt: number; heightFt: number } } | null)?.canvas;
  return { stalls: event.stalls, canvas };
}

export async function getEventLayoutForSession(_session: Session, slug: string) {
  return getPublicEventLayout(slug);
}

export function createEvent(session: Session, input: CreateEventInput) {
  return withAudit(session, { action: "CREATE", entity: "Event" }, async () => ({
    before: null,
    run: async () => {
      const slug = await uniqueSlug(input.name);
      const event = await db.event.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          location: input.location,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          capacity: input.capacity,
          createdById: session.userId,
        },
      });
      return { result: event, after: event };
    },
  }));
}

const asJson = (v: Prisma.JsonValue | null | undefined): Prisma.InputJsonValue | undefined =>
  v == null ? undefined : (v as Prisma.InputJsonValue);

/** Deep-copy an event into a fresh DRAFT (recurring editions). Copies the setup — tickets (sold
 * reset), stall types + stalls (all AVAILABLE), map layout (stallType refs remapped), days,
 * manual schedule, add-ons. Never copies orders/bookings/payments/leads/coupons/artist sets. */
export function cloneEvent(session: Session, sourceId: string) {
  return withAudit(session, { action: "CREATE", entity: "Event" }, async () => ({
    before: null,
    run: async () => {
      const src = await db.event.findUnique({
        where: { id: sourceId },
        include: {
          ticketTypes: true,
          stallTypes: true,
          stalls: true,
          mapLayout: true,
          days: { orderBy: { sortOrder: "asc" } },
          schedule: { orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }], include: { artistBooking: { select: { id: true } } } },
          addOns: true,
        },
      });
      if (!src) throw new Error("Event not found");
      const slug = await uniqueSlug(`${src.name} copy`);

      const created = await db.$transaction(async (tx) => {
        const ev = await tx.event.create({
          data: {
            name: `${src.name} (copy)`,
            slug,
            description: src.description,
            location: src.location,
            mapLink: src.mapLink,
            startsAt: src.startsAt,
            endsAt: src.endsAt,
            status: "DRAFT",
            theme: asJson(src.theme),
            bulkTiers: asJson(src.bulkTiers),
            earlyBird: asJson(src.earlyBird),
            capacity: src.capacity,
            createdById: session.userId,
          },
        });

        if (src.ticketTypes.length) {
          await tx.ticketType.createMany({
            data: src.ticketTypes.map((t) => ({
              eventId: ev.id, name: t.name, priceInPaise: t.priceInPaise,
              earlyPricePaise: t.earlyPricePaise, totalQty: t.totalQty, attendeesPer: t.attendeesPer,
            })),
          });
        }

        // Stall types first — stalls and the layout JSON both reference these by id, so remap old→new.
        const typeIdMap = new Map<string, string>();
        for (const st of src.stallTypes) {
          const nt = await tx.stallTypeDef.create({
            data: { eventId: ev.id, name: st.name, widthFt: st.widthFt, heightFt: st.heightFt, priceInPaise: st.priceInPaise, color: st.color, sellable: st.sellable },
          });
          typeIdMap.set(st.id, nt.id);
        }

        if (src.stalls.length) {
          await tx.stall.createMany({
            data: src.stalls.map((s) => ({
              eventId: ev.id, kind: s.kind,
              stallTypeId: s.stallTypeId ? typeIdMap.get(s.stallTypeId) ?? null : null,
              label: s.label, xFt: s.xFt, yFt: s.yFt, widthFt: s.widthFt, heightFt: s.heightFt,
              rotation: s.rotation, priceInPaise: s.priceInPaise, status: "AVAILABLE",
            })),
          });
        }

        if (src.mapLayout) {
          const layout = src.mapLayout.layoutJson as { elements?: { stallTypeId?: string | null }[] } | null;
          const remapped =
            layout && Array.isArray(layout.elements)
              ? { ...layout, elements: layout.elements.map((el) => (el && el.stallTypeId ? { ...el, stallTypeId: typeIdMap.get(el.stallTypeId) ?? null } : el)) }
              : layout;
          await tx.mapLayout.create({
            data: {
              eventId: ev.id,
              layoutJson: (asJson(remapped as Prisma.JsonValue) ?? {}) as Prisma.InputJsonValue,
              opsLayerJson: asJson(src.mapLayout.opsLayerJson),
            },
          });
        }

        const dayIdMap = new Map<string, string>();
        for (const d of src.days) {
          const nd = await tx.eventDay.create({
            data: { eventId: ev.id, startsAt: d.startsAt, endsAt: d.endsAt, label: d.label, sortOrder: d.sortOrder },
          });
          dayIdMap.set(d.id, nd.id);
        }

        // Artist sets belong to bookings we don't copy — keep only manual items.
        const manualItems = src.schedule.filter((s) => !s.artistBooking);
        if (manualItems.length) {
          await tx.scheduleItem.createMany({
            data: manualItems.map((s) => ({
              eventId: ev.id, startsAt: s.startsAt, endsAt: s.endsAt, title: s.title,
              stageOrZone: s.stageOrZone, performer: s.performer, sortOrder: s.sortOrder,
              eventDayId: s.eventDayId ? dayIdMap.get(s.eventDayId) ?? null : null,
            })),
          });
        }

        if (src.addOns.length) {
          await tx.stallAddOn.createMany({
            data: src.addOns.map((a) => ({
              eventId: ev.id, name: a.name, pricePaise: a.pricePaise, maxPerBooking: a.maxPerBooking, stock: a.stock, active: a.active,
            })),
          });
        }

        return ev;
      });

      return { result: created, after: { id: created.id, slug: created.slug, clonedFrom: sourceId } };
    },
  }));
}

export interface UpdateEventInput {
  name: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  capacity?: number;
  /** When set, changes the public URL slug. Left blank → slug stays as-is (stable on rename). */
  slug?: string;
}

export function updateEvent(session: Session, id: string, input: UpdateEventInput) {
  return withAudit(session, { action: "UPDATE", entity: "Event", entityId: id }, async () => {
    const before = await db.event.findUnique({
      where: { id },
      select: { name: true, slug: true, description: true, location: true, startsAt: true, endsAt: true, capacity: true },
    });
    return {
      before,
      run: async () => {
        // Slug stays stable on rename unless the admin explicitly edits it (breaks old links).
        const slug = input.slug ? await uniqueSlug(input.slug, id) : undefined;
        const event = await db.event.update({
          where: { id },
          data: {
            name: input.name,
            ...(slug ? { slug } : {}),
            description: input.description ?? null,
            location: input.location ?? null,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            capacity: input.capacity ?? null,
          },
        });
        return { result: event, after: event };
      },
    };
  });
}

/** Ticket-only switch: off skips the venue readiness gate and hides vendor booking surfaces. */
export function setVendorStalls(session: Session, id: string, enabled: boolean) {
  return withAudit(session, { action: "UPDATE", entity: "Event", entityId: id }, async () => {
    const before = await db.event.findUnique({ where: { id }, select: { vendorStallsEnabled: true } });
    return {
      before,
      run: async () => {
        const event = await db.event.update({ where: { id }, data: { vendorStallsEnabled: enabled }, select: { id: true, vendorStallsEnabled: true } });
        return { result: event, after: event };
      },
    };
  });
}

/** Force-delete: wipes the event and all dependents (orders/bookings/payments/tickets). Irreversible. */
export function deleteEvent(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "Event", entityId: id }, async () => {
    const before = await db.event.findUnique({
      where: { id },
      include: { _count: { select: { orders: true, bookings: true } } },
    });
    return {
      before,
      run: async () => {
        await db.$transaction(async (tx) => {
          const orders = await tx.order.findMany({ where: { eventId: id }, select: { id: true } });
          const orderIds = orders.map((o) => o.id);
          const tickets = await tx.ticket.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
          const ticketIds = tickets.map((t) => t.id);
          await tx.checkIn.deleteMany({ where: { ticketId: { in: ticketIds } } });
          await tx.payment.deleteMany({ where: { OR: [{ orderId: { in: orderIds } }, { booking: { eventId: id } }] } });
          await tx.ticket.deleteMany({ where: { orderId: { in: orderIds } } });
          await tx.order.deleteMany({ where: { eventId: id } });
          await tx.booking.deleteMany({ where: { eventId: id } });
          await tx.coupon.deleteMany({ where: { eventId: id } });
          await tx.event.delete({ where: { id } });
        });
        return { result: { id }, after: null };
      },
    };
  });
}

export function setEventTheme(session: Session, id: string, theme: { primary?: string; accent?: string }) {
  return withAudit(session, { action: "UPDATE", entity: "Event", entityId: id }, async () => {
    const before = await db.event.findUnique({ where: { id }, select: { theme: true } });
    return {
      before,
      run: async () => {
        const event = await db.event.update({ where: { id }, data: { theme: theme as Prisma.InputJsonValue } });
        return { result: event, after: { theme } };
      },
    };
  });
}

export interface EventPricingInput {
  bulkTiers: { minQty: number; percent: number }[];
  earlyBird: { active: boolean; percent?: number };
}

/** Writes the engine-consumed pricing rules (Event.bulkTiers / Event.earlyBird). Tiers stored
 * ascending by minQty. Affects public quotes, so callers revalidate /events. */
export function setEventPricing(session: Session, id: string, input: EventPricingInput) {
  return withAudit(session, { action: "UPDATE", entity: "Event", entityId: id }, async () => {
    const before = await db.event.findUnique({ where: { id }, select: { bulkTiers: true, earlyBird: true } });
    return {
      before,
      run: async () => {
        const bulkTiers = [...input.bulkTiers].sort((a, b) => a.minQty - b.minQty);
        const event = await db.event.update({
          where: { id },
          data: {
            bulkTiers: bulkTiers as unknown as Prisma.InputJsonValue,
            earlyBird: input.earlyBird as unknown as Prisma.InputJsonValue,
          },
        });
        return { result: event, after: { bulkTiers, earlyBird: input.earlyBird } };
      },
    };
  });
}

export interface EventLogisticsInput {
  addOnCloseHours?: number;
  loadInStartsAt?: Date;
  loadInEndsAt?: Date;
}

/** Add-on close window + vendor load-in/setup window. Nulls clear the field (add-on close falls
 * back to the 48h code default). */
export function setEventLogistics(session: Session, id: string, input: EventLogisticsInput) {
  return withAudit(session, { action: "UPDATE", entity: "Event", entityId: id }, async () => {
    const before = await db.event.findUnique({ where: { id }, select: { addOnCloseHours: true, loadInStartsAt: true, loadInEndsAt: true } });
    return {
      before,
      run: async () => {
        const event = await db.event.update({
          where: { id },
          data: {
            addOnCloseHours: input.addOnCloseHours ?? null,
            loadInStartsAt: input.loadInStartsAt ?? null,
            loadInEndsAt: input.loadInEndsAt ?? null,
          },
        });
        return { result: event, after: { addOnCloseHours: event.addOnCloseHours, loadInStartsAt: event.loadInStartsAt, loadInEndsAt: event.loadInEndsAt } };
      },
    };
  });
}

export function publishEvent(session: Session, id: string) {
  return withAudit(session, { action: "PUBLISH", entity: "Event", entityId: id }, async () => {
    const before = await db.event.findUnique({ where: { id }, select: { status: true } });
    return {
      before,
      run: async () => {
        const readiness = await getEventReadiness(id);
        if (!readiness.ready) throw new PublishBlockedError(readiness.issues);
        const event = await db.event.update({ where: { id }, data: { status: "PUBLISHED" } });
        return { result: event, after: { status: event.status } };
      },
    };
  });
}
