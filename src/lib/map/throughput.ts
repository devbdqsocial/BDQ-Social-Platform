import type { EntryFlowObject } from "@/lib/map/layout-v2";

/**
 * Entry-flow throughput (map-system.md §8 / build-plan R2.5.16). Pure + DB-free. The kiosk-plan
 * constants live ONLY here (single source, unit-tested): 5 scans/min/lane, 80% utilization, and
 * the 60%-in-2h peak-arrival model.
 */

export const SCANS_PER_MIN_PER_LANE = 5;
export const UTILIZATION = 0.8;
export const PEAK_ARRIVAL_FRACTION = 0.6; // 60% of guests arrive in the peak window
export const PEAK_WINDOW_HOURS = 2;

/** Total simultaneous scan lanes across all SCAN_POINTs (each lane defaults to 1). */
export function totalScanLanes(entryFlow: EntryFlowObject[]): number {
  return entryFlow.filter((o) => o.type === "SCAN_POINT").reduce((s, o) => s + (o.lanes ?? 1), 0);
}

/** Gate scanning capacity in guests/hour. */
export function guestsPerHour(scanLanes: number): number {
  return Math.round(scanLanes * SCANS_PER_MIN_PER_LANE * 60 * UTILIZATION);
}

/** Expected peak arrival rate (guests/hour) for a given total ticket count. */
export function expectedPeakPerHour(totalTickets: number): number {
  return Math.round((totalTickets * PEAK_ARRIVAL_FRACTION) / PEAK_WINDOW_HOURS);
}

export interface ThroughputReport {
  scanLanes: number;
  capacityPerHour: number;
  expectedPeakPerHour: number;
  ok: boolean; // capacity ≥ expected peak
  shortfall: number; // guests/hour short (0 when ok)
}

export function throughputReport(entryFlow: EntryFlowObject[], totalTickets: number): ThroughputReport {
  const scanLanes = totalScanLanes(entryFlow);
  const capacityPerHour = guestsPerHour(scanLanes);
  const peak = expectedPeakPerHour(totalTickets);
  return { scanLanes, capacityPerHour, expectedPeakPerHour: peak, ok: capacityPerHour >= peak, shortfall: Math.max(0, peak - capacityPerHour) };
}
