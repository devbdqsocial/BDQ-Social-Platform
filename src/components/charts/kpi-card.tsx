"use client";

import dynamic from "next/dynamic";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// recharts (~150KB) is fetched only when a KPI actually has a trend to draw — keeps the card,
// used on 10+ admin pages, light.
const Sparkline = dynamic(() => import("./Sparkline").then((m) => m.Sparkline), { ssr: false });

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
            <Sparkline data={series} />
          </div>
        )}
      </div>
    </Card>
  );
}
