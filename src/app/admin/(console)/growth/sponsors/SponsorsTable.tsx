"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { listSponsors } from "@/server/sponsors/service";
import Image from "next/image";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSponsorAction } from "./actions";

type Row = Awaited<ReturnType<typeof listSponsors>>[number];
const tierLabel = (t: string) => t.toLowerCase().replace(/_/g, " ");

const columns: ColumnDef<Row>[] = [
  {
    id: "logo", header: "", enableSorting: false,
    cell: ({ row }) => row.original.logoUrl
      ? <Image src={row.original.logoUrl} alt="" width={80} height={28} className="h-7 w-auto max-w-20 rounded object-contain" />
      : <span className="text-muted-foreground">—</span>,
  },
  { accessorKey: "name", header: "Sponsor", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: "tier", accessorFn: (r) => r.tier, header: "Tier", cell: ({ row }) => <Badge variant="neutral">{tierLabel(row.original.tier)}</Badge> },
  {
    id: "actions", header: "", enableSorting: false,
    cell: ({ row }) => (
      <form action={deleteSponsorAction}>
        <input type="hidden" name="id" value={row.original.id} />
        <Button type="submit" variant="ghost" size="sm">Remove</Button>
      </form>
    ),
  },
];

export function SponsorsTable({ sponsors }: { sponsors: Row[] }) {
  return <DataTable columns={columns} data={sponsors} searchable={sponsors.length > 6} searchPlaceholder="Search sponsors…" emptyMessage="No sponsors for this event yet." />;
}
