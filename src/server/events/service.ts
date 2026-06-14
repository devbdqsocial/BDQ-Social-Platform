import "server-only";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
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

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (await db.event.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
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

export function getByIdForAdmin(id: string) {
  return db.event.findUnique({
    where: { id },
    include: {
      ticketTypes: { orderBy: { priceInPaise: "asc" } },
      schedule: { orderBy: { startsAt: "asc" } },
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
    const before = await db.scheduleItem.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        await db.scheduleItem.delete({ where: { id } });
        return { result: { id }, after: null };
      },
    };
  });
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
        stalls: { orderBy: { label: "asc" } },
        mapLayout: { select: { layoutJson: true } },
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

export interface UpdateEventInput {
  name: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  capacity?: number;
}

export function updateEvent(session: Session, id: string, input: UpdateEventInput) {
  return withAudit(session, { action: "UPDATE", entity: "Event", entityId: id }, async () => {
    const before = await db.event.findUnique({
      where: { id },
      select: { name: true, description: true, location: true, startsAt: true, endsAt: true, capacity: true },
    });
    return {
      before,
      run: async () => {
        // Slug stays stable on rename to preserve the public URL.
        const event = await db.event.update({
          where: { id },
          data: {
            name: input.name,
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

export function publishEvent(session: Session, id: string) {
  return withAudit(session, { action: "PUBLISH", entity: "Event", entityId: id }, async () => {
    const before = await db.event.findUnique({ where: { id }, select: { status: true } });
    return {
      before,
      run: async () => {
        const event = await db.event.update({ where: { id }, data: { status: "PUBLISHED" } });
        return { result: event, after: { status: event.status } };
      },
    };
  });
}
