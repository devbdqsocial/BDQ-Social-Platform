import { z } from "zod";
import { elementSchema, type EditorElement } from "@/lib/map/designer-ops";

/**
 * Layout JSON v2 — the single map document (map-system.md §1). One schema, read by every
 * consumer (designer, vendor booking, public map, ops, exports) through `upgradeLayout`.
 * All lengths in FEET. JSON-first: this lives in the existing `layoutJson` columns; no migration.
 */

export const LAYOUT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB hard cap (map-system §1 size guard)
export const VERSION_CAP = 10;

const point = z.tuple([z.number(), z.number()]);

export const LAYER_IDS = [
  "underlay", "terrain", "zones", "pathways", "stalls", "infra", "ops", "entryflow", "labels",
] as const;
export type LayerId = (typeof LAYER_IDS)[number];

export const ZONE_COLORS = [
  "navy", "lavender", "green", "yellow", "pink", "red", "teal", "amber",
] as const;
export type ZoneColor = (typeof ZONE_COLORS)[number];

const underlaySchema = z.object({
  url: z.string(),
  publicId: z.string().default(""),
  ftPerPx: z.number().nonnegative().default(0), // 0 = uncalibrated
  offsetXFt: z.number().default(0),
  offsetYFt: z.number().default(0),
  rotationDeg: z.number().default(0),
  opacity: z.number().min(0.2).max(1).default(0.7),
  locked: z.boolean().default(true),
});

const obstacleSchema = z.object({
  id: z.string(),
  type: z.enum(["TREE", "POLE", "BUILDING", "WALL", "WATER_BODY"]),
  xFt: z.number(), yFt: z.number(), widthFt: z.number().positive(), heightFt: z.number().positive(),
  rotation: z.number().default(0), label: z.string().optional(),
});

const terrainSchema = z.object({
  id: z.string(),
  type: z.enum(["GRASS", "CONCRETE", "PAVERS", "MUD", "CARPET", "TURF"]),
  points: z.array(point),
});

const zoneSchema = z.object({
  id: z.string(), name: z.string(), color: z.enum(ZONE_COLORS),
  points: z.array(point), note: z.string().optional(),
});

const pathwaySchema = z.object({
  id: z.string(), type: z.enum(["MAIN", "SECONDARY", "EMERGENCY"]),
  points: z.array(point), widthFt: z.number().positive(),
});

const opsObjectSchema = z.object({
  id: z.string(),
  type: z.enum(["SECURITY_POST", "MEDICAL", "GENERATOR", "POWER_POINT", "WATER_POINT", "RESTROOM", "STORAGE", "HELP_DESK", "STAFF_POINT"]),
  xFt: z.number(), yFt: z.number(), widthFt: z.number().positive(), heightFt: z.number().positive(),
  rotation: z.number().default(0), label: z.string().optional(),
});

const entryFlowSchema = z.object({
  id: z.string(),
  type: z.enum(["GATE", "QUEUE_LANE", "SECURITY_CHECK", "SCAN_POINT", "BAG_CHECK", "WELCOME_ZONE"]),
  xFt: z.number(), yFt: z.number(), widthFt: z.number().positive(), heightFt: z.number().positive(),
  rotation: z.number().default(0), label: z.string().optional(), lanes: z.number().int().positive().optional(),
});

const layerStateSchema = z.object({ visible: z.boolean(), locked: z.boolean() });

export const layoutV2Schema = z.object({
  v: z.literal(2),
  canvas: z.object({
    widthFt: z.number().positive(),
    heightFt: z.number().positive(),
    gridFt: z.union([z.literal(1), z.literal(2), z.literal(5), z.literal(10)]).default(5),
    displayUnit: z.enum(["FT", "M"]).default("FT"),
  }),
  underlay: underlaySchema.optional(),
  boundary: z.object({ points: z.array(point) }).optional(),
  obstacles: z.array(obstacleSchema).default([]),
  terrain: z.array(terrainSchema).default([]),
  zones: z.array(zoneSchema).default([]),
  pathways: z.array(pathwaySchema).default([]),
  elements: z.array(elementSchema).default([]),
  ops: z.array(opsObjectSchema).default([]),
  entryFlow: z.array(entryFlowSchema).default([]),
  // Loose-keyed so a stored layout missing a newer layer still parses; `upgradeLayout` fills
  // every LAYER_ID via defaultLayers(). Consumers index with a LayerId.
  layers: z.record(z.string(), layerStateSchema).default({}),
  versions: z.array(z.object({ id: z.string(), name: z.string(), createdAt: z.string(), createdBy: z.string(), data: z.unknown() })).default([]),
});

export type LayoutV2 = z.infer<typeof layoutV2Schema>;
export type Obstacle = z.infer<typeof obstacleSchema>;
export type TerrainPatch = z.infer<typeof terrainSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type Pathway = z.infer<typeof pathwaySchema>;
export type OpsObject = z.infer<typeof opsObjectSchema>;
export type EntryFlowObject = z.infer<typeof entryFlowSchema>;

