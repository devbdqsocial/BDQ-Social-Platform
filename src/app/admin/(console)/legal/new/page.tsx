import type { Metadata } from "next";
import { requireAdminRole } from "@/server/auth/guard";
import { LEGAL_DOC_CATEGORIES, LEGAL_DOC_AUDIENCES } from "@/server/schemas";
import { CATEGORY_LABEL, AUDIENCE_LABEL } from "@/components/admin/legal/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createLegalDocAction } from "../actions";

export const metadata: Metadata = { title: "New document" };

export default async function AdminLegalNewPage() {
  await requireAdminRole();
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="New document" description="Create a document, then write its sections in the editor." />
      <Card asChild>
        <form action={createLegalDocAction}>
          <CardHeader>
            <CardTitle className="text-base">Document details</CardTitle>
            <CardDescription>The slug becomes the public URL (/legal/&lt;slug&gt;) once published.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2"><Input name="title" required maxLength={160} placeholder="Parking & Access Policy" /></Field>
            <Field label="Slug" hint="Lowercase letters, digits, dashes" className="sm:col-span-2"><Input name="slug" required maxLength={80} pattern="[a-z0-9][a-z0-9-]*" placeholder="parking-policy" /></Field>
            <Field label="Category">
              <Select name="category" defaultValue="OTHER">
                {LEGAL_DOC_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </Select>
            </Field>
            <Field label="Audience" hint="Who sees it once published">
              <Select name="audience" defaultValue="PUBLIC">
                {LEGAL_DOC_AUDIENCES.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
              </Select>
            </Field>
            <Button type="submit" className="w-fit sm:col-span-2">Create & open editor</Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
