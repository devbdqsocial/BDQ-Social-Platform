import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/** Global, reusable map-element catalog (stall sizes + infra). The designer palette is built from these. */

export interface MapElementInput {
  name: string;
  kind: "STALL" | "INFRA";
  widthFt: number;
  heightFt: number;
  color: string;
  sellable: boolean;
}

const DEFAULTS: MapElementInput[] = [
  { name: "Small 10×10", kind: "STALL", widthFt: 10, heightFt: 10, color: "#3FA66A", sellable: true },
  { name: "Standard 10×12", kind: "STALL", widthFt: 10, heightFt: 12, color: "#4F9379", sellable: true },
  { name: "Premium 10×15", kind: "STALL", widthFt: 10, heightFt: 15, color: "#868EFF", sellable: true },
  { name: "Food 10×10", kind: "STALL", widthFt: 10, heightFt: 10, color: "#E07B2C", sellable: true },
  { name: "Water stall 10×20", kind: "STALL", widthFt: 10, heightFt: 20, color: "#2C7A8C", sellable: true },
  { name: "Stage", kind: "INFRA", widthFt: 30, heightFt: 20, color: "#BCAE94", sellable: false },
  { name: "Walking lane", kind: "INFRA", widthFt: 40, heightFt: 8, color: "#D9CDB8", sellable: false },
  { name: "Entry", kind: "INFRA", widthFt: 12, heightFt: 10, color: "#8C8576", sellable: false },
  { name: "Toilet", kind: "INFRA", widthFt: 10, heightFt: 10, color: "#8C8576", sellable: false },
  { name: "Lounge", kind: "INFRA", widthFt: 24, heightFt: 16, color: "#BCAE94", sellable: false },
  { name: "Fire exit", kind: "INFRA", widthFt: 10, heightFt: 8, color: "#A44C2D", sellable: false },
];

export function listElements() {
  return db.mapElement.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

/** Seed the catalog the first time it's opened (idempotent). */
export async function ensureElementDefaults() {
  if ((await db.mapElement.count()) === 0) {
    await db.mapElement.createMany({ data: DEFAULTS.map((d, i) => ({ ...d, sortOrder: i })) });
  }
  return listElements();
}

export function saveElement(session: Session, input: MapElementInput, id?: string) {
  return withAudit(session, { action: id ? "UPDATE" : "CREATE", entity: "MapElement", entityId: id }, async () => {
    const before = id ? await db.mapElement.findUnique({ where: { id } }) : null;
    return {
      before,
      run: async () => {
        const row = id
          ? await db.mapElement.update({ where: { id }, data: input })
          : await db.mapElement.create({ data: input });
        return { result: row, after: row };
      },
    };
  });
}

export function deleteElement(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "MapElement", entityId: id }, async () => {
    const before = await db.mapElement.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        await db.mapElement.delete({ where: { id } });
        return { result: { id }, after: null };
      },
    };
  });
}