type LayerState = { visible: boolean; locked: boolean };
const defaultLayers = (): Record<string, LayerState> =>
  Object.fromEntries(LAYER_IDS.map((id) => [id, { visible: true, locked: id === "underlay" }]));

function emptyV2(canvas?: { widthFt?: number; heightFt?: number }): LayoutV2 {
  return layoutV2Schema.parse({
    v: 2,
    canvas: { widthFt: canvas?.widthFt ?? 230, heightFt: canvas?.heightFt ?? 160, gridFt: 5, displayUnit: "FT" },
    obstacles: [], terrain: [], zones: [], pathways: [], elements: [], ops: [], entryFlow: [],
    layers: defaultLayers(), versions: [],
  });
}

/** ops-layer rows from a legacy `MapLayout.opsLayerJson` blob, mapped into v2 `ops[]`. */
function mergeOps(opsJson: unknown): OpsObject[] {
  if (!opsJson || typeof opsJson !== "object") return [];
  const arr = Array.isArray(opsJson) ? opsJson : (opsJson as { items?: unknown[] }).items;
  if (!Array.isArray(arr)) return [];
  const out: OpsObject[] = [];
  for (const raw of arr) {
    const r = opsObjectSchema.safeParse(raw);
    if (r.success) out.push(r.data);
  }
  return out;
}

/**
 * upgradeLayout — the ONE entry every consumer loads through. Accepts a v1 doc
 * (`{version:1, canvas, elements}`), an already-v2 doc, or anything loose/empty, and returns a
 * fully-defaulted LayoutV2. Pure; never mutates the DB. Optional `opsJson` folds a legacy
 * `MapLayout.opsLayerJson` blob into `ops[]` (map-system §1).
 */
export function upgradeLayout(json: unknown, opsJson?: unknown): LayoutV2 {
  // already v2
  if (json && typeof json === "object" && (json as { v?: unknown }).v === 2) {
    const parsed = layoutV2Schema.safeParse(json);
    if (parsed.success) {
      if (opsJson && parsed.data.ops.length === 0) parsed.data.ops = mergeOps(opsJson);
      return parsed.data;
    }
  }

  // v1 doc (or anything with a canvas/elements shape)
  const v1 = (json ?? {}) as {
    canvas?: {
      widthFt?: number; heightFt?: number; gridFt?: number;
      bgImage?: { url: string; opacity: number; ftPerPx?: number; offsetXFt?: number; offsetYFt?: number; locked?: boolean };
    };
    elements?: unknown;
  };
  const base = emptyV2(v1.canvas);

  if (v1.canvas?.gridFt && [1, 2, 5, 10].includes(v1.canvas.gridFt)) {
    base.canvas.gridFt = v1.canvas.gridFt as 1 | 2 | 5 | 10;
  }
  if (Array.isArray(v1.elements)) {
    base.elements = v1.elements.filter((e): e is EditorElement => elementSchema.safeParse(e).success);
  }
  // v1 background image → underlay, carrying calibration if the bgImage was already calibrated
  // (R2.5.2 persists calibration on the v1 bgImage); ftPerPx 0 → designer shows "calibrate".
  const bg = v1.canvas?.bgImage;
  if (bg?.url) {
    base.underlay = underlaySchema.parse({
      url: bg.url,
      opacity: bg.opacity,
      ftPerPx: bg.ftPerPx ?? 0,
      offsetXFt: bg.offsetXFt ?? 0,
      offsetYFt: bg.offsetYFt ?? 0,
      locked: bg.locked ?? false,
    });
  }
  base.ops = mergeOps(opsJson);
  return base;
}

/** True when the serialized layout would exceed the 2 MB cap (map-system §1; checked before save). */
export function exceedsSizeCap(layout: LayoutV2): boolean {
  return JSON.stringify(layout).length > LAYOUT_MAX_BYTES;
}

/**
 * Bridge any stored layout (v1 or v2) to the shape the current designer edits — `{ elements,
 * canvas }` — so it "loads both" (build-plan R2.5.1 acceptance). The v2 underlay collapses back
 * to the designer's `canvas.bgImage` for now; the dedicated calibration + sub-collection editors
 * (zones/pathways/…) arrive in R2.5.2+ and will consume the full LayoutV2 directly.
 */
export function editorFromLayout(json: unknown, opsJson?: unknown): {
  elements: EditorElement[];
  canvas: {
    widthFt: number;
    heightFt: number;
    gridFt: number;
    bgImage?: { url: string; opacity: number; ftPerPx?: number; offsetXFt?: number; offsetYFt?: number; locked?: boolean };
  };
} {
  const v2 = upgradeLayout(json, opsJson);
  return {
    elements: v2.elements,
    canvas: {
      widthFt: v2.canvas.widthFt,
      heightFt: v2.canvas.heightFt,
      gridFt: v2.canvas.gridFt,
      ...(v2.underlay
        ? {
            bgImage: {
              url: v2.underlay.url,
              opacity: v2.underlay.opacity,
              ftPerPx: v2.underlay.ftPerPx,
              offsetXFt: v2.underlay.offsetXFt,
              offsetYFt: v2.underlay.offsetYFt,
              locked: v2.underlay.locked,
            },
          }
        : {}),
    },
  };
}
