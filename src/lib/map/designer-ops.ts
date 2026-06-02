import { z } from "zod";
import {
  buildAarushLawnTemplate,
  type SeedInfraType,
  type SeedStallType,
} from "@/server/map/seed-aarush-lawn";

/**
 * Pure helpers for the admin map designer. Geometry is in FEET. Prices are admin-entered per
 * stall/type (never hardcoded). DB persistence comes later; this layer is storage-agnostic.
 */

export type EditorKind = "stall" | "infra";

export interface EditorElement {
  id: string;
  kind: EditorKind;
  /** stall/infra type tag (kept as string so imported JSON validates cleanly) */
  type: string;
  label: string;
  xFt: number;
  yFt: number;
  widthFt: number;
  heightFt: number;
  rotation: number;
  /** sellable stalls only; admin-entered (paise) */
  priceInPaise?: number;
}

export interface StallTypeDef {
  type: SeedStallType;
  name: string;
  widthFt: number;
  heightFt: number;
  color: string;
}

/** Default stall types for the seed venue — sizes only; admin sets the price per event. */
export const DEFAULT_STALL_TYPES: StallTypeDef[] = [
  { type: "SMALL", name: "Small stall", widthFt: 10, heightFt: 10, color: "#3FA66A" },
  { type: "LANE", name: "Lane stall", widthFt: 10, heightFt: 10, color: "#4F9379" },
  { type: "PREMIUM", name: "Premium stall", widthFt: 15, heightFt: 12, color: "#C2603B" },
  { type: "FOOD", name: "Food stall", widthFt: 10, heightFt: 10, color: "#E07B2C" },
];

export const INFRA_TYPES: SeedInfraType[] = [
  "STAGE",
  "ACTIVITY_ZONE",
  "WATER",
  "LOUNGE",
  "BEVERAGE",
  "ENTRY",
  "LED_WALL",
  "FIRE_EXIT",
];

export const DEFAULT_CANVAS = { widthFt: 230, heightFt: 160 };

let seq = 0;
const newId = () => `el_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function snapToGrid(value: number, gridFt: number): number {
  if (gridFt <= 0) return Math.round(value * 100) / 100;
  return Math.round(value / gridFt) * gridFt;
}

export function createStall(type: SeedStallType, xFt = 10, yFt = 10): EditorElement {
  const def = DEFAULT_STALL_TYPES.find((d) => d.type === type) ?? DEFAULT_STALL_TYPES[0];
  return {
    id: newId(),
    kind: "stall",
    type,
    label: `${type[0]}-?`,
    xFt,
    yFt,
    widthFt: def.widthFt,
    heightFt: def.heightFt,
    rotation: 0,
  };
}

export function createInfra(type: SeedInfraType, xFt = 10, yFt = 10): EditorElement {
  return {
    id: newId(),
    kind: "infra",
    type,
    label: type.replace(/_/g, " "),
    xFt,
    yFt,
    widthFt: 20,
    heightFt: 15,
    rotation: 0,
  };
}

export function duplicate(el: EditorElement): EditorElement {
  return { ...el, id: newId(), xFt: el.xFt + 5, yFt: el.yFt + 5, label: `${el.label}*` };
}

/** Aarush Lawn seed template → editable elements (geometry/sizes only, no prices). */
export function seedToEditor(): EditorElement[] {
  return buildAarushLawnTemplate().elements.map((el) => ({
    id: newId(),
    kind: el.kind,
    type: el.type,
    label: el.label,
    xFt: el.xFt,
    yFt: el.yFt,
    widthFt: el.widthFt,
    heightFt: el.heightFt,
    rotation: el.rotation,
  }));
}

export const elementSchema = z.object({
  id: z.string(),
  kind: z.enum(["stall", "infra"]),
  type: z.string(),
  label: z.string(),
  xFt: z.number(),
  yFt: z.number(),
  widthFt: z.number().positive(),
  heightFt: z.number().positive(),
  rotation: z.number(),
  priceInPaise: z.number().int().nonnegative().optional(),
});

export const layoutSchema = z.object({
  version: z.literal(1),
  canvas: z.object({ widthFt: z.number().positive(), heightFt: z.number().positive() }),
  elements: z.array(elementSchema),
});

export type DesignerLayout = z.infer<typeof layoutSchema>;

export function validateLayout(raw: unknown): { ok: true; layout: DesignerLayout } | { ok: false; error: string } {
  const parsed = layoutSchema.safeParse(raw);
  return parsed.success
    ? { ok: true, layout: parsed.data }
    : { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid layout" };
}
