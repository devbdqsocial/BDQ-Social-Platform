"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { listAllForAdmin } from "@/server/events/service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publishEventAction, archiveEventAction, unarchiveEventAction } from "@/app/admin/(console)/events/actions";
import { ActionForm } from "@/components/admin/action-form";
import { fmtDate } from "@/lib/date-formats";
import { eventStatusBadge } from "@/lib/status-badges";

type Row = Awaited<ReturnType<typeof listAllForAdmin>>[number];

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Event", cell: ({ row }) => <Link href={`/admin/events/${row.original.id}`} className="font-medium hover:underline">{row.original.name}</Link> },
  { id: "date", accessorFn: (r) => r.startsAt.getTime(), header: "Starts", cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.startsAt)}</span> },
  { id: "status", accessorFn: (r) => r.status, header: "Status", cell: ({ row }) => <Badge variant={eventStatusBadge(row.original.status).variant}>{eventStatusBadge(row.original.status).label}</Badge> },
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
            <ActionForm action={unarchiveEventAction} success="Event unarchived">
              <input type="hidden" name="id" value={row.original.id} />
              <Button type="submit" variant="outline" size="sm">Unarchive</Button>
            </ActionForm>
          );
        } else {
          return (
            <ActionForm action={archiveEventAction} success="Event archived">
              <input type="hidden" name="id" value={row.original.id} />
              <Button type="submit" variant="outline" className="text-destructive hover:bg-destructive/10" size="sm">Archive</Button>
            </ActionForm>
          );
        }
      }
      
      if (status !== "PUBLISHED" && status !== "LIVE" && status !== "ARCHIVED") {
        return (
          <ActionForm action={publishEventAction} success="Event published">
            <input type="hidden" name="id" value={row.original.id} />
            <Button type="submit" variant="outline" size="sm">Publish</Button>
          </ActionForm>
        );
      }
      
      return null;
    },
  },
];

export function EventsTable({ events }: { events: Row[] }) {
  return <DataTable columns={columns} data={events} searchPlaceholder="Search events…" emptyMessage="No events here yet." />;
}
