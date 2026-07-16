import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { getPublishedDoc } from "@/server/legal/docs";
import { LEGAL } from "@/lib/legal";
import { agreementSections, CONTRACT_VERSION } from "@/server/contracts/agreement";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Vendor Agreement" };

export default async function VendorAgreementPage() {
  // Unsigned template view: tokens fall back to their generic phrases ("the Vendor", …).
  const doc = await getPublishedDoc("vendor-agreement");
  if (doc) return <LegalDocView doc={doc} />;
  return <Fallback />;
}

/** Pre-seed / empty-DB fallback — the original code-generated agreement. */
function Fallback() {
  const sections = agreementSections({ brandName: "the Vendor" });
  return (
    <LegalPage title="Vendor Participation Agreement" updated={`${LEGAL.lastUpdated} · ${CONTRACT_VERSION}`}>
      <p>
        This is the standard agreement every approved vendor signs to participate at a {LEGAL.brand} market.
        When you sign during onboarding, a copy with your details and signature is generated as a PDF for your records.
      </p>
      {sections.map((s, i) => (
        <div key={i}>
          <h2>{s.heading}</h2>
          {s.body.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
        </div>
      ))}
    </LegalPage>
  );
}
