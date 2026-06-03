"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { STALL_STATUS_COLORS, STATUS_LABEL, type StallStatus } from "@/lib/stall-colors";

const tooltip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted-foreground)" },
  itemStyle: { color: "var(--popover-foreground)" },
  cursor: { fill: "var(--muted)", opacity: 0.4 },
} as const;

const rupeesShort = (v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `₹${v}`);

export function RevenueAreaChart({ data }: { data: { day: string; revenue: number }[] }) {
  const chart = data.map((d) => ({ day: d.day.slice(5), revenue: Math.round(d.revenue / 100) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chart} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} stroke="var(--muted-foreground)" />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} stroke="var(--muted-foreground)" tickFormatter={rupeesShort} />
        <Tooltip {...tooltip} formatter={(value) => [rupeesShort(Number(value)), "Revenue"] as [string, string]} />
        <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#revFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TicketTypeBar({ data }: { data: { name: string; sold: number; total: number }[] }) {
  if (data.length === 0) return <Empty>No ticket types yet.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} stroke="var(--muted-foreground)" allowDecimals={false} />
        <Tooltip {...tooltip} />
        <Bar dataKey="sold" name="Sold" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="total" name="Capacity" fill="var(--chart-3)" radius={[4, 4, 0, 0]} fillOpacity={0.35} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VendorPipelineBar({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart layout="vertical" data={data} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" allowDecimals={false} />
        <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} fontSize={11} width={90} stroke="var(--muted-foreground)" />
        <Tooltip {...tooltip} />
        <Bar dataKey="count" name="Vendors" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StallOccupancyDonut({ counts }: { counts: Record<string, number> }) {
  const order: StallStatus[] = ["AVAILABLE", "HELD", "PENDING", "BOOKED", "BLOCKED"];
  const data = order
    .map((s) => ({ status: s, label: STATUS_LABEL[s], count: counts[s] ?? 0 }))
    .filter((d) => d.count > 0);
  if (data.length === 0) return <Empty>No stalls in this event yet.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" innerRadius={56} outerRadius={88} paddingAngle={2} strokeWidth={0}>
          {data.map((d) => <Cell key={d.status} fill={STALL_STATUS_COLORS[d.status].fill} />)}
        </Pie>
        <Tooltip {...tooltip} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">{children}</div>;
}
