"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { listStallsForEvent } from "@/server/map/admin-service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { formatPaise } from "@/lib/utils";
import { STALL_STATUS } from "@/lib/status-badges";

type Row = Awaited<ReturnType<typeof listStallsForEvent>>[number];

const columns: ColumnDef<Row>[] = [
  { accessorKey: "label", header: "Stall", cell: ({ row }) => <span className="font-medium">{row.original.label}</span> },
  { id: "type", accessorFn: (r) => r.stallType?.name ?? "", header: "Type", cell: ({ row }) => row.original.stallType?.name ?? "—" },
  { id: "size", accessorFn: (r) => r.widthFt * r.heightFt, header: "Size", cell: ({ row }) => `${row.original.widthFt}×${row.original.heightFt} ft` },
  { id: "status", accessorFn: (r) => r.status, header: "Status", cell: ({ row }) => { const s = STALL_STATUS[row.original.status]; return s ? <Badge variant={s.variant}>{s.label}</Badge> : row.original.status; } },
  { id: "vendor", accessorFn: (r) => r.bookings[0]?.vendorProfile?.brandName ?? "", header: "Vendor", cell: ({ row }) => row.original.bookings[0]?.vendorProfile?.brandName ?? "—" },
  { id: "price", accessorFn: (r) => r.priceInPaise ?? 0, header: "Price", cell: ({ row }) => (row.original.priceInPaise != null ? formatPaise(row.original.priceInPaise) : "—") },
];

export function StallsTable({ stalls }: { stalls: Row[] }) {
  const [status, setStatus] = useState("ALL");
  const data = useMemo(() => (status === "ALL" ? stalls : stalls.filter((s) => s.status === status)), [stalls, status]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="ALL">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="HELD">Reserved</option>
          <option value="PENDING">Pending</option>
          <option value="BOOKED">Booked</option>
          <option value="BLOCKED">Blocked</option>
        </Select>
      </div>
      <DataTable columns={columns} data={data} searchPlaceholder="Search stall or vendor…" emptyMessage="No stalls — build the event layout first." />
    </div>
  );
}
