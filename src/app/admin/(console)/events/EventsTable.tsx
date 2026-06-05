"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { listAllForAdmin } from "@/server/events/service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publishEventAction, archiveEventAction, unarchiveEventAction } from "./actions";

type Row = Awaited<ReturnType<typeof listAllForAdmin>>[number];

const isLive = (s: string) => s === "PUBLISHED" || s === "LIVE";
const fmtDate = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d);

const getStatusLabel = (status: string) => {
  if (status === "ARCHIVED") return "Archived";
  if (isLive(status)) return "Live";
  if (status === "ENDED") return "Ended";
  return "Draft";
};

const getStatusVariant = (status: string): "success" | "neutral" => {
  if (isLive(status)) return "success";
  return "neutral";
};

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Event", cell: ({ row }) => <Link href={`/admin/events/${row.original.id}`} className="font-medium hover:underline">{row.original.name}</Link> },
  { id: "date", accessorFn: (r) => r.startsAt.getTime(), header: "Starts", cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.startsAt)}</span> },
  { id: "status", accessorFn: (r) => r.status, header: "Status", cell: ({ row }) => <Badge variant={getStatusVariant(row.original.status)}>{getStatusLabel(row.original.status)}</Badge> },
  { id: "tickets", accessorFn: (r) => r._count.ticketTypes, header: "Ticket types" },
  { id: "orders", accessorFn: (r) => r._count.orders, header: "Orders" },
  {
    id: "actions", header: "", enableSorting: false,
    cell: ({ row }) => {
      const isPast = row.original.endsAt.getTime() < Date.now();
      const status = row.original.status;
      
      if (isPast) {
        if (status === "ARCHIVED") {
          return (
            <form action={unarchiveEventAction}>
              <input type="hidden" name="id" value={row.original.id} />
              <Button type="submit" variant="outline" size="sm">Unarchive</Button>
            </form>
          );
        } else {
          return (
            <form action={archiveEventAction}>
              <input type="hidden" name="id" value={row.original.id} />
              <Button type="submit" variant="outline" className="text-destructive hover:bg-destructive/10" size="sm">Archive</Button>
            </form>
          );
        }
      }
      
      if (!isLive(status) && status !== "ARCHIVED") {
        return (
          <form action={publishEventAction}>
            <input type="hidden" name="id" value={row.original.id} />
            <Button type="submit" variant="outline" size="sm">Publish</Button>
          </form>
        );
      }
      
      return null;
    },
  },
];

export function EventsTable({ events }: { events: Row[] }) {
  return <DataTable columns={columns} data={events} searchPlaceholder="Search events…" emptyMessage="No events here yet." />;
}
