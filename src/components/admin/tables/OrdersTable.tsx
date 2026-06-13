"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { listOrdersForEvent } from "@/server/tickets/admin-service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { formatPaise } from "@/lib/utils";
import { fmtDateTime } from "@/lib/date-formats";
import { ORDER_STATUS } from "@/lib/status-badges";

type Row = Awaited<ReturnType<typeof listOrdersForEvent>>[number];

const columns: ColumnDef<Row>[] = [
  { id: "id", accessorFn: (r) => r.id, header: "Order", cell: ({ row }) => <span className="font-mono text-xs">{row.original.id.slice(0, 10)}</span> },
  { id: "customer", accessorFn: (r) => `${r.user.phone ?? ""} ${r.user.name ?? ""}`, header: "Customer", cell: ({ row }) => row.original.user.phone ?? row.original.user.name ?? "—" },
  { id: "tickets", accessorFn: (r) => r._count.tickets, header: "Tickets" },
  { id: "total", accessorFn: (r) => r.total, header: "Total", cell: ({ row }) => <span className="font-medium">{formatPaise(row.original.total)}</span> },
  { id: "discount", accessorFn: (r) => r.discount, header: "Discount", cell: ({ row }) => (row.original.discount > 0 ? formatPaise(row.original.discount) : "—") },
  {
    id: "status", accessorFn: (r) => r.status, header: "Status",
    cell: ({ row }) => { const s = ORDER_STATUS[row.original.status]; return s ? <Badge variant={s.variant}>{s.label}</Badge> : row.original.status; },
  },
  { id: "date", accessorFn: (r) => r.createdAt.getTime(), header: "Placed", cell: ({ row }) => <span className="text-muted-foreground">{fmtDateTime(row.original.createdAt)}</span> },
];

export function OrdersTable({ orders }: { orders: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      data={orders}
      searchPlaceholder="Search by phone or order id…"
      onRowClick={(r) => router.push(`/admin/tickets/orders/${r.id}`)}
      emptyMessage="No orders for this event yet."
    />
  );
}
