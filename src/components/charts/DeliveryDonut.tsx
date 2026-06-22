"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

/** Campaign deliverability donut. Isolated so recharts loads only on the campaign edit page when shown. */
export function DeliveryDonut({ data }: { data: { value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={4} dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
