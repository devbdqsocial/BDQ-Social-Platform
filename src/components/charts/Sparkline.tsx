"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Tiny KPI trend sparkline. Split out so recharts is lazy-loaded only when a trend is shown. */
export function Sparkline({ data }: { data: { i: number; v: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <Area type="monotone" dataKey="v" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
