import type { EditorElement } from "@/lib/map/designer-ops";
import type { RenderLayout, StatusMap } from "@/lib/map/render-types";
import type { StallStatus } from "@/lib/stall-colors";

/**
 * Map normalization: editor layout <-> bookable Stall rows. Pure (no Prisma import) so it stays
 * unit-testable; the service casts the output to Prisma's create input.
 */

export type DesignerStatus = "AVAILABLE" | "BLOCKED" | "HELD" | "PENDING" | "BOOKED";

export interface StallRow {
  eventId: string;
  kind: "STALL" | "INFRA";
  stallTypeId: string | null;
  label: string;
  xFt: number;
  yFt: number;
  widthFt: number;
  heightFt: number;
  rotation: number;
  priceInPaise: number | null;
  status: DesignerStatus;
}

/** Editor elements -> flat Stall create rows. Dedupes labels (@@unique([eventId,label])). */
export function elementsToStallRows(eventId: string, elements: EditorElement[]): StallRow[] {
  const seen = new Set<string>();
  const uniqueLabel = (raw: string) => {
    const base = raw.trim() || "stall";
    let label = base;
    let n = 2;
    while (seen.has(label)) label = `${base}-${n++}`;
    seen.add(label);
    return label;
  };

  return elements.map((el) => ({
    eventId,
    kind: el.kind === "infra" ? "INFRA" : "STALL",
    stallTypeId: el.kind === "stall" ? el.stallTypeId ?? null : null,
    label: uniqueLabel(el.label),
    xFt: el.xFt,
    yFt: el.yFt,
    widthFt: el.widthFt,
    heightFt: el.heightFt,
    rotation: el.rotation,
    priceInPaise: el.priceInPaise ?? null,
    status: el.status === "BLOCKED" ? "BLOCKED" : "AVAILABLE",
  }));
}

/** Minimal shape of a persisted Stall row needed to render the public map. */
export interface StallLike {
  kind: string;
  status: string;
  label: string;
  xFt: number;
  yFt: number;
  widthFt: number;
  heightFt: number;
  rotation: number;
}

const DEFAULT_CANVAS = { widthFt: 230, heightFt: 160 };

/** Stall rows -> renderer layout + status map (status from the DB). */
export function stallsToRenderLayout(
  stalls: StallLike[],
  canvas: { widthFt: number; heightFt: number } = DEFAULT_CANVAS,
): { layout: RenderLayout; statuses: StatusMap } {
  const elements = stalls.map((s) => ({
    kind: (s.kind === "INFRA" ? "infra" : "stall") as "stall" | "infra",
    type: s.kind === "INFRA" ? "INFRA" : "STALL",
    label: s.label,
    xFt: s.xFt,
    yFt: s.yFt,
    widthFt: s.widthFt,
    heightFt: s.heightFt,
    rotation: s.rotation,
  }));

  const statuses: StatusMap = {};
  for (const s of stalls) {
    if (s.kind !== "INFRA") statuses[s.label] = s.status as StallStatus;
  }

  return { layout: { version: 1, canvas, elements }, statuses };
}
