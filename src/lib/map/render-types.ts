import type { StallStatus } from "@/lib/stall-colors";

/**
 * Generic layout shape the map renderer accepts — works for both the seed template and
 * DB-sourced layouts (`type` is a free string, not the seed union). `SeedLayout` satisfies it.
 */
export interface RenderElement {
  kind: "stall" | "infra";
  type: string;
  label: string;
  xFt: number;
  yFt: number;
  widthFt: number;
  heightFt: number;
  rotation: number;
}

export interface RenderLayout {
  version: number;
  canvas: { widthFt: number; heightFt: number };
  elements: RenderElement[];
}

export type StatusMap = Record<string, StallStatus>;
