import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated={LEGAL.lastUpdated}>
      <p>
        These Terms govern your use of {LEGAL.brand}, operated by {LEGAL.entity}. By using our website
        or buying a ticket, you agree to these Terms. If you do not agree, do not use the service.
      </p>

      <h2>Eligibility &amp; accounts</h2>
      <p>
        You must be capable of entering a binding contract under Indian law. You sign in with your
        mobile number via a one-time password; you are responsible for activity on your account. Some
        events may carry their own age or entry conditions, stated on the event page.
      </p>

      <h2>Tickets &amp; entry</h2>
      <ul>
        <li>A ticket is a limited, revocable licence to attend the specified event. Each ticket carries a unique QR code.</li>
        <li>Entry requires a valid QR code; tickets may be scanned once. Re-entry is at the organiser&rsquo;s discretion.</li>
        <li>Do not copy, resell, or share tickets. We may refuse or revoke entry for duplicated, tampered, or fraudulent tickets.</li>
        <li>Attendees must follow venue rules and staff instructions. We may refuse entry for safety or conduct reasons.</li>
      </ul>

      <h2>Pricing &amp; payment</h2>
      <p>
        All prices are set per event and shown at checkout in Indian Rupees. Prices may include
        early-bird or other dynamic pricing and may change over time. Payment is processed by our
        gateway; your order is confirmed only after payment is verified.
      </p>

      <h2>All sales final</h2>
      <p>
        All ticket and stall purchases are <strong>final and non-refundable</strong>. Please review
        the <a href="/refunds">Cancellation &amp; Refund Policy</a> before purchasing.
      </p>

      <h2>Vendors</h2>
      <p>
        Vendors are subject to additional <a href="/vendor-terms">Vendor Terms</a>, including approval
        by our team. Stall allocation is confirmed only after approval and payment.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You may not misuse the service, attempt to gain unauthorised access, disrupt operations,
        scrape data, or use it for unlawful purposes.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The {LEGAL.brand} name, content, and software are owned by us or our licensors and may not be
        used without permission.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided on an &ldquo;as is&rdquo; basis. To the maximum extent permitted by
        law, our aggregate liability for any claim is limited to the amount you paid for the relevant
        order. We are not liable for indirect or consequential losses.
      </p>

      <h2>Changes &amp; governing law</h2>
      <p>
        We may update these Terms; continued use means acceptance. These Terms are governed by the laws
        of India, and the courts of {LEGAL.jurisdiction} have exclusive jurisdiction.
      </p>

      <h2>Contact</h2>
      <p>
        {LEGAL.entity}, {LEGAL.address}. Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    </LegalPage>
  );
}
