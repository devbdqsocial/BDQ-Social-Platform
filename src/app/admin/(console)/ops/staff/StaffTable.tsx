"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { listStaff } from "@/server/staff/service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeStaffAction } from "./actions";

type Row = Awaited<ReturnType<typeof listStaff>>[number];
const perm = (p: string) => p.toLowerCase().replace(/_/g, " ");

const columns: ColumnDef<Row>[] = [
  {
    id: "name", accessorFn: (r) => `${r.name ?? ""} ${r.email}`, header: "Teammate",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.name ?? row.original.email}</span>
        {!row.original.active && <Badge variant="neutral">No access</Badge>}
      </div>
    ),
  },
  { accessorKey: "email", header: "Email", cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span> },
  {
    id: "permissions", header: "Permissions", enableSorting: false,
    cell: ({ row }) => (
      row.original.permissions.length === 0
        ? <span className="text-muted-foreground">—</span>
        : <div className="flex flex-wrap gap-1">{row.original.permissions.map((p) => <Badge key={p} variant="primary">{perm(p)}</Badge>)}</div>
    ),
  },
  {
    id: "actions", header: "", enableSorting: false,
    cell: ({ row }) => (row.original.active ? (
      <form action={removeStaffAction}>
        <input type="hidden" name="id" value={row.original.id} />
        <Button type="submit" variant="ghost" size="sm">Remove access</Button>
      </form>
    ) : null),
  },
];

export function StaffTable({ staff }: { staff: Row[] }) {
  return <DataTable columns={columns} data={staff} searchable={staff.length > 6} searchPlaceholder="Search teammates…" emptyMessage="No teammates yet." />;
}
