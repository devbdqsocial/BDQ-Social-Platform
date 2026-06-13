import type { TerrainPatch } from "@/lib/map/layout-v2";

/**
 * Terrain ground textures (map-system.md §5, build-plan R2.5.8). Visual-only in V1 — polygon
 * patches drawn under everything except the underlay. Konva needs hex literals.
 */
export type TerrainType = TerrainPatch["type"];

export const TERRAIN_TYPES: TerrainType[] = ["GRASS", "CONCRETE", "PAVERS", "MUD", "CARPET", "TURF"];

export const TERRAIN_COLOR_HEX: Record<TerrainType, string> = {
  GRASS: "#3FA66A",
  CONCRETE: "#8C8576",
  PAVERS: "#A89B84",
  MUD: "#7A5C43",
  CARPET: "#B0485A",
  TURF: "#46B377",
};

export const terrainLabel = (t: TerrainType): string => t.charAt(0) + t.slice(1).toLowerCase();
