"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { listAllForAdmin } from "@/server/events/service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publishEventAction } from "./actions";

type Row = Awaited<ReturnType<typeof listAllForAdmin>>[number];

const isLive = (s: string) => s === "PUBLISHED" || s === "LIVE";
const fmtDate = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d);

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Event", cell: ({ row }) => <Link href={`/admin/events/${row.original.id}`} className="font-medium hover:underline">{row.original.name}</Link> },
  { id: "date", accessorFn: (r) => r.startsAt.getTime(), header: "Starts", cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.startsAt)}</span> },
  { id: "status", accessorFn: (r) => r.status, header: "Status", cell: ({ row }) => <Badge variant={isLive(row.original.status) ? "success" : "neutral"}>{isLive(row.original.status) ? "Live" : "Draft"}</Badge> },
  { id: "tickets", accessorFn: (r) => r._count.ticketTypes, header: "Ticket types" },
  { id: "orders", accessorFn: (r) => r._count.orders, header: "Orders" },
  {
    id: "actions", header: "", enableSorting: false,
    cell: ({ row }) => (!isLive(row.original.status) ? (
      <form action={publishEventAction}>
        <input type="hidden" name="id" value={row.original.id} />
        <Button type="submit" variant="outline" size="sm">Publish</Button>
      </form>
    ) : null),
  },
];

export function EventsTable({ events }: { events: Row[] }) {
  return <DataTable columns={columns} data={events} searchPlaceholder="Search events…" emptyMessage="No events here yet." />;
}
