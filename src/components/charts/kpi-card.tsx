"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string | number;
  deltaPct?: number;
  trend?: number[];
  sub?: string;
}

export function KpiCard({ label, value, deltaPct, trend, sub }: KpiCardProps) {
  const up = (deltaPct ?? 0) >= 0;
  const series = (trend ?? []).map((v, i) => ({ i, v }));
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {deltaPct != null && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-success" : "text-destructive")}>
            {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {Math.abs(deltaPct).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {series.length > 1 && (
          <div className="h-8 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                <Area type="monotone" dataKey="v" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
