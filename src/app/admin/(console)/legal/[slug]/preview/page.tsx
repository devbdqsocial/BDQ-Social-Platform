import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { getDocBySlugForAdmin, parseSections } from "@/server/legal/docs";
import { mergeSections, SAMPLE_TOKEN_CONTEXT } from "@/server/legal/tokens";
import { DocSectionsView } from "@/components/legal/DocSections";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Preview document" };

export default async function AdminLegalPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminRole();
  const { slug } = await params;
  const doc = await getDocBySlugForAdmin(slug);
  if (!doc) notFound();

  const { sections, missing } = mergeSections(parseSections(doc.sections), SAMPLE_TOKEN_CONTEXT);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={`Preview: ${doc.title}`} description="Rendered with sample merge values (vendor, event, stall, fee)." />
        <Button asChild size="sm" variant="outline"><Link href={`/admin/legal/${doc.slug}`}>Back to editor</Link></Button>
      </div>
      {missing.length > 0 && (
        <p className="mx-auto w-full max-w-3xl rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          These tokens have no sample value and rendered as their fallback phrase: {missing.map((t) => `{{${t}}}`).join(", ")}
        </p>
      )}
      <Card className="mx-auto w-full max-w-3xl">
        <CardContent className="pt-6 text-sm [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:first:mt-0 [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5">
          <DocSectionsView sections={sections} />
        </CardContent>
      </Card>
    </div>
  );
}
