import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { elementsToStallRows } from "@/lib/map/normalize";
import type { DesignerLayout } from "@/lib/map/designer-ops";

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

export function listPublished() {
  return db.event.findMany({
    where: { status: { in: ["PUBLISHED", "LIVE"] } },
    orderBy: { startsAt: "asc" },
    include: { ticketTypes: { orderBy: { priceInPaise: "asc" } } },
  });
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
    },
  });
}

export function saveEventMap(session: Session, eventId: string, layout: DesignerLayout) {
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
          // Pre-booking: full replace of stalls. Once bookings exist, merge to preserve booked ones.
          await tx.stall.deleteMany({ where: { eventId } });
          if (rows.length) await tx.stall.createMany({ data: rows as Prisma.StallCreateManyInput[] });
          return ml;
        });
        return { result: saved, after: { version: saved.version, stalls: rows.length } };
      },
    };
  });
}

export function getBySlug(slug: string) {
  return db.event.findUnique({
    where: { slug },
    include: {
      ticketTypes: { orderBy: { priceInPaise: "asc" } },
      schedule: { orderBy: { startsAt: "asc" } },
      stalls: { orderBy: { label: "asc" } },
      mapLayout: { select: { layoutJson: true } },
    },
  });
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
