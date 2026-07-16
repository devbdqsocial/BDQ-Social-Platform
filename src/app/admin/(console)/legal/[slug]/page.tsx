import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { getDocBySlugForAdmin, parseSections } from "@/server/legal/docs";
import { WELL_KNOWN_SLUGS, pathForSlug } from "@/lib/legal-docs";
import { LEGAL_DOC_CATEGORIES, LEGAL_DOC_AUDIENCES } from "@/server/schemas";
import { CATEGORY_LABEL, AUDIENCE_LABEL } from "@/components/admin/legal/labels";
import { RichDocEditor } from "@/components/admin/legal/RichDocEditor";
import { LegalDocHeaderActions } from "@/components/admin/legal/LegalDocHeaderActions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/date-formats";
import { updateLegalDocAction } from "../actions";

export const metadata: Metadata = { title: "Edit document" };

export default async function AdminLegalEditPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminRole();
  const { slug } = await params;
  const doc = await getDocBySlugForAdmin(slug);
  if (!doc) notFound();
  const wellKnown = WELL_KNOWN_SLUGS.includes(doc.slug);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <PageHeader title={doc.title} description={`${pathForSlug(doc.slug)} · ${doc.version} · ${AUDIENCE_LABEL[doc.audience]}`} />
          <Badge variant={doc.status === "PUBLISHED" ? "success" : doc.status === "DRAFT" ? "warning" : "neutral"} className="mt-1.5">
            {doc.status.toLowerCase()}
          </Badge>
        </div>
        <LegalDocHeaderActions doc={{ id: doc.id, slug: doc.slug, title: doc.title, status: doc.status, wellKnown, assignments: doc._count.assignments }} />
      </div>

      {doc.status === "PUBLISHED" && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          This document is <strong>live</strong> — saving changes publishes them immediately and bumps the version.
        </p>
      )}

      <form action={updateLegalDocAction} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <input type="hidden" name="id" value={doc.id} />
        {/* Direct import (no next/dynamic): the route's own chunk already isolates Tiptap to this
            page, and the extra dynamic indirection broke chunk loading under Turbopack. The editor
            is SSR-safe via immediatelyRender:false. */}
        <RichDocEditor
          initialSections={parseSections(doc.sections)}
          saveLabel={doc.status === "PUBLISHED" ? "Save & publish changes" : "Save"}
        />
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Title"><Input name="title" required maxLength={160} defaultValue={doc.title} /></Field>
            <Field label="Category">
              <Select name="category" defaultValue={doc.category}>
                {LEGAL_DOC_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </Select>
            </Field>
            <Field label="Audience">
              <Select name="audience" defaultValue={doc.audience}>
                {LEGAL_DOC_AUDIENCES.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
              </Select>
            </Field>
            <dl className="space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
              <div className="flex justify-between gap-2"><dt>Public URL</dt><dd className="truncate">{pathForSlug(doc.slug)}</dd></div>
              <div className="flex justify-between gap-2"><dt>Version</dt><dd>{doc.version}</dd></div>
              <div className="flex justify-between gap-2"><dt>First published</dt><dd>{doc.publishedAt ? fmtDate(doc.publishedAt) : "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt>Event assignments</dt><dd>{doc._count.assignments || "—"}</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Use <strong>Heading</strong> in the editor to start a new section; use <strong>Merge field</strong> for values filled in
              automatically (event, vendor, fees…).
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
