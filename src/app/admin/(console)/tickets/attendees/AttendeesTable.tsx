"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { listTicketsForEvent } from "@/server/tickets/admin-service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";

type Row = Awaited<ReturnType<typeof listTicketsForEvent>>[number];

const STATUS: Record<string, { label: string; variant: "success" | "danger" | "neutral" }> = {
  VALID: { label: "Valid", variant: "neutral" },
  CHECKED_IN: { label: "Checked in", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};
const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d);

const columns: ColumnDef<Row>[] = [
  { id: "holder", accessorFn: (r) => `${r.holderName ?? r.order.user.name ?? ""} ${r.holderPhone ?? r.order.user.phone ?? ""}`, header: "Attendee", cell: ({ row }) => row.original.holderName ?? row.original.order.user.name ?? "—" },
  { id: "phone", accessorFn: (r) => r.holderPhone ?? r.order.user.phone ?? "", header: "Phone", cell: ({ row }) => row.original.holderPhone ?? row.original.order.user.phone ?? "—" },
  { id: "type", accessorFn: (r) => r.ticketType.name, header: "Ticket" },
  { id: "comp", accessorFn: (r) => (r.isComp ? "comp" : "paid"), header: "Source", cell: ({ row }) => (row.original.isComp ? <Badge variant="warning">Comp</Badge> : <span className="text-muted-foreground">Paid</span>) },
  { id: "status", accessorFn: (r) => r.status, header: "Status", cell: ({ row }) => { const s = STATUS[row.original.status]; return s ? <Badge variant={s.variant}>{s.label}</Badge> : row.original.status; } },
  { id: "date", accessorFn: (r) => r.createdAt.getTime(), header: "Issued", cell: ({ row }) => <span className="text-muted-foreground">{fmt(row.original.createdAt)}</span> },
];

export function AttendeesTable({ tickets }: { tickets: Row[] }) {
  return <DataTable columns={columns} data={tickets} searchPlaceholder="Search name or phone…" emptyMessage="No attendees for this event yet." />;
}
