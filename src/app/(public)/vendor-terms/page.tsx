import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { getPublishedDoc } from "@/server/legal/docs";
import { LEGAL } from "@/lib/legal";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Vendor Terms" };

export default async function VendorTermsPage() {
  const doc = await getPublishedDoc("vendor-terms");
  if (doc) return <LegalDocView doc={doc} />;
  return <Fallback />;
}

/** Pre-seed / empty-DB fallback — the original hardcoded page. */
function Fallback() {
  return (
    <LegalPage title="Vendor Terms" updated={LEGAL.lastUpdated}>
      <p>
        These Vendor Terms summarise the conditions for selling at {LEGAL.brand} markets and
        complement the binding contract you sign in your vendor dashboard. They are in addition to our
        general <a href="/terms">Terms &amp; Conditions</a>.
      </p>

      <h2>Approval</h2>
      <ul>
        <li>Registering does not guarantee a stall. Every vendor is reviewed and approved by our team, which includes a verification call-back.</li>
        <li>We may approve or decline applications at our discretion.</li>
      </ul>

      <h2>KYC (verify-only)</h2>
      <p>
        We collect business verification details (such as PAN and FSSAI where applicable) solely to
        verify vendors. We do not act as a tax collector and do not levy GST through the platform.
        Sensitive identifiers are encrypted at rest (see our <a href="/privacy">Privacy Policy</a>).
      </p>

      <h2>Stall booking &amp; payment</h2>
      <ul>
        <li>Stall prices are set per event. A stall is confirmed only after approval and successful payment.</li>
        <li>Only one active booking can exist per stall. Holds during payment are time-limited.</li>
        <li>Stall fees are <strong>final and non-refundable</strong> (see <a href="/refunds">Cancellation &amp; Refund Policy</a>).</li>
      </ul>

      <h2>Conduct</h2>
      <p>
        Vendors must comply with venue rules, applicable law, and any product/food-safety requirements,
        and must accurately represent their brand and products. We may revoke a booking for breach.
      </p>

      <h2>Leads &amp; data</h2>
      <p>
        Where customers share contact details at your stall, you must use them lawfully and only for
        the purpose consented to. You are responsible for your handling of any personal data you
        collect.
      </p>

      <h2>Contact</h2>
      <p>
        Vendor support: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>, {LEGAL.phone}.
      </p>
    </LegalPage>
  );
}
