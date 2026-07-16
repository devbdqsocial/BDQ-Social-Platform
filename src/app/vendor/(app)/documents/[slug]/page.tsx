import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireVendor } from "@/server/auth/guard";
import { getPublishedDoc, parseSections } from "@/server/legal/docs";
import { mergeSections } from "@/server/legal/tokens";
import { fmtDateFull } from "@/lib/date-formats";
import { DocSectionsView } from "@/components/legal/DocSections";
import { VendorPageHeader } from "@/components/vendor/VendorPageHeader";

export const metadata: Metadata = { title: "Document" };
export const dynamic = "force-dynamic";

/** Vendor-authed doc viewer — the only route where VENDOR-audience docs render (never public). */
export default async function VendorDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireVendor();
  const { slug } = await params;
  const doc = await getPublishedDoc(slug);
  if (!doc || (doc.audience !== "PUBLIC" && doc.audience !== "VENDOR")) notFound();

  const { sections } = mergeSections(parseSections(doc.sections), { doc: { version: doc.version } });

  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-2xl)]">
      <VendorPageHeader kicker="Documents" title={doc.title} description={`Last updated ${fmtDateFull(doc.updatedAt)} · ${doc.version}`} />
      <div className="f-paragraph-small [&_a]:underline [&_h2]:mt-[var(--space-xl)] [&_h2]:font-bold [&_h2]:first:mt-0 [&_li]:mb-[var(--space-2xs)] [&_li]:opacity-80 [&_ol]:mt-[var(--space-sm)] [&_ol]:list-decimal [&_ol]:pl-[var(--space-lg)] [&_p]:mt-[var(--space-sm)] [&_p]:opacity-80 [&_strong]:font-bold [&_ul]:mt-[var(--space-sm)] [&_ul]:list-disc [&_ul]:pl-[var(--space-lg)]">
        <DocSectionsView sections={sections} />
      </div>
    </div>
  );
}
