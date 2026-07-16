import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { getPublishedDoc } from "@/server/legal/docs";
import { LEGAL } from "@/lib/legal";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Shipping & Delivery Policy" };

export default async function ShippingPage() {
  const doc = await getPublishedDoc("shipping");
  if (doc) return <LegalDocView doc={doc} />;
  return <Fallback />;
}

/** Pre-seed / empty-DB fallback — the original hardcoded page. */
function Fallback() {
  return (
    <LegalPage title="Shipping & Delivery Policy" updated={LEGAL.lastUpdated}>
      <p>
        {LEGAL.brand} sells digital event tickets. There is no physical shipment.
      </p>

      <h2>Delivery of tickets</h2>
      <ul>
        <li>Tickets are delivered electronically as soon as your payment is confirmed.</li>
        <li>Your ticket (with its QR code) is available in your account under &ldquo;My tickets&rdquo; and is sent to you by email and/or WhatsApp where contact details are provided.</li>
        <li>Delivery is typically immediate; during high demand it may take a few minutes.</li>
      </ul>

      <h2>Not received your ticket?</h2>
      <p>
        Tickets remain accessible in your account at any time. If you have not received yours after a
        successful payment, please check your account first, then contact{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or {LEGAL.phone} with your order reference.
      </p>

      <h2>Entry</h2>
      <p>
        Present your ticket QR code at the venue gate for scanning. See our{" "}
        <a href="/terms">Terms &amp; Conditions</a> for entry rules.
      </p>
    </LegalPage>
  );
}
