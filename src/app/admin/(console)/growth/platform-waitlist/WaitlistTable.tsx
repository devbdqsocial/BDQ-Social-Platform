"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Entry = {
  id: string;
  phone: string;
  interestedInStall: boolean;
  createdAt: Date;
};

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(d));

const columns: ColumnDef<Entry>[] = [
  { accessorKey: "phone", header: "WhatsApp Number", cell: ({ row }) => <span className="font-medium tabular-nums">{row.original.phone}</span> },
  {
    id: "interestedInStall", header: "Stall Interest",
    cell: ({ row }) => row.original.interestedInStall
      ? <Badge variant="warning">Interested</Badge>
      : <Badge variant="neutral">Not interested</Badge>,
  },
  { id: "createdAt", header: "Signed up", cell: ({ row }) => <span className="text-muted-foreground text-sm">{fmt(row.original.createdAt)}</span> },
];

function exportCsv(entries: Entry[], filter: string) {
  const rows = filter === "stall" ? entries.filter(e => e.interestedInStall)
    : filter === "general" ? entries.filter(e => !e.interestedInStall)
    : entries;
  const csv = ["phone,interestedInStall,signedUpAt",
    ...rows.map(e => `${e.phone},${e.interestedInStall},${new Date(e.createdAt).toISOString()}`)
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `platform-waitlist-${filter}.csv`;
  a.click();
}

export function WaitlistTable({ entries }: { entries: Entry[] }) {
  const [filter, setFilter] = useState<"all" | "stall" | "general">("all");

  const filtered = filter === "stall" ? entries.filter(e => e.interestedInStall)
    : filter === "general" ? entries.filter(e => !e.interestedInStall)
    : entries;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {(["all", "stall", "general"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                filter === f ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? `All (${entries.length})` : f === "stall" ? `Stall interest (${entries.filter(e => e.interestedInStall).length})` : `General (${entries.filter(e => !e.interestedInStall).length})`}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCsv(entries, filter)}>Export CSV</Button>
      </div>
      <DataTable columns={columns} data={filtered} searchable={filtered.length > 8} searchPlaceholder="Search by number…" emptyMessage="No entries." />
    </div>
  );
}
