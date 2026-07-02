"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { fmtDate as fmt } from "@/lib/date-formats";
import type { listCampaigns } from "@/server/campaigns/service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { sendCampaignAction } from "./actions";

type Row = Awaited<ReturnType<typeof listCampaigns>>[number];

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Campaign", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: "channel", accessorFn: (r) => r.channel, header: "Channel", cell: ({ row }) => <span className="text-muted-foreground">{row.original.channel === "EMAIL" ? "Email" : "WhatsApp"}</span> },
  { id: "audience", accessorFn: (r) => r.audience, header: "Audience", cell: ({ row }) => (row.original.audience === "BUYERS" ? "Ticket buyers" : "All customers") },
  { id: "status", accessorFn: (r) => r.status, header: "Status", cell: ({ row }) => <Badge variant={row.original.status === "COMPLETED" ? "success" : "neutral"}>{row.original.status}</Badge> },
  { id: "sent", accessorFn: (r) => r.sentCount, header: "Sent", cell: ({ row }) => (row.original.status === "COMPLETED" ? row.original.sentCount : "—") },
  { id: "created", accessorFn: (r) => r.createdAt.getTime(), header: "Created", cell: ({ row }) => <span className="text-muted-foreground">{fmt(row.original.createdAt)}</span> },
  {
    id: "actions", header: "", enableSorting: false,
    cell: ({ row }) => (row.original.status === "DRAFT" && row.original.channel === "EMAIL" ? (
      <ConfirmButton
        trigger={<Button type="button" size="sm">Send</Button>}
        title={`Send “${row.original.name}” now?`}
        description="This emails real customers in its audience immediately."
        confirmLabel="Send campaign"
        confirmVariant="default"
        onConfirm={() => {
          const fd = new FormData();
          fd.set("id", row.original.id);
          void sendCampaignAction(fd);
        }}
      />
    ) : null),
  },
];

export function CampaignsTable({ campaigns }: { campaigns: Row[] }) {
  return <DataTable columns={columns} data={campaigns} searchable={campaigns.length > 6} searchPlaceholder="Search campaigns…" emptyMessage="No campaigns yet — create a draft above." />;
}
