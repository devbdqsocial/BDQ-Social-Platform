import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { upgradeLayout, type LayoutV2 } from "@/lib/map/layout-v2";
import { saveEventMap } from "@/server/events/service";

/** Named, reusable maps (venue size + layout). Geometry stored in feet; attach to any event. */

export interface CreateMapInput {
  name: string;
  description?: string;
  locationName?: string;
  unit: "FT" | "M";
  widthFt: number;
  heightFt: number;
  gridFt: number;
}

export function listMaps() {
  return db.eventMap.findMany({ orderBy: { createdAt: "desc" } });
}

export function getMap(id: string) {
  return db.eventMap.findUnique({ where: { id } });
}

export function createMap(session: Session, input: CreateMapInput) {
  return withAudit(session, { action: "CREATE", entity: "EventMap" }, async () => ({
    before: null,
    run: async () => {
      const layoutJson = {
        version: 1,
        canvas: { widthFt: input.widthFt, heightFt: input.heightFt, gridFt: input.gridFt },
        elements: [],
      } as unknown as Prisma.InputJsonValue;
      const m = await db.eventMap.create({
        data: {
          name: input.name,
          description: input.description || null,
          locationName: input.locationName || null,
          unit: input.unit,
          widthFt: input.widthFt,
          heightFt: input.heightFt,
          gridFt: input.gridFt,
          layoutJson,
          createdById: session.userId,
        },
      });
      return { result: m, after: { id: m.id, name: m.name } };
    },
  }));
}

export function saveMapLayout(session: Session, mapId: string, layout: LayoutV2) {
  return withAudit(session, { action: "UPDATE", entity: "EventMap", entityId: mapId }, async () => {
    const before = await db.eventMap.findUnique({ where: { id: mapId }, select: { name: true } });
    return {
      before,
      run: async () => {
        const m = await db.eventMap.update({
          where: { id: mapId },
          data: {
            layoutJson: layout as unknown as Prisma.InputJsonValue,
            widthFt: layout.canvas.widthFt,
            heightFt: layout.canvas.heightFt,
            gridFt: layout.canvas.gridFt ?? 5,
          },
        });
        return { result: m, after: { elements: layout.elements.length } };
      },
    };
  });
}

/** Attach a map to an event: clone its elements into the event's bookable stalls + set Event.mapId. */
export function attachMapToEvent(session: Session, eventId: string, mapId: string) {
  return withAudit(session, { action: "UPDATE", entity: "Event", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const map = await db.eventMap.findUnique({ where: { id: mapId } });
      if (!map) throw new Error("Map not found");
      const v2 = upgradeLayout(map.layoutJson);
      // catalog ids (MapElement) don't exist as per-event StallTypeDef — drop the link, keep geometry.
      const elements = v2.elements.map((e) => ({ ...e, stallTypeId: undefined }));
      await db.event.update({ where: { id: eventId }, data: { mapId } });
      await saveEventMap(session, eventId, { ...v2, elements });
      return { result: { eventId, mapId }, after: { mapId } };
    },
  }));
}
