import type { EntryFlowObject, OpsObject } from "@/lib/map/layout-v2";

/**
 * Ops + entry-flow object factories (map-system §8 / build-plan R2.5.16). Pure. Default sizes in
 * FEET come from the spec; SCAN_POINT/QUEUE_LANE carry a `lanes` count (drives throughput §8).
 */

export type OpsType = OpsObject["type"];
export type EntryType = EntryFlowObject["type"];

export const OPS_TYPES: OpsType[] = ["SECURITY_POST", "MEDICAL", "GENERATOR", "POWER_POINT", "WATER_POINT", "RESTROOM", "STORAGE", "HELP_DESK", "STAFF_POINT"];
export const ENTRY_TYPES: EntryType[] = ["GATE", "TICKET_COUNTER", "QUEUE_LANE", "SECURITY_CHECK", "SCAN_POINT", "BAG_CHECK", "WELCOME_ZONE"];

const OPS_SIZE: Record<OpsType, [number, number]> = {
  SECURITY_POST: [8, 8], MEDICAL: [12, 10], GENERATOR: [10, 8], POWER_POINT: [4, 4], WATER_POINT: [4, 4],
  RESTROOM: [10, 8], STORAGE: [10, 10], HELP_DESK: [8, 6], STAFF_POINT: [6, 6],
};
const ENTRY_SIZE: Record<EntryType, [number, number]> = {
  GATE: [12, 6], TICKET_COUNTER: [10, 6], QUEUE_LANE: [4, 20], SECURITY_CHECK: [10, 10], SCAN_POINT: [4, 4], BAG_CHECK: [8, 8], WELCOME_ZONE: [20, 15],
};

/** Brand-adjacent fills (Konva needs hex). Ops = muted neutrals; entry = lavender family. */
export const OPS_HEX: Record<OpsType, string> = {
  SECURITY_POST: "#475569", MEDICAL: "#C0392B", GENERATOR: "#8C8576", POWER_POINT: "#C9871A", WATER_POINT: "#2C8C8C",
  RESTROOM: "#6B7280", STORAGE: "#7A5C43", HELP_DESK: "#01065B", STAFF_POINT: "#52525B",
};
export const ENTRY_HEX: Record<EntryType, string> = {
  GATE: "#01065B", TICKET_COUNTER: "#5058C9", QUEUE_LANE: "#A7A6EC", SECURITY_CHECK: "#475569", SCAN_POINT: "#868EFF", BAG_CHECK: "#6C75F5", WELCOME_ZONE: "#3FA66A",
};

export const humanizeType = (t: string): string => t.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");

let seq = 0;
const newId = (p: string) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function createOps(type: OpsType, xFt = 10, yFt = 10): OpsObject {
  const [widthFt, heightFt] = OPS_SIZE[type];
  return { id: newId("ops"), type, xFt, yFt, widthFt, heightFt, rotation: 0, label: humanizeType(type) };
}

export function createEntry(type: EntryType, xFt = 10, yFt = 10): EntryFlowObject {
  const [widthFt, heightFt] = ENTRY_SIZE[type];
  const lanes = type === "SCAN_POINT" || type === "QUEUE_LANE" ? 1 : undefined;
  return { id: newId("ent"), type, xFt, yFt, widthFt, heightFt, rotation: 0, label: humanizeType(type), lanes };
}
