import type { EditorElement } from "@/lib/map/designer-ops";
import type { Obstacle, Pathway, Zone, OpsObject, EntryFlowObject } from "@/lib/map/layout-v2";

/**
 * Deterministic stress layout for perf validation (build-plan R2.5.17). NOT shipped to users —
 * a fixture for benchmarks/tests only. Generates a realistic grid of stalls plus facilities,
 * paths, zones, ops and entry objects on a large canvas.
 */

export interface StressLayout {
  canvas: { widthFt: number; heightFt: number };
  elements: EditorElement[]; // stalls + infra
  zones: Zone[];
  pathways: Pathway[];
  obstacles: Obstacle[];
  ops: OpsObject[];
  entryFlow: EntryFlowObject[];
}

export interface StressOpts {
  stalls?: number;
  facilities?: number;
  paths?: number;
  ops?: number;
  entry?: number;
  zones?: number;
}

/** A packed grid of `stalls` plus facilities/paths/zones/ops/entry on a sized canvas. */
export function makeStressLayout(opts: StressOpts = {}): StressLayout {
  const stalls = opts.stalls ?? 100;
  const facilities = opts.facilities ?? 50;
  const paths = opts.paths ?? 20;
  const opsN = opts.ops ?? 20;
  const entryN = opts.entry ?? 20;
  const zonesN = opts.zones ?? 8;

  // grid geometry: 12×12 stalls with 6 ft aisles
  const W = 12, H = 10, GAP = 6, cols = Math.ceil(Math.sqrt(stalls));
  const widthFt = cols * (W + GAP) + 60;
  const heightFt = Math.ceil(stalls / cols) * (H + GAP) + 80;

  const elements: EditorElement[] = [];
  for (let i = 0; i < stalls; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    elements.push({
      id: `st_${i}`, kind: "stall", type: i % 3 === 0 ? "FOOD" : i % 3 === 1 ? "RETAIL" : "ART",
      label: `${String.fromCharCode(65 + (r % 26))}-${c + 1}`,
      xFt: 30 + c * (W + GAP), yFt: 40 + r * (H + GAP), widthFt: W, heightFt: H, rotation: 0,
      priceInPaise: 1000000 + (i % 5) * 250000, stallTypeId: `def_${i % 3}`, status: i % 17 === 0 ? "BLOCKED" : "AVAILABLE",
    });
  }
  for (let i = 0; i < facilities; i++) {
    const t = ["STAGE", "ACTIVITY_ZONE", "WATER", "LOUNGE", "BEVERAGE", "ENTRY", "LED_WALL", "FIRE_EXIT"][i % 8];
    elements.push({ id: `inf_${i}`, kind: "infra", type: t, label: `${t}-${i}`, xFt: 10 + (i * 37) % (widthFt - 20), yFt: 10 + (i * 53) % (heightFt - 20), widthFt: 16, heightFt: 12, rotation: 0 });
  }

  const zones: Zone[] = Array.from({ length: zonesN }, (_, i) => {
    const zw = widthFt / zonesN, x = i * zw;
    return { id: `z_${i}`, name: i === 0 ? "Food Court" : `Zone ${i}`, color: (["navy", "lavender", "green", "yellow", "pink", "red", "teal", "amber"] as const)[i % 8], points: [[x, 0], [x + zw, 0], [x + zw, heightFt], [x, heightFt]] };
  });

  const pathways: Pathway[] = Array.from({ length: paths }, (_, i) => ({
    id: `p_${i}`, type: (["MAIN", "SECONDARY", "EMERGENCY"] as const)[i % 3], widthFt: i % 3 === 0 ? 20 : 12,
    points: [[0, 40 + i * 16], [widthFt, 40 + i * 16]] as [number, number][],
  }));

  const obstacles: Obstacle[] = [];

  const ops: OpsObject[] = Array.from({ length: opsN }, (_, i) => ({
    id: `ops_${i}`, type: (["SECURITY_POST", "MEDICAL", "GENERATOR", "POWER_POINT", "WATER_POINT", "RESTROOM", "STORAGE", "HELP_DESK", "STAFF_POINT"] as const)[i % 9],
    xFt: 20 + (i * 71) % (widthFt - 20), yFt: 20 + (i * 91) % (heightFt - 20), widthFt: 8, heightFt: 8, rotation: 0, label: `ops${i}`,
  }));

  const entryFlow: EntryFlowObject[] = Array.from({ length: entryN }, (_, i) => {
    const type = (["GATE", "QUEUE_LANE", "SECURITY_CHECK", "SCAN_POINT", "BAG_CHECK", "WELCOME_ZONE"] as const)[i % 6];
    return { id: `ent_${i}`, type, xFt: 10 + i * 20, yFt: 5, widthFt: 8, heightFt: 6, rotation: 0, label: `${type}${i}`, lanes: type === "SCAN_POINT" ? 4 : undefined };
  });

  return { canvas: { widthFt, heightFt }, elements, zones, pathways, obstacles, ops, entryFlow };
}
