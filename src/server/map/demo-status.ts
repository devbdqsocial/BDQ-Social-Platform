import type { SeedLayout } from "./seed-aarush-lawn";
import type { StallStatus } from "@/lib/stall-colors";

/**
 * Deterministic demo statuses for the map preview (no DB yet). Real statuses come from the Stall
 * table once Neon is connected. Sellable stalls only; biased toward AVAILABLE for a realistic mix.
 */

// weighted bucket: mostly available, some held/pending/booked, rare blocked
const BUCKET: StallStatus[] = [
  "AVAILABLE", "AVAILABLE", "AVAILABLE", "AVAILABLE",
  "HELD", "PENDING", "BOOKED", "BOOKED", "BLOCKED",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function assignDemoStatuses(layout: SeedLayout): Record<string, StallStatus> {
  const out: Record<string, StallStatus> = {};
  for (const el of layout.elements) {
    if (el.kind !== "stall") continue;
    out[el.label] = BUCKET[hash(el.label) % BUCKET.length];
  }
  return out;
}
