import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { getPublishedDoc } from "@/server/legal/docs";
import { isLegacyLegalSlug } from "@/lib/legal-docs";

export const revalidate = 3600;

/** Net-new published PUBLIC documents. The nine legacy docs keep their canonical /<slug> URLs. */
async function docFor(slug: string) {
  if (isLegacyLegalSlug(slug)) return null;
  const doc = await getPublishedDoc(slug);
  return doc && doc.audience === "PUBLIC" ? doc : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = await docFor((await params).slug);
  return { title: doc?.title ?? "Legal" };
}

export default async function LegalDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const doc = await docFor((await params).slug);
  if (!doc) notFound();
  return <LegalDocView doc={doc} />;
}
