"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { listVendors } from "@/server/vendors/admin-service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { fmtDate } from "@/lib/date-formats";
import { VENDOR_STATUS } from "@/lib/status-badges";

type Row = Awaited<ReturnType<typeof listVendors>>[number];

const columns: ColumnDef<Row>[] = [
  { accessorKey: "brandName", header: "Brand", cell: ({ row }) => <span className="font-medium">{row.original.brandName}</span> },
  { id: "category", accessorFn: (r) => r.category ?? "", header: "Category", cell: ({ row }) => row.original.category ?? "—" },
  {
    id: "status", accessorFn: (r) => r.approvalStatus, header: "Status",
    cell: ({ row }) => {
      const s = VENDOR_STATUS[row.original.approvalStatus];
      return s ? <Badge variant={s.variant}>{s.label}</Badge> : row.original.approvalStatus;
    },
  },
  { id: "stalls", accessorFn: (r) => r._count.bookings, header: "Stalls" },
  { id: "contact", accessorFn: (r) => r.user.phone ?? r.user.email ?? "", header: "Contact", cell: ({ row }) => row.original.user.phone ?? row.original.user.email ?? "—" },
  { id: "applied", accessorFn: (r) => r.createdAt.getTime(), header: "Applied", cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.createdAt)}</span> },
];

export function VendorsTable({ vendors }: { vendors: Row[] }) {
  const router = useRouter();
  const [status, setStatus] = useState("ALL");
  const data = useMemo(() => (status === "ALL" ? vendors : vendors.filter((v) => v.approvalStatus === status)), [vendors, status]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="ALL">All statuses</option>
          <option value="SUBMITTED">New</option>
          <option value="UNDER_REVIEW">Reviewing</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Declined</option>
        </Select>
      </div>
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Search brand or contact…"
        onRowClick={(r) => router.push(`/admin/vendors/${r.id}`)}
        emptyMessage="No vendors found."
      />
    </div>
  );
}
