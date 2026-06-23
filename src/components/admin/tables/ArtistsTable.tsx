"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { listArtists } from "@/server/artists/admin-service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { fmtDate } from "@/lib/date-formats";
import { ARTIST_TYPES } from "@/server/schemas";

type Row = Awaited<ReturnType<typeof listArtists>>[number];

const rupees = (paise: number | null) => (paise == null ? "—" : `₹${(paise / 100).toLocaleString("en-IN")}`);
const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const columns: ColumnDef<Row>[] = [
  { accessorKey: "stageName", header: "Artist", cell: ({ row }) => <span className="font-medium">{row.original.stageName}</span> },
  { id: "type", accessorFn: (r) => r.type, header: "Type", cell: ({ row }) => titleCase(row.original.type) },
  { id: "genre", accessorFn: (r) => r.genre ?? "", header: "Genre", cell: ({ row }) => row.original.genre ?? "—" },
  { id: "city", accessorFn: (r) => r.city ?? "", header: "City", cell: ({ row }) => row.original.city ?? "—" },
  { id: "fee", accessorFn: (r) => r.askingFeePaise ?? 0, header: "Rate card", cell: ({ row }) => rupees(row.original.askingFeePaise) },
  { id: "bookings", accessorFn: (r) => r._count.bookings, header: "Bookings" },
  {
    id: "status", accessorFn: (r) => (r.archived ? "Archived" : "Active"), header: "Status",
    cell: ({ row }) => <Badge variant={row.original.archived ? "neutral" : "success"}>{row.original.archived ? "Archived" : "Active"}</Badge>,
  },
  { id: "added", accessorFn: (r) => r.createdAt.getTime(), header: "Added", cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.createdAt)}</span> },
];

export function ArtistsTable({ artists }: { artists: Row[] }) {
  const router = useRouter();
  const [type, setType] = useState("ALL");
  const data = useMemo(() => (type === "ALL" ? artists : artists.filter((a) => a.type === type)), [artists, type]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-44">
          <option value="ALL">All types</option>
          {ARTIST_TYPES.map((t) => (
            <option key={t} value={t}>{titleCase(t)}</option>
          ))}
        </Select>
      </div>
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Search artist or genre…"
        onRowClick={(r) => router.push(`/admin/artists/${r.id}`)}
        emptyMessage="No artists yet."
      />
    </div>
  );
}
