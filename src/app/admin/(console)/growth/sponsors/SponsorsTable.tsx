"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { listSponsors, SponsorWithFinance } from "@/server/sponsors/service";
import Image from "next/image";
import Link from "next/link";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSponsorAction } from "./actions";
import { formatPaise } from "@/lib/utils";

type Row = SponsorWithFinance;
const tierLabel = (t: string) => t.toLowerCase().replace(/_/g, " ");

const STATUS_VARIANT = {
  PROPOSED: "neutral",
  SIGNED: "warning",
  PAID: "success",
} as const;

interface SponsorsTableProps {
  sponsors: Row[];
  hasFinance: boolean;
  activeEventId?: string;
}

export function SponsorsTable({ sponsors, hasFinance, activeEventId }: SponsorsTableProps) {
  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const cols: ColumnDef<Row>[] = [
      {
        id: "logo",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.logoUrl ? (
            <Image
              src={row.original.logoUrl}
              alt=""
              width={80}
              height={28}
              className="h-7 w-auto max-w-20 rounded object-contain"
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "name",
        header: "Sponsor",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "tier",
        accessorFn: (r) => r.tier,
        header: "Tier",
        cell: ({ row }) => <Badge variant="neutral">{tierLabel(row.original.tier)}</Badge>,
      },
    ];

    if (hasFinance) {
      cols.push(
        {
          id: "amount",
          header: "Deal Amount",
          cell: ({ row }) => <span>{formatPaise(row.original.amountPaise)}</span>,
        },
        {
          id: "status",
          header: "Payment Status",
          cell: ({ row }) => (
            <Badge variant={STATUS_VARIANT[row.original.status] || "neutral"}>
              {row.original.status}
            </Badge>
          ),
        },
        {
          id: "note",
          header: "Note",
          cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">{row.original.note ?? "—"}</span>
          ),
        }
      );
    }

    cols.push({
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/sponsors?eventId=${activeEventId || ""}&editId=${row.original.id}`}>
              Edit
            </Link>
          </Button>
          <form action={deleteSponsorAction}>
            <input type="hidden" name="id" value={row.original.id} />
            <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              Remove
            </Button>
          </form>
        </div>
      ),
    });

    return cols;
  }, [hasFinance, activeEventId]);

  return (
    <DataTable
      columns={columns}
      data={sponsors}
      searchable={sponsors.length > 6}
      searchPlaceholder="Search sponsors…"
      emptyMessage="No sponsors for this event yet."
    />
  );
}
