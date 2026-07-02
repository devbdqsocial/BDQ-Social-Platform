import { ZONE_COLOR_HEX } from "@/lib/map/zones";
import type { RenderExtras } from "@/lib/map/render-types";

/** Zone colour legend for customer/vendor maps — mirrors the zone fills MapCanvas draws. */
export function ZoneLegend({ zones }: { zones: NonNullable<RenderExtras["zones"]> }) {
  if (!zones.length) return null;
  return (
    <ul className="flex flex-wrap gap-3" aria-label="Zone legend">
      {zones.map((z) => (
        <li key={z.id} className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-4 rounded-sm opacity-70" style={{ backgroundColor: ZONE_COLOR_HEX[z.color] }} aria-hidden />
          {z.name}
        </li>
      ))}
    </ul>
  );
}
