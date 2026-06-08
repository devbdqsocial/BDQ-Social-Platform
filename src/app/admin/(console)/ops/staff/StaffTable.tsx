"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { listStaff } from "@/server/staff/service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeStaffAction } from "./actions";
import type { Role } from "@/server/auth/guard";

type Row = Awaited<ReturnType<typeof listStaff>>[number];

const perm = (p: string) => {
  const map: Record<string, string> = {
    CHECKIN: "Check-In",
    VENDOR_MANAGE: "Vendor Manage",
    VENDOR_VIEW: "Vendor View",
    EVENT_VIEW: "Event View",
    CUSTOMER_VIEW: "Customer View",
    PAYMENT_VIEW: "Payment View",
    TICKETS_MANAGE: "Tickets Manage",
  };
  return map[p] ?? p;
};

interface StaffTableProps {
  staff: Row[];
  currentUserRole: Role;
}

/**
 * Renders a data table showing all staff members, their roles, and their direct custom permissions.
 * It dynamically resolves the action column: only a SUPER_ADMIN is permitted to disable other ADMIN accounts,
 * whereas standard ADMINs are restricted to only removing access for STAFF accounts.
 */
export function StaffTable({ staff, currentUserRole }: StaffTableProps) {
  const columns = useMemo<ColumnDef<Row>[]>(() => [
    {
      id: "name",
      accessorFn: (r) => `${r.name ?? ""} ${r.email}`,
      header: "Teammate",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name ?? row.original.email}</span>
          {!row.original.active && <Badge variant="neutral">No access</Badge>}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role;
        if (role === "SUPER_ADMIN") return <Badge variant="gold">Super Admin</Badge>;
        if (role === "ADMIN") return <Badge variant="primary">Admin</Badge>;
        return <Badge variant="neutral">Staff</Badge>;
      },
    },
    {
      id: "permissions",
      header: "Permissions",
      enableSorting: false,
      cell: ({ row }) => {
        if (row.original.role === "ADMIN" || row.original.role === "SUPER_ADMIN") {
          return <span className="text-muted-foreground italic text-xs">All permissions (unrestricted)</span>;
        }
        return row.original.permissions.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.original.permissions.map((p) => (
              <Badge key={p} variant="primary">
                {perm(p)}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const targetUserRole = row.original.role;
        const isTargetAdminOrSuper = targetUserRole === "ADMIN" || targetUserRole === "SUPER_ADMIN";
        
        // Privilege boundary check: Standard ADMINs are forbidden from disabling other ADMINs or SUPER_ADMINs.
        const canRemove = currentUserRole === "SUPER_ADMIN" || !isTargetAdminOrSuper;

        if (!row.original.active || !canRemove) return null;

        return (
          <form action={removeStaffAction}>
            <input type="hidden" name="id" value={row.original.id} />
            <Button type="submit" variant="ghost" size="sm">
              Remove access
            </Button>
          </form>
        );
      },
    },
  ], [currentUserRole]);

  return <DataTable columns={columns} data={staff} searchable={staff.length > 6} searchPlaceholder="Search teammates…" emptyMessage="No teammates yet." />;
}

