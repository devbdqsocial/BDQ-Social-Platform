import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Cancellation & Refund Policy" };

export default function RefundsPage() {
  return (
    <LegalPage title="Cancellation & Refund Policy" updated={LEGAL.lastUpdated}>
      <p>
        Please read this policy carefully before purchasing. By completing a purchase on {LEGAL.brand}
        you acknowledge and accept it.
      </p>

      <h2>Refund policy</h2>
      <p>
        Ticket and stall purchases are confirmed at checkout and are not refundable for change of mind,
        inability to attend, late arrival, or partial attendance.
      </p>

      <h2>Event cancellation or rescheduling by the organiser</h2>
      <p>
        If an event is cancelled or materially rescheduled by the organiser, we will contact affected
        ticket holders with available options (such as transfer to the rescheduled date or an
        equivalent credit). Any such option is communicated on a case-by-case basis at the
        organiser&rsquo;s discretion and in line with applicable law.
      </p>

      <h2>Duplicate or failed payments</h2>
      <p>
        If you are charged but no ticket is issued, or you are charged more than once for the same
        order due to a technical error, contact us with your payment reference. Verified, unfulfilled
        duplicate charges will be reconciled.
      </p>

      <h2>How to reach us</h2>
      <p>
        For any payment or order issue, contact {LEGAL.entity} at{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or {LEGAL.phone}. Please include your order
        reference. See also our <a href="/contact">Contact</a> page.
      </p>
    </LegalPage>
  );
}
