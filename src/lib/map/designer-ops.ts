import { z } from "zod";
import {
  buildAarushLawnTemplate,
  type SeedInfraType,
} from "@/server/map/seed-aarush-lawn";
import type { StallStatus } from "@/lib/stall-colors";
import type { Annotation } from "@/lib/map/layout-v2";

/**
 * Pure helpers for the admin map designer. Geometry is in FEET. Prices are admin-entered per
 * stall/type (never hardcoded). Stall types are sourced from the DB (StallTypeDef) per event.
 */

export type EditorKind = "stall" | "infra";

export interface EditorElement {
  id: string;
  kind: EditorKind;
  /** stall/infra type tag (free string so imported JSON validates cleanly) */
  type: string;
  label: string;
  xFt: number;
  yFt: number;
  widthFt: number;
  heightFt: number;
  rotation: number;
  /** sellable stalls only; admin-entered (paise) */
  priceInPaise?: number;
  /** link to the event's StallTypeDef this stall was created from */
  stallTypeId?: string;
  /** designer-set status (defaults AVAILABLE); BOOKED/HELD are preserved on save */
  status?: StallStatus;
}

/** Palette type the designer drops onto the canvas — sourced from the DB StallTypeDef rows. */
export interface PaletteStallType {
  id: string;
  name: string;
  widthFt: number;
  heightFt: number;
  priceInPaise: number;
  color: string;
  sellable: boolean;
}

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

/**
 * Ground-plan underlay. Calibration fields (R2.5.2) are optional so a pre-calibration image
 * still loads; `ftPerPx > 0` means the image renders at true real-world scale (map-system §2).
 */
export interface BgImage {
  url: string;
  opacity: number;
  ftPerPx?: number; // 0/undefined = uncalibrated (not to scale)
  offsetXFt?: number; // image origin offset on the canvas, in feet
  offsetYFt?: number;
  locked?: boolean; // locked = not draggable (default once calibrated)
}

export interface CanvasMeta {
  widthFt: number;
  heightFt: number;
  gridFt?: number;
  bgImage?: BgImage;
}

let seq = 0;
const newId = () => `el_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function snapToGrid(value: number, gridFt: number): number {
  if (gridFt <= 0) return Math.round(value * 100) / 100;
  return Math.round(value / gridFt) * gridFt;
}

export function createStall(def: PaletteStallType, xFt = 10, yFt = 10): EditorElement {
  return {
    id: newId(),
    kind: "stall",
    type: def.name,
    label: `${def.name[0]?.toUpperCase() ?? "S"}-?`,
    xFt,
    yFt,
    widthFt: def.widthFt,
    heightFt: def.heightFt,
    rotation: 0,
    stallTypeId: def.id,
    priceInPaise: def.sellable ? def.priceInPaise : undefined,
    status: "AVAILABLE",
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

/** Signage factory — a wayfinding arrow or free text label (annotations layer). */
export function createAnnotation(type: "ARROW" | "TEXT", xFt = 20, yFt = 20): Annotation {
  return {
    id: newId(),
    type,
    xFt,
    yFt,
    rotation: 0,
    label: type === "ARROW" ? "This way" : "Text",
    lengthFt: 12,
    fontSize: 12,
  };
}

export function duplicate(el: EditorElement): EditorElement {
  return { ...el, id: newId(), xFt: el.xFt + 5, yFt: el.yFt + 5, label: `${el.label}*` };
}

/** Main Exhibition Grounds seed template → editable elements (geometry/sizes only, no prices). */
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

const statusEnum = z.enum(["AVAILABLE", "HELD", "PENDING", "BOOKED", "BLOCKED", "SELECTED"]);

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
  stallTypeId: z.string().optional(),
  status: statusEnum.optional(),
});

export const layoutSchema = z.object({
  version: z.literal(1),
  canvas: z.object({
    widthFt: z.number().positive(),
    heightFt: z.number().positive(),
    gridFt: z.number().positive().optional(),
    bgImage: z
      .object({
        url: z.string(),
        opacity: z.number().min(0).max(1),
        ftPerPx: z.number().nonnegative().optional(),
        offsetXFt: z.number().optional(),
        offsetYFt: z.number().optional(),
        locked: z.boolean().optional(),
      })
      .optional(),
  }),
  elements: z.array(elementSchema),
});

export type DesignerLayout = z.infer<typeof layoutSchema>;

export function validateLayout(raw: unknown): { ok: true; layout: DesignerLayout } | { ok: false; error: string } {
  const parsed = layoutSchema.safeParse(raw);
  return parsed.success
    ? { ok: true, layout: parsed.data }
    : { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid layout" };
}
