import { INFRA_TYPES } from "@/lib/map/designer-ops";
import { ENTRY_TYPES, OPS_TYPES, humanizeType } from "@/lib/map/entry-ops";
import type { Obstacle } from "@/lib/map/layout-v2";

/**
 * The "Add" palette catalog — every placeable object, grouped and named in flea-market language.
 * The single place for friendly labels; pure so it's unit-testable (a test asserts every enum
 * member is covered — TS Records enforce the rest).
 */

export const OBSTACLE_TYPES: Obstacle["type"][] = ["TREE", "POLE", "BUILDING", "WALL", "WATER_BODY"];

const FRIENDLY: Record<string, string> = {
  // venue infra
  STAGE: "Stage",
  ACTIVITY_ZONE: "Activity zone",
  WATER: "Water station",
  LOUNGE: "Lounge / seating",
  BEVERAGE: "Beverage counter",
  ENTRY: "Entry arch",
  LED_WALL: "LED wall",
  FIRE_EXIT: "Fire exit",
  // ops (admin-only layer)
  SECURITY_POST: "Security post",
  MEDICAL: "First aid",
  GENERATOR: "Generator",
  POWER_POINT: "Power point",
  WATER_POINT: "Drinking water",
  RESTROOM: "Toilets",
  STORAGE: "Storage",
  HELP_DESK: "Help desk",
  STAFF_POINT: "Staff point",
  // entry flow (customer-visible)
  GATE: "Gate",
  TICKET_COUNTER: "Ticket counter",
  QUEUE_LANE: "Queue lane",
  SECURITY_CHECK: "Security check",
  SCAN_POINT: "QR scan point",
  BAG_CHECK: "Bag check",
  WELCOME_ZONE: "Welcome zone",
  // obstacles
  TREE: "Tree",
  POLE: "Pole",
  BUILDING: "Building",
  WALL: "Wall",
  WATER_BODY: "Water body",
  // signage
  ARROW: "Direction arrow",
  TEXT: "Text label",
};

export const catalogLabel = (key: string): string => FRIENDLY[key] ?? humanizeType(key);

export interface CatalogCategory {
  category: string;
  kind: "infra" | "ops" | "entry" | "obstacle" | "annotation";
  items: { key: string; label: string }[];
}

/** Static categories (stall types come from the event's DB rows and are merged by the palette). */
export function buildCatalog(): CatalogCategory[] {
  const items = (keys: readonly string[]) => keys.map((key) => ({ key, label: catalogLabel(key) }));
  return [
    { category: "Venue", kind: "infra", items: items(INFRA_TYPES) },
    { category: "Entry", kind: "entry", items: items(ENTRY_TYPES) },
    { category: "Facilities", kind: "ops", items: items(OPS_TYPES) },
    { category: "Signage", kind: "annotation", items: items(["ARROW", "TEXT"]) },
    { category: "Obstacles", kind: "obstacle", items: items(OBSTACLE_TYPES) },
  ];
}
