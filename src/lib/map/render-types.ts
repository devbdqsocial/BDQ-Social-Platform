import type { StallStatus } from "@/lib/stall-colors";
import type { Annotation, EntryFlowObject, OpsObject, Pathway, Zone } from "@/lib/map/layout-v2";

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

/**
 * Optional non-stall context rendered around the elements — zones, walkways, plot outline, gates/
 * counters, signage (and the ops layer, operations lens only). Built by `layoutExtras()` from the
 * event's LayoutV2 through a lens; stall geometry/status stays row-sourced (the fast path).
 */
export interface RenderExtras {
  boundary?: [number, number][];
  zones?: Zone[];
  pathways?: Pathway[];
  entryFlow?: EntryFlowObject[];
  ops?: OpsObject[];
  annotations?: Annotation[];
}
