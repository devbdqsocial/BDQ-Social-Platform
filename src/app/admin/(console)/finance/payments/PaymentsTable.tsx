"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { listPaymentsForEvent } from "@/server/finance/service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { formatPaise } from "@/lib/utils";

type Row = Awaited<ReturnType<typeof listPaymentsForEvent>>[number];

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  CAPTURED: { label: "Captured", variant: "success" },
  CREATED: { label: "Created", variant: "warning" },
  FAILED: { label: "Failed", variant: "danger" },
};
const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);
const source = (r: Row) => (r.booking ? r.booking.vendorProfile?.brandName ?? "Stall booking" : r.order?.user.phone ?? r.order?.user.name ?? "Ticket order");

const columns: ColumnDef<Row>[] = [
  { id: "source", accessorFn: source, header: "Source", cell: ({ row }) => <span className="font-medium">{source(row.original)}</span> },
  { id: "kind", accessorFn: (r) => (r.booking ? "Stall" : "Tickets"), header: "For", cell: ({ row }) => (row.original.booking ? "Stall" : "Tickets") },
  { id: "gateway", accessorFn: (r) => `${r.gateway} ${r.mode}`, header: "Method", cell: ({ row }) => <span className="text-muted-foreground">{row.original.gateway} · {row.original.mode}</span> },
  { id: "amount", accessorFn: (r) => r.amount, header: "Amount", cell: ({ row }) => <span className="font-medium">{formatPaise(row.original.amount)}</span> },
  { id: "status", accessorFn: (r) => r.status, header: "Status", cell: ({ row }) => { const s = STATUS[row.original.status]; return s ? <Badge variant={s.variant}>{s.label}</Badge> : row.original.status; } },
  { id: "date", accessorFn: (r) => r.createdAt.getTime(), header: "When", cell: ({ row }) => <span className="text-muted-foreground">{fmt(row.original.createdAt)}</span> },
];

/**
 * Renders the Payments data table with an aligned search and status filtering panel.
 * It combines search querying and category filtering on a single aligned row.
 */
export function PaymentsTable({ payments }: { payments: Row[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const filteredData = useMemo(() => {
    let list = payments;
    if (status !== "ALL") {
      list = list.filter((p) => p.status === status);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        const srcVal = source(p).toLowerCase();
        return srcVal.includes(q);
      });
    }
    return list;
  }, [payments, status, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search source…"
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="ALL">All statuses</option>
          <option value="CAPTURED">Captured</option>
          <option value="CREATED">Created</option>
          <option value="FAILED">Failed</option>
        </Select>
      </div>
      <DataTable columns={columns} data={filteredData} searchable={false} emptyMessage="No payments match the filters." />
    </div>
  );
}
