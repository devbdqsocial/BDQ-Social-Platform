/**
 * Stall status colors for the canvas map. Mirrors design.md §3.6 / globals.css `--color-stall-*`
 * as literal hex, because the Konva canvas can't read CSS variables. Single source for canvas +
 * legend.
 */

export type StallStatus = "AVAILABLE" | "HELD" | "PENDING" | "BOOKED" | "BLOCKED" | "SELECTED";

export const STALL_STATUS_COLORS: Record<StallStatus, { fill: string; stroke: string; text: string }> = {
  AVAILABLE: { fill: "#3FA66A", stroke: "#2F8F5B", text: "#FFFFFF" },
  HELD: { fill: "#E8B23A", stroke: "#B27D17", text: "#15120E" },
  PENDING: { fill: "#E07B2C", stroke: "#A44C2D", text: "#FFFFFF" },
  BOOKED: { fill: "#8C8576", stroke: "#6F6552", text: "#FFFFFF" },
  BLOCKED: { fill: "#4E4639", stroke: "#352F26", text: "#D9CDB8" },
  SELECTED: { fill: "#6C75F5", stroke: "#4A53C8", text: "#FFFFFF" },
};

export const STATUS_LABEL: Record<StallStatus, string> = {
  AVAILABLE: "Available",
  HELD: "On hold",
  PENDING: "Pending",
  BOOKED: "Booked",
  BLOCKED: "Blocked",
  SELECTED: "Selected",
};

/** Non-sellable infrastructure (stage, zones, aisles) — muted neutral. */
export const INFRA_COLOR = { fill: "#E7DECB", stroke: "#BCAE94", text: "#4E4639" } as const;

/** Legend order (excludes SELECTED, which is interaction-only). */
export const LEGEND_STATUSES: StallStatus[] = ["AVAILABLE", "HELD", "PENDING", "BOOKED", "BLOCKED"];
