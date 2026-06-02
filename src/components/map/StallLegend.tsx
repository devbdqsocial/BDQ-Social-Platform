import { LEGEND_STATUSES, STALL_STATUS_COLORS, STATUS_LABEL } from "@/lib/stall-colors";

export function StallLegend() {
  return (
    <ul className="flex flex-wrap gap-3" aria-label="Stall status legend">
      {LEGEND_STATUSES.map((s) => (
        <li key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="size-4 rounded-sm border"
            style={{
              backgroundColor: STALL_STATUS_COLORS[s].fill,
              borderColor: STALL_STATUS_COLORS[s].stroke,
            }}
            aria-hidden
          />
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ul>
  );
}
