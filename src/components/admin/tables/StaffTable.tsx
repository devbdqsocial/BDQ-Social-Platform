"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { listStaff } from "@/server/staff/service";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { StaffRowActions } from "@/components/admin/tables/StaffRowActions";
import { permissionShort } from "@/lib/permissions";
import type { Role } from "@/server/auth/guard";

type Row = Awaited<ReturnType<typeof listStaff>>[number];

interface StaffTableProps {
  staff: Row[];
  currentUserRole: Role;
}

/**
 * Team table: each teammate's role, permissions, setup status, and inline per-row actions.
 * "Pending setup" = the account exists but no password is set yet (invited-but-not-accepted, or
 * access removed) — those rows are still fully manageable (resend invite, edit, remove).
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
          {row.original.active ? (
            row.original.totpEnabled && <Badge variant="success">2FA on</Badge>
          ) : (
            <Badge variant="warning">Pending setup</Badge>
          )}
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
        if (role === "SUPER_ADMIN") return <Badge variant="primary">Super Admin</Badge>;
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
              <Badge key={p} variant="primary">{permissionShort(p)}</Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => <StaffRowActions user={row.original} currentUserRole={currentUserRole} />,
    },
  ], [currentUserRole]);

  return <DataTable columns={columns} data={staff} searchable={staff.length > 6} searchPlaceholder="Search teammates…" emptyMessage="No teammates yet." />;
}
