"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Copy, Trash2, Link2, ExternalLink, Rocket, Archive, ArchiveRestore } from "lucide-react";
import type { listForAdminTable } from "@/server/events/service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import type { Result } from "@/lib/result";
import { publishEventAction, archiveEventAction, unarchiveEventAction, cloneEventAction } from "@/app/admin/(console)/events/actions";
import { fmtDate, fmtRelative } from "@/lib/date-formats";
import { eventStatusBadge } from "@/lib/status-badges";

type Row = Awaited<ReturnType<typeof listForAdminTable>>[number];

/** An icon button (or icon link) with a hover tooltip. */
function IconTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** All per-row actions, inline as icon buttons. */
function EventRowActions({ event }: { event: Row }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isPast = event.endsAt.getTime() < Date.now();
  const status = event.status;

  const simple = (action: (fd: FormData) => Promise<Result<unknown>>, ok: string, fail: string) =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", event.id);
      const res = await action(fd);
      if (res.ok) toast.success(ok);
      else toast.error(res.error.message ?? fail);
    });

  const duplicate = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", event.id);
      const res = await cloneEventAction(fd);
      if (res.ok) {
        toast.success("Event duplicated — opening the copy");
        router.push(`/admin/events/${res.data.id}`);
      } else {
        toast.error(res.error.message ?? "Couldn't duplicate — try again.");
      }
    });

  const publish = () => simple(publishEventAction, "Event published", "Couldn't publish — check the setup checklist.");
  const archive = () => simple(archiveEventAction, "Event archived", "Couldn't archive — try again.");
  const unarchive = () => simple(unarchiveEventAction, "Event unarchived", "Couldn't unarchive — try again.");

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/events/${event.slug}`);
    toast.success("Link copied");
  };

  const canPublish = !isPast && status !== "PUBLISHED" && status !== "LIVE" && status !== "ARCHIVED";

  return (
    <div className="flex items-center justify-end gap-0.5">
      <IconTip label="Edit">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/admin/events/${event.slug}`} aria-label="Edit event"><Pencil className="size-4" /></Link>
        </Button>
      </IconTip>

      <IconTip label="Duplicate">
        <Button variant="ghost" size="icon-sm" onClick={duplicate} disabled={pending} aria-label="Duplicate event"><Copy className="size-4" /></Button>
      </IconTip>

      <IconTip label="Copy public link">
        <Button variant="ghost" size="icon-sm" onClick={copyLink} aria-label="Copy public link"><Link2 className="size-4" /></Button>
      </IconTip>

      <IconTip label="Preview as customer">
        <Button asChild variant="ghost" size="icon-sm">
          <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Preview as customer"><ExternalLink className="size-4" /></a>
        </Button>
      </IconTip>

      {canPublish && (
        <IconTip label="Publish">
          <Button variant="ghost" size="icon-sm" onClick={publish} disabled={pending} aria-label="Publish event"><Rocket className="size-4" /></Button>
        </IconTip>
      )}

      {isPast && status === "ARCHIVED" && (
        <IconTip label="Unarchive">
          <Button variant="ghost" size="icon-sm" onClick={unarchive} disabled={pending} aria-label="Unarchive event"><ArchiveRestore className="size-4" /></Button>
        </IconTip>
      )}

      {isPast && status !== "ARCHIVED" && (
        <ConfirmButton
          title="Archive this event?"
          description="It'll be hidden from the public site. You can unarchive it later."
          confirmLabel="Archive"
          onConfirm={archive}
          pending={pending}
          trigger={
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" aria-label="Archive event" title="Archive"><Archive className="size-4" /></Button>
          }
        />
      )}

      <IconTip label="Delete">
        <Button asChild variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Link href={`/admin/events/${event.slug}?tab=danger`} aria-label="Delete event"><Trash2 className="size-4" /></Link>
        </Button>
      </IconTip>
    </div>
  );
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Event", cell: ({ row }) => <Link href={`/admin/events/${row.original.slug}`} className="font-medium hover:underline">{row.original.name}</Link> },
  {
    id: "date", accessorFn: (r) => r.startsAt.getTime(), header: "Starts",
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        <div>{fmtDate(row.original.startsAt)}</div>
        <div className="text-xs">{fmtRelative(row.original.startsAt)}</div>
      </div>
    ),
  },
  {
    id: "status", accessorFn: (r) => r.status, header: "Status",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <Badge variant={eventStatusBadge(row.original.status).variant}>{eventStatusBadge(row.original.status).label}</Badge>
        {row.original.status === "DRAFT" && (
          row.original.readiness.ready ? (
            <Badge variant="success">Ready</Badge>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="cursor-help"><Badge variant="warning">{row.original.readiness.issueCount} to fix</Badge></span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="font-medium">Before publishing:</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {row.original.readiness.missing.map((m) => <li key={m}>{m}</li>)}
                </ul>
              </TooltipContent>
            </Tooltip>
          )
        )}
      </div>
    ),
  },
  { id: "tickets", accessorFn: (r) => r._count.ticketTypes, header: "Ticket types" },
  { id: "orders", accessorFn: (r) => r._count.orders, header: "Orders" },
  {
    id: "actions", header: "", enableSorting: false,
    cell: ({ row }) => <EventRowActions event={row.original} />,
  },
];

export function EventsTable({ events }: { events: Row[] }) {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Filter by display label (PUBLISHED + LIVE both read as "Live"), and only when >1 is present.
  const labels = React.useMemo(
    () => Array.from(new Set(events.map((e) => eventStatusBadge(e.status).label))),
    [events],
  );

  const filtered = statusFilter === "all" ? events : events.filter((e) => eventStatusBadge(e.status).label === statusFilter);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {labels.length > 1 && (
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v || "all")}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            {labels.map((label) => (
              <ToggleGroupItem key={label} value={label}>{label}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Search events…"
          emptyMessage={
            <span>No events here yet — <Link href="/admin/events/new" className="text-primary hover:underline">create your first one</Link>.</span>
          }
        />
      </div>
    </TooltipProvider>
  );
}
