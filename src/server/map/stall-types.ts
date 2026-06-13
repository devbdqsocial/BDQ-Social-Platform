import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/** Per-event stall types (sizes/price/colour). Admin-managed; the designer palette is built from these. */

export interface StallTypeInput {
  name: string;
  widthFt: number;
  heightFt: number;
  priceInPaise: number;
  color: string;
  sellable: boolean;
}

const DEFAULTS: StallTypeInput[] = [
  { name: "Small 10×10", widthFt: 10, heightFt: 10, priceInPaise: 0, color: "#3FA66A", sellable: true },
  { name: "Standard 10×12", widthFt: 10, heightFt: 12, priceInPaise: 0, color: "#4F9379", sellable: true },
  { name: "Premium 10×15", widthFt: 10, heightFt: 15, priceInPaise: 0, color: "#868EFF", sellable: true },
  { name: "Food 10×10", widthFt: 10, heightFt: 10, priceInPaise: 0, color: "#E07B2C", sellable: true },
];

export function listStallTypes(eventId: string) {
  return db.stallTypeDef.findMany({ where: { eventId }, orderBy: { name: "asc" } });
}

/** Seed default types for an event that has none yet (idempotent). */
export async function ensureStallTypes(eventId: string) {
  const existing = await db.stallTypeDef.count({ where: { eventId } });
  if (existing === 0) {
    await db.stallTypeDef.createMany({ data: DEFAULTS.map((d) => ({ eventId, ...d })), skipDuplicates: true });
  }
  return listStallTypes(eventId);
}

export function saveStallType(session: Session, eventId: string, input: StallTypeInput, id?: string) {
  return withAudit(session, { action: id ? "UPDATE" : "CREATE", entity: "StallTypeDef", entityId: id }, async () => {
    const before = id ? await db.stallTypeDef.findUnique({ where: { id } }) : null;
    return {
      before,
      run: async () => {
        const row = id
          ? await db.stallTypeDef.update({ where: { id }, data: input })
          : await db.stallTypeDef.create({ data: { eventId, ...input } });
        return { result: row, after: row };
      },
    };
  });
}

/** Delete a type; any stalls created from it keep their geometry but lose the link (stallTypeId → null). */
export function deleteStallType(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "StallTypeDef", entityId: id }, async () => {
    const before = await db.stallTypeDef.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        await db.$transaction(async (tx) => {
          await tx.stall.updateMany({ where: { stallTypeId: id }, data: { stallTypeId: null } });
          await tx.stallTypeDef.delete({ where: { id } });
        });
        return { result: { id }, after: null };
      },
    };
  });
}
