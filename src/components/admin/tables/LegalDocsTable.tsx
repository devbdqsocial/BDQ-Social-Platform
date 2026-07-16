"use client";

import * as React from "react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye, EyeOff, Rocket, Archive, ArchiveRestore, Trash2, ExternalLink } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DeleteDocDialog } from "@/components/admin/legal/DeleteDocDialog";
import { setDocStatusAction } from "@/app/admin/(console)/legal/actions";
import { fmtDate, fmtRelative } from "@/lib/date-formats";
import type { LegalDocStatus } from "@prisma/client";

export type LegalDocRow = {
  id: string;
  slug: string;
  title: string;
  path: string;
  categoryLabel: string;
  audienceLabel: string;
  status: LegalDocStatus;
  version: string;
  updatedAt: Date;
  assignments: number;
  wellKnown: boolean;
};

const STATUS_BADGE: Record<LegalDocStatus, { variant: "warning" | "success" | "neutral"; label: string }> = {
  DRAFT: { variant: "warning", label: "Draft" },
  PUBLISHED: { variant: "success", label: "Published" },
  ARCHIVED: { variant: "neutral", label: "Archived" },
};

function IconTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function LegalDocRowActions({ doc }: { doc: LegalDocRow }) {
  const [pending, startTransition] = useTransition();

  const setStatus = (status: LegalDocStatus, ok: string) =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", doc.id);
      fd.set("status", status);
      const res = await setDocStatusAction(fd);
      if (res.ok) toast.success(ok);
      else toast.error(res.error.message ?? "Couldn't update — try again.");
    });

  return (
    <div className="flex items-center justify-end gap-0.5">
      <IconTip label="Edit">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/admin/legal/${doc.slug}`} aria-label="Edit document"><Pencil className="size-4" /></Link>
        </Button>
      </IconTip>

      <IconTip label="Preview with sample values">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/admin/legal/${doc.slug}/preview`} aria-label="Preview document"><Eye className="size-4" /></Link>
        </Button>
      </IconTip>

      {doc.status === "PUBLISHED" && (
        <IconTip label="Open public page">
          <Button asChild variant="ghost" size="icon-sm">
            <a href={doc.path} target="_blank" rel="noopener noreferrer" aria-label="Open public page"><ExternalLink className="size-4" /></a>
          </Button>
        </IconTip>
      )}

      {doc.status === "DRAFT" && (
        <IconTip label="Publish">
          <Button variant="ghost" size="icon-sm" disabled={pending} onClick={() => setStatus("PUBLISHED", "Published — it's live now")} aria-label="Publish document">
            <Rocket className="size-4" />
          </Button>
        </IconTip>
      )}

      {doc.status === "PUBLISHED" && (
        <ConfirmButton
          title="Unpublish this document?"
          description="Its page stops showing this content until you publish again."
          confirmLabel="Unpublish"
          confirmVariant="default"
          onConfirm={() => setStatus("DRAFT", "Unpublished — back to draft")}
          pending={pending}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Unpublish document" title="Unpublish"><EyeOff className="size-4" /></Button>
          }
        />
      )}

      {doc.status === "ARCHIVED" ? (
        <IconTip label="Restore as draft">
          <Button variant="ghost" size="icon-sm" disabled={pending} onClick={() => setStatus("DRAFT", "Restored as draft")} aria-label="Restore document">
            <ArchiveRestore className="size-4" />
          </Button>
        </IconTip>
      ) : (
        <ConfirmButton
          title="Archive this document?"
          description="It's unpublished and tucked away in the library. You can restore it anytime."
          confirmLabel="Archive"
          confirmVariant="default"
          onConfirm={() => setStatus("ARCHIVED", "Archived")}
          pending={pending}
          trigger={
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" aria-label="Archive document" title="Archive">
              <Archive className="size-4" />
            </Button>
          }
        />
      )}

      <DeleteDocDialog
        doc={doc}
        trigger={
          <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Delete document">
            <Trash2 className="size-4" />
          </Button>
        }
      />
    </div>
  );
}

const columns: ColumnDef<LegalDocRow>[] = [
  {
    accessorKey: "title",
    header: "Document",
    cell: ({ row }) => (
      <div>
        <Link href={`/admin/legal/${row.original.slug}`} className="font-medium hover:underline">{row.original.title}</Link>
        <div className="text-xs text-muted-foreground">{row.original.path}</div>
      </div>
    ),
  },
  { id: "category", accessorFn: (r) => r.categoryLabel, header: "Category", cell: ({ row }) => <Badge variant="neutral">{row.original.categoryLabel}</Badge> },
  { id: "audience", accessorFn: (r) => r.audienceLabel, header: "Audience", cell: ({ row }) => <span className="text-muted-foreground">{row.original.audienceLabel}</span> },
  {
    id: "status", accessorFn: (r) => r.status, header: "Status",
    cell: ({ row }) => <Badge variant={STATUS_BADGE[row.original.status].variant}>{STATUS_BADGE[row.original.status].label}</Badge>,
  },
  { accessorKey: "version", header: "Version" },
  {
    id: "updated", accessorFn: (r) => r.updatedAt.getTime(), header: "Updated",
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        <div>{fmtDate(row.original.updatedAt)}</div>
        <div className="text-xs">{fmtRelative(row.original.updatedAt)}</div>
      </div>
    ),
  },
  { id: "events", accessorFn: (r) => r.assignments, header: "Events", cell: ({ row }) => (row.original.assignments ? row.original.assignments : <span className="text-muted-foreground">—</span>) },
  { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <LegalDocRowActions doc={row.original} /> },
];

export function LegalDocsTable({ docs }: { docs: LegalDocRow[] }) {
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  const categories = React.useMemo(() => Array.from(new Set(docs.map((d) => d.categoryLabel))), [docs]);
  const filtered = categoryFilter === "all" ? docs : docs.filter((d) => d.categoryLabel === categoryFilter);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {categories.length > 1 && (
          <ToggleGroup
            type="single"
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v || "all")}
            variant="outline"
            size="sm"
            className="flex-wrap"
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            {categories.map((c) => (
              <ToggleGroupItem key={c} value={c}>{c}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Search documents…"
          emptyMessage={
            <span>
              No documents yet — <Link href="/admin/legal/new" className="text-primary hover:underline">create your first one</Link> or run the legal seed.
            </span>
          }
        />
      </div>
    </TooltipProvider>
  );
}
