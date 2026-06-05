import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <LegalPage title="Contact Us" updated={LEGAL.lastUpdated}>
      <p>We&rsquo;re here to help with tickets, orders, and vendor enquiries.</p>

      <h2>Customer support</h2>
      <ul>
        <li>Email: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li>
        <li>Phone: {LEGAL.phone}</li>
        <li>Hours: Monday–Saturday, 10:00–18:00 IST</li>
      </ul>

      <h2>Registered office</h2>
      <p>{LEGAL.entity}, {LEGAL.address}.</p>

      <h2>Grievance Officer</h2>
      <p>
        {LEGAL.grievanceOfficer} —{" "}
        <a href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</a>. We acknowledge
        grievances within 24 hours and aim to resolve them within 15 days.
      </p>
    </LegalPage>
  );
}
