"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All" },
];

export function DashboardFilter({ current }: { current: string }) {
  const router = useRouter();
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
      {RANGES.map((r) => (
        <Button
          key={r.key}
          variant={current === r.key ? "secondary" : "ghost"}
          size="sm"
          className="h-7"
          onClick={() => router.push(`/admin?range=${r.key}`)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
