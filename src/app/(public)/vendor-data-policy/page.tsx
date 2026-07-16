import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { getPublishedDoc } from "@/server/legal/docs";
import { LEGAL } from "@/lib/legal";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Vendor Data & Leads Policy" };

export default async function VendorDataPolicyPage() {
  const doc = await getPublishedDoc("vendor-data-policy");
  if (doc) return <LegalDocView doc={doc} />;
  return <Fallback />;
}

/** Pre-seed / empty-DB fallback — the original hardcoded page. */
function Fallback() {
  return (
    <LegalPage title="Vendor Data & Leads Policy" updated={LEGAL.lastUpdated}>
      <p>
        This policy covers how you may collect and use customer contact details at a {LEGAL.brand} market —
        including details captured through our lead-capture QR — in line with India&apos;s Digital Personal Data
        Protection Act, 2023 (DPDP).
      </p>

      <h2>You are the data fiduciary</h2>
      <p>
        Any customer data you collect is yours to control and yours to safeguard. {LEGAL.brand} provides the
        lead-capture tool as a convenience; we are not responsible for how you use the data you collect.
      </p>

      <h2>Consent &amp; lawful use</h2>
      <ul>
        <li>Collect contact details only with the customer&apos;s clear, informed consent.</li>
        <li>Tell customers who you are and why you&apos;re collecting their details before they share them.</li>
        <li>Use the data only for the purpose disclosed (e.g. updates about your brand) — no onward sale or spam.</li>
        <li>Honour opt-outs promptly and stop contacting anyone who asks you to.</li>
      </ul>

      <h2>Security &amp; retention</h2>
      <ul>
        <li>Keep customer data secure and access-controlled; do not share it with unrelated third parties.</li>
        <li>Retain it only as long as needed for the disclosed purpose, then delete it.</li>
        <li>Comply with any data-deletion or access request a customer makes to you.</li>
      </ul>

      <h2>Indemnity</h2>
      <p>
        You indemnify {LEGAL.entity} against any claim, fine, or loss arising from your collection or use of
        customer data, including any breach of the DPDP Act or misuse of the lead-capture tool.
      </p>

      <p>
        Grievances regarding data may be raised with {LEGAL.grievanceOfficer} at{" "}
        <a href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</a>.
      </p>
    </LegalPage>
  );
}
