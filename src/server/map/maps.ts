import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { stripEventData, upgradeLayout, type LayoutV2 } from "@/lib/map/layout-v2";
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

/**
 * "Save to library": snapshot this event's layout as a reusable EventMap. Geometry only —
 * `stripEventData` drops prices, stall-type links, statuses, and version history, so the library
 * map never carries one event's pricing into another. Creating links the event to the new map.
 */
export function saveEventLayoutToLibrary(session: Session, eventId: string, target: { name: string } | { mapId: string }) {
  const isUpdate = "mapId" in target;
  return withAudit(session, { action: isUpdate ? "UPDATE" : "CREATE", entity: "EventMap", ...(isUpdate ? { entityId: target.mapId } : {}) }, async () => {
    const ml = await db.mapLayout.findUnique({ where: { eventId }, select: { layoutJson: true, opsLayerJson: true } });
    if (!ml) throw new Error("This event has no layout to save yet.");
    const layout = stripEventData(upgradeLayout(ml.layoutJson, ml.opsLayerJson));
    const data = {
      layoutJson: layout as unknown as Prisma.InputJsonValue,
      widthFt: layout.canvas.widthFt,
      heightFt: layout.canvas.heightFt,
      gridFt: layout.canvas.gridFt ?? 5,
    };
    if (isUpdate) {
      const before = await db.eventMap.findUnique({ where: { id: target.mapId }, select: { name: true } });
      if (!before) throw new Error("Linked map not found");
      return {
        before,
        run: async () => {
          const m = await db.eventMap.update({ where: { id: target.mapId }, data });
          return { result: m, after: { id: m.id, elements: layout.elements.length } };
        },
      };
    }
    return {
      before: null,
      run: async () => {
        const m = await db.eventMap.create({ data: { ...data, name: target.name, createdById: session.userId } });
        await db.event.update({ where: { id: eventId }, data: { mapId: m.id } });
        return { result: m, after: { id: m.id, name: m.name, elements: layout.elements.length } };
      },
    };
  });
}

/**
 * Attach a map to an event: clone its elements into the event's bookable stalls + set Event.mapId.
 * Library maps are geometry-only, so any element price is stripped and each stall adopts the
 * event's StallTypeDef whose name matches its type tag — pricing then comes from the event's
 * types (or per-stall prices set later in the designer).
 */
export function attachMapToEvent(session: Session, eventId: string, mapId: string) {
  return withAudit(session, { action: "UPDATE", entity: "Event", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const map = await db.eventMap.findUnique({ where: { id: mapId } });
      if (!map) throw new Error("Map not found");
      const v2 = upgradeLayout(map.layoutJson);
      const types = await db.stallTypeDef.findMany({ where: { eventId }, select: { id: true, name: true } });
      const typeByName = new Map(types.map((t) => [t.name.trim().toLowerCase(), t.id]));
      const elements = v2.elements.map((e) => ({
        ...e,
        priceInPaise: undefined,
        stallTypeId: e.kind === "stall" ? typeByName.get(e.type.trim().toLowerCase()) : undefined,
      }));
      await db.event.update({ where: { id: eventId }, data: { mapId } });
      await saveEventMap(session, eventId, { ...v2, elements });
      return { result: { eventId, mapId }, after: { mapId } };
    },
  }));
}
