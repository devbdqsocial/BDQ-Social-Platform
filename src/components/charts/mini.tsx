import { formatPaise } from "@/lib/utils";

/** Server-rendered proportional bar — for the handful-of-rows breakdowns across finance/analytics. */
export function StatBar({
  label, value, max, money = true, tone = "bg-primary",
}: {
  label: string;
  value: number;
  max: number;
  money?: boolean;
  tone?: string;
}) {
  const w = max > 0 ? Math.max(2, Math.round((Math.abs(value) / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate">{label}</span>
        <span className="font-medium">{money ? formatPaise(value) : value.toLocaleString("en-IN")}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 7×24 sales heatmap. `cells` is the flat grid from buildHeatmap (day 0 = Sunday). */
export function Heatmap({ cells }: { cells: { day: number; hour: number; count: number }[] }) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  const at = (d: number, h: number) => cells.find((c) => c.day === d && c.hour === h)?.count ?? 0;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] space-y-1">
        {DAYS.map((name, d) => (
          <div key={d} className="flex items-center gap-1">
            <span className="w-9 shrink-0 text-xs text-muted-foreground">{name}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 24 }, (_, h) => {
                const c = at(d, h);
                const o = c === 0 ? 0.06 : 0.2 + 0.8 * (c / max);
                return (
                  <div
                    key={h}
                    title={`${name} ${h}:00 — ${c} orders`}
                    className="size-3.5 rounded-[2px] bg-primary"
                    style={{ opacity: o }}
                  />
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-1 pl-10 text-[10px] text-muted-foreground">
          {[0, 6, 12, 18, 23].map((h) => (
            <span key={h} style={{ marginLeft: h === 0 ? 0 : "auto" }}>{h}:00</span>
          ))}
        </div>
      </div>
    </div>
  );
}
