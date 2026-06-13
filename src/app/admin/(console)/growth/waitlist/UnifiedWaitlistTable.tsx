"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notifyWaitlistAction } from "./actions";
import { fmtDateTime } from "@/lib/date-formats";

export type WaitlistEntry = {
  id: string;
  source: "PLATFORM" | "EVENT";
  eventId: string | null;
  type: "TICKET" | "STALL";
  name: string | null;
  email: string | null;
  phone: string | null;
  contact: string | null;
  notifiedAt: Date | null;
  createdAt: Date;
  event?: { name: string } | null;
};

type EventSummary = {
  id: string;
  name: string;
};

const fmt = (d: Date) => fmtDateTime(new Date(d));

export function UnifiedWaitlistTable({
  platformEntries,
  eventEntries,
  events,
}: {
  platformEntries: WaitlistEntry[];
  eventEntries: WaitlistEntry[];
  events: EventSummary[];
}) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || "");
  const [platformFilter, setPlatformFilter] = useState<"all" | "stall" | "general">("all");

  // Filter platform entries based on sub-tabs
  const filteredPlatform = platformEntries.filter((e) => {
    if (platformFilter === "stall") return e.type === "STALL";
    if (platformFilter === "general") return e.type === "TICKET";
    return true;
  });

  // Filter event entries dynamically by selected event
  const activeEventEntries = eventEntries.filter((e) => e.eventId === selectedEventId);
  const waitingEventCount = activeEventEntries.filter((e) => !e.notifiedAt).length;

  // Platform columns
  const platformColumns: ColumnDef<WaitlistEntry>[] = [
    {
      accessorKey: "phone",
      header: "WhatsApp Number",
      cell: ({ row }) => <span className="font-medium tabular-nums">{row.original.phone || row.original.contact || "—"}</span>,
    },
    {
      id: "interestedInStall",
      header: "Stall Interest",
      cell: ({ row }) =>
        row.original.type === "STALL" ? (
          <Badge variant="warning">Interested</Badge>
        ) : (
          <Badge variant="neutral">Not interested</Badge>
        ),
    },
    {
      id: "createdAt",
      header: "Signed up",
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{fmt(row.original.createdAt)}</span>,
    },
  ];

  // Event columns
  const eventColumns: ColumnDef<WaitlistEntry>[] = [
    {
      accessorKey: "contact",
      header: "Contact Info",
      cell: ({ row }) => <span className="font-medium">{row.original.contact || "—"}</span>,
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.original.type === "STALL" ? "warning" : "primary"}>
          {row.original.type.toLowerCase()}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.notifiedAt ? (
          <Badge variant="success">Notified</Badge>
        ) : (
          <Badge variant="warning">Waiting</Badge>
        ),
    },
    {
      id: "createdAt",
      header: "Signed up",
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{fmt(row.original.createdAt)}</span>,
    },
  ];

  // All entries columns
  const allColumns: ColumnDef<WaitlistEntry>[] = [
    {
      accessorKey: "contact",
      header: "Contact Info",
      cell: ({ row }) => <span className="font-medium">{row.original.phone || row.original.contact || "—"}</span>,
    },
    {
      id: "source",
      header: "Source / Event",
      cell: ({ row }) => {
        const isPlatform = row.original.source === "PLATFORM";
        return (
          <div className="flex items-center gap-2">
            <Badge variant={isPlatform ? "neutral" : "primary"}>
              {isPlatform ? "Platform" : "Event"}
            </Badge>
            {!isPlatform && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {row.original.event?.name || "Event"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.original.type === "STALL" ? "warning" : "primary"}>
          {row.original.type.toLowerCase()}
        </Badge>
      ),
    },
    {
      id: "createdAt",
      header: "Signed up",
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{fmt(row.original.createdAt)}</span>,
    },
  ];

  // Unified list for the "All Entries" tab
  const allEntries = [...platformEntries, ...eventEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const exportPlatformCsv = () => {
    const csv = [
      "phone,interestedInStall,signedUpAt",
      ...filteredPlatform.map(
        (e) =>
          `"${e.phone || e.contact || ""}",${e.type === "STALL"},"${new Date(e.createdAt).toISOString()}"`
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `platform-waitlist-${platformFilter}.csv`;
    a.click();
  };

  return (
    <Tabs defaultValue="platform" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
        <TabsTrigger value="platform">Platform Waitlist</TabsTrigger>
        <TabsTrigger value="event">Event Waitlist</TabsTrigger>
        <TabsTrigger value="all">All Entries</TabsTrigger>
      </TabsList>

      {/* PLATFORM WAITLIST TAB */}
      <TabsContent value="platform" className="space-y-4 outline-none">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            {(["all", "stall", "general"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPlatformFilter(f)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  platformFilter === f
                    ? "bg-foreground text-background border-foreground font-medium"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all"
                  ? `All (${platformEntries.length})`
                  : f === "stall"
                  ? `Stall interest (${platformEntries.filter((e) => e.type === "STALL").length})`
                  : `General (${platformEntries.filter((e) => e.type === "TICKET").length})`}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportPlatformCsv}>
            Export CSV
          </Button>
        </div>

        <DataTable
          columns={platformColumns}
          data={filteredPlatform}
          searchable={filteredPlatform.length > 5}
          searchPlaceholder="Search by number…"
          emptyMessage="No platform waitlist entries found."
        />
      </TabsContent>

      {/* EVENT WAITLIST TAB */}
      <TabsContent value="event" className="space-y-4 outline-none">
        <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Select Event:</span>
            <Select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-64"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </Select>
          </div>

          {selectedEventId && waitingEventCount > 0 && (
            <form action={notifyWaitlistAction}>
              <input type="hidden" name="eventId" value={selectedEventId} />
              <Button type="submit" size="sm" className="shadow-sm">
                Notify waiting guests ({waitingEventCount})
              </Button>
            </form>
          )}
        </div>

        <DataTable
          columns={eventColumns}
          data={activeEventEntries}
          searchable={activeEventEntries.length > 5}
          searchPlaceholder="Search waitlist…"
          emptyMessage="No one on the waitlist for this event."
        />
      </TabsContent>

      {/* ALL ENTRIES TAB */}
      <TabsContent value="all" className="space-y-4 outline-none">
        <DataTable
          columns={allColumns}
          data={allEntries}
          searchable={allEntries.length > 5}
          searchPlaceholder="Search all signups…"
          emptyMessage="No waitlist entries found."
        />
      </TabsContent>
    </Tabs>
  );
}
