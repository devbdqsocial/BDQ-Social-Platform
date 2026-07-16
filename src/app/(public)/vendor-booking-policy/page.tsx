import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { getPublishedDoc } from "@/server/legal/docs";
import { LEGAL } from "@/lib/legal";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Stall Booking & Payment Policy" };

export default async function VendorBookingPolicyPage() {
  const doc = await getPublishedDoc("vendor-booking-policy");
  if (doc) return <LegalDocView doc={doc} />;
  return <Fallback />;
}

/** Pre-seed / empty-DB fallback — the original hardcoded page. */
function Fallback() {
  return (
    <LegalPage title="Stall Booking & Payment Policy" updated={LEGAL.lastUpdated}>
      <p>This policy governs how stalls are reserved, approved, paid for, and confirmed at a {LEGAL.brand} market.</p>

      <h2>Pricing</h2>
      <p>
        Stall fees are set by the Organiser per event and are dynamic — they vary by event, stall type, size, and
        location. The fee for your stall is shown before you reserve and again on your agreement.
      </p>

      <h2>Reserve → approve → pay</h2>
      <ul>
        <li>Registering or reserving a stall does not guarantee participation.</li>
        <li>You reserve a preferred stall during onboarding; it is held for you while your application is open.</li>
        <li>Our team verifies your details with a call-back and approves (or reassigns an equivalent stall).</li>
        <li>Once approved, you have a limited window (typically 48 hours) to pay the full stall fee to confirm.</li>
        <li>Your stall is confirmed (BOOKED) only after payment is received.</li>
      </ul>

      <h2>All fees are final and non-refundable</h2>
      <p>
        ALL STALL FEES ARE FINAL AND NON-REFUNDABLE under all circumstances, including no-show, late arrival,
        early departure, cancellation by you, or removal for breach of the Event Rules. There are no refunds and
        no GST invoicing on stall fees. Please reserve and pay only when you are certain.
      </p>

      <h2>No-show &amp; missed payment</h2>
      <p>
        If you do not pay within the approval window, your reservation lapses and the stall is released to others.
        If you pay but do not show up, the fee is forfeited.
      </p>

      <p>
        Questions about a booking? Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or call {LEGAL.phone}.
      </p>
    </LegalPage>
  );
}
