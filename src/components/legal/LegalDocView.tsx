import type { LegalDocument } from "@prisma/client";
import { fmtDateFull } from "@/lib/date-formats";
import { parseSections } from "@/server/legal/docs";
import { mergeSections, type TokenContext } from "@/server/legal/tokens";
import { LegalPage } from "./LegalPage";
import { DocSectionsView } from "./DocSections";

/** Server component: renders an admin-managed LegalDocument inside the LegalPage prose shell,
 *  with {{token}}s merged (legal.* entity details always resolve; the rest fall back gracefully). */
export function LegalDocView({ doc, ctx }: { doc: LegalDocument; ctx?: TokenContext }) {
  const { sections } = mergeSections(parseSections(doc.sections), { doc: { version: doc.version }, ...ctx });
  return (
    <LegalPage title={doc.title} updated={`${fmtDateFull(doc.updatedAt)} · ${doc.version}`}>
      <DocSectionsView sections={sections} />
    </LegalPage>
  );
}
