/**
 * "Main Exhibition Grounds" seed map template (Docs/project.md §7.5, BUSINESS-RULES §2.1).
 * Produces layout geometry + sizes in FEET only — NO prices (prices are admin-entered per event
 * via StallTypeDef). Admins clone this, then tweak.
 *
 * Note: the reference poster headlines "101 stalls" but its own breakdown
 * (36 small + 32 lane + 16 premium + 10 food) sums to 94 sellable stalls. We generate the
 * explicit, internally-consistent typed breakdown (94). Adjust counts here if the venue confirms.
 */

export const AARUSH_LAWN_CANVAS = { widthFt: 230, heightFt: 160 } as const;

export type SeedStallType = "SMALL" | "LANE" | "PREMIUM" | "FOOD";
export type SeedInfraType =
  | "STAGE"
  | "ACTIVITY_ZONE"
  | "WATER"
  | "LOUNGE"
  | "BEVERAGE"
  | "ENTRY"
  | "LED_WALL"
  | "FIRE_EXIT";

interface ElBase {
  label: string;
  xFt: number;
  yFt: number;
  widthFt: number;
  heightFt: number;
  rotation: number;
}
export interface SeedStall extends ElBase {
  kind: "stall";
  type: SeedStallType;
  sellable: true;
}
export interface SeedInfra extends ElBase {
  kind: "infra";
  type: SeedInfraType;
}
export type SeedElement = SeedStall | SeedInfra;

export interface SeedLayout {
  version: 1;
  canvas: { widthFt: number; heightFt: number };
  elements: SeedElement[];
}

const SIZE: Record<SeedStallType, { w: number; h: number }> = {
  SMALL: { w: 10, h: 10 },
  LANE: { w: 10, h: 10 },
  PREMIUM: { w: 15, h: 12 },
  FOOD: { w: 10, h: 10 },
};

function stall(type: SeedStallType, label: string, xFt: number, yFt: number): SeedStall {
  return { kind: "stall", type, label, xFt, yFt, ...{ widthFt: SIZE[type].w, heightFt: SIZE[type].h }, rotation: 0, sellable: true };
}
function infra(type: SeedInfraType, label: string, xFt: number, yFt: number, widthFt: number, heightFt: number): SeedInfra {
  return { kind: "infra", type, label, xFt, yFt, widthFt, heightFt, rotation: 0 };
}

export function buildAarushLawnTemplate(): SeedLayout {
  const elements: SeedElement[] = [];

  // Food stalls F1..F10 — top band
  for (let i = 0; i < 10; i++) {
    const gap = i >= 5 ? 15 : 0; // water-station gap after F5
    elements.push(stall("FOOD", `F-${i + 1}`, 40 + i * 12 + gap, 12));
  }

  // Small stalls — 9 blocks x 4 (2x2 of 10x10) = 36, central
  let small = 0;
  for (let b = 0; b < 9; b++) {
    const blockX = 40 + (b % 3) * 34;
    const blockY = 42 + Math.floor(b / 3) * 26;
    for (let c = 0; c < 4; c++) {
      const x = blockX + (c % 2) * 11;
      const y = blockY + Math.floor(c / 2) * 11;
      elements.push(stall("SMALL", `S-${++small}`, x, y));
    }
  }

  // Lane stalls — 2 lanes, each front 8 + back 8 = 32, right-central
  let lane = 0;
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 8; i++) {
      elements.push(stall("LANE", `L-${++lane}`, 150 + i * 11, 42 + row * 13));
    }
  }

  // Premium stalls — 16 across the bottom (15x12)
  for (let i = 0; i < 16; i++) {
    elements.push(stall("PREMIUM", `P-${i + 1}`, 30 + i * 16, 132));
  }

  // Infrastructure (non-sellable)
  elements.push(infra("STAGE", "Main Stage", 175, 95, 40, 24));
  elements.push(infra("ACTIVITY_ZONE", "Kids Activity", 5, 40, 25, 25));
  elements.push(infra("ACTIVITY_ZONE", "DIY / Art Workshop", 5, 67, 25, 25));
  elements.push(infra("ACTIVITY_ZONE", "Flea Games", 5, 94, 25, 25));
  elements.push(infra("ACTIVITY_ZONE", "Open Mic / Creator", 5, 121, 25, 25));
  elements.push(infra("WATER", "Water Station", 118, 10, 20, 15));
  elements.push(infra("LOUNGE", "Food Partner Lounge", 185, 12, 35, 25));
  elements.push(infra("BEVERAGE", "Beverage Partner", 180, 70, 25, 20));
  elements.push(infra("ENTRY", "Grand Entry", 0, 95, 30, 20));
  elements.push(infra("LED_WALL", "LED Wall", 35, 118, 20, 8));
  elements.push(infra("FIRE_EXIT", "Fire Exit", 218, 120, 10, 8));

  return { version: 1, canvas: { ...AARUSH_LAWN_CANVAS }, elements };
}

export function countByType(layout: SeedLayout) {
  const counts: Record<string, number> = {};
  for (const el of layout.elements) {
    const key = el.kind === "stall" ? el.type : `INFRA_${el.type}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
