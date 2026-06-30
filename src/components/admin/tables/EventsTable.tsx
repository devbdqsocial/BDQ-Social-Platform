"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { listAllForAdmin } from "@/server/events/service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publishEventAction, archiveEventAction, unarchiveEventAction, cloneEventAction } from "@/app/admin/(console)/events/actions";
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

      let primary: ReactNode = null;
      if (isPast && status === "ARCHIVED") {
        primary = (
          <ActionForm action={unarchiveEventAction} success="Event unarchived">
            <input type="hidden" name="id" value={row.original.id} />
            <Button type="submit" variant="outline" size="sm">Unarchive</Button>
          </ActionForm>
        );
      } else if (isPast) {
        primary = (
          <ActionForm action={archiveEventAction} success="Event archived">
            <input type="hidden" name="id" value={row.original.id} />
            <Button type="submit" variant="outline" className="text-destructive hover:bg-destructive/10" size="sm">Archive</Button>
          </ActionForm>
        );
      } else if (status !== "PUBLISHED" && status !== "LIVE" && status !== "ARCHIVED") {
        primary = (
          <ActionForm action={publishEventAction} success="Event published">
            <input type="hidden" name="id" value={row.original.id} />
            <Button type="submit" variant="outline" size="sm">Publish</Button>
          </ActionForm>
        );
      }

      return (
        <div className="flex items-center justify-end gap-2">
          {primary}
          <form action={cloneEventAction}>
            <input type="hidden" name="id" value={row.original.id} />
            <Button type="submit" variant="ghost" size="sm">Duplicate</Button>
          </form>
        </div>
      );
    },
  },
];

export function EventsTable({ events }: { events: Row[] }) {
  return <DataTable columns={columns} data={events} searchPlaceholder="Search events…" emptyMessage="No events here yet." />;
}
