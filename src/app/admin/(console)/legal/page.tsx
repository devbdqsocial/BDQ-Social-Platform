import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminRole } from "@/server/auth/guard";
import { listDocsForAdmin } from "@/server/legal/docs";
import { WELL_KNOWN_SLUGS, pathForSlug } from "@/lib/legal-docs";
import { CATEGORY_LABEL, AUDIENCE_LABEL } from "@/components/admin/legal/labels";
import { LegalDocsTable, type LegalDocRow } from "@/components/admin/tables/LegalDocsTable";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Documents & Legal" };

export default async function AdminLegalPage() {
  await requireAdminRole();
  const docs = await listDocsForAdmin();

  const rows: LegalDocRow[] = docs.map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    path: pathForSlug(d.slug),
    categoryLabel: CATEGORY_LABEL[d.category],
    audienceLabel: AUDIENCE_LABEL[d.audience],
    status: d.status,
    version: d.version,
    updatedAt: d.updatedAt,
    assignments: d._count.assignments,
    wellKnown: WELL_KNOWN_SLUGS.includes(d.slug),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Document Library"
          description="Contracts, rules, policies and legal pages. Published documents reflect on the customer and vendor sites immediately."
        />
        <div className="flex gap-2">
          <Button asChild size="sm"><Link href="/admin/legal/new">New document</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/admin/legal/assignments">Event assignments</Link></Button>
        </div>
      </div>
      <LegalDocsTable docs={rows} />
    </div>
  );
}
