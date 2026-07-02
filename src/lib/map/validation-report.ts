import type { EditorElement } from "@/lib/map/designer-ops";
import type { Obstacle, Pathway } from "@/lib/map/layout-v2";
import type { Pt } from "@/lib/map/geometry";
import { mapViolations, pathwayWarnings } from "@/lib/map/validation";

/**
 * Consolidated validation (map-system §4/§7/§8 + build-plan R2.5.16). Pure + DB-free. Folds the
 * boundary/obstacle errors (§4) and pathway warnings (§7) together with duplicate-label and
 * unpriced-stall checks. Each row carries a `focusId` so the panel can zoom to the offender.
 */

export type Severity = "error" | "warning";
export interface ValidationItem {
  key: string;
  severity: Severity;
  message: string;
  focusId?: string; // element id to focus/zoom
}

export interface ValidationInput {
  elements: EditorElement[];
  boundary: Pt[] | null;
  obstacles: Obstacle[];
  pathways: Pathway[];
  overrides: Set<string>;
  /** StallTypeDef ids with a price > 0 — a stall priced via its type is not "unpriced" */
  pricedTypeIds?: Set<string>;
}

export function validationReport({ elements, boundary, obstacles, pathways, overrides, pricedTypeIds }: ValidationInput): ValidationItem[] {
  const out: ValidationItem[] = [];

  // §4 boundary / obstacle overlaps (errors)
  for (const v of mapViolations(elements, boundary, obstacles, overrides)) {
    out.push({ key: `bound:${v.elementId}`, severity: "error", message: `${v.label} ${v.detail}`, focusId: v.elementId });
  }

  // §7 pathway width / blocked / exit reachability (warnings)
  for (const w of pathwayWarnings(pathways, elements)) {
    out.push({ key: `path:${w.id}`, severity: "warning", message: w.detail });
  }

  const stalls = elements.filter((e) => e.kind === "stall");

  // duplicate labels (warning)
  const byLabel = new Map<string, EditorElement[]>();
  for (const s of stalls) {
    const k = s.label.trim().toLowerCase();
    if (!k) continue;
    (byLabel.get(k) ?? byLabel.set(k, []).get(k)!).push(s);
  }
  for (const [, group] of byLabel) {
    if (group.length > 1) out.push({ key: `dup:${group[0].id}`, severity: "warning", message: `Duplicate label "${group[0].label}" (${group.length} stalls)`, focusId: group[0].id });
  }

  // unpriced sellable stalls (warning) — effective price = stall override, else its type's price
  for (const s of stalls) {
    const typePriced = !!s.stallTypeId && !!pricedTypeIds?.has(s.stallTypeId);
    if (s.status !== "BLOCKED" && s.priceInPaise == null && !typePriced) {
      out.push({ key: `price:${s.id}`, severity: "warning", message: `${s.label} has no price (set one, or price its stall type)`, focusId: s.id });
    }
  }

  return out;
}
