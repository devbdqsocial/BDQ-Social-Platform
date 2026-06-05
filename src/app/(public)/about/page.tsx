import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <LegalPage title="About Us" updated={LEGAL.lastUpdated}>
      <p>
        {LEGAL.brand} is Vadodara&rsquo;s premium curated lifestyle festival and night market —
        bringing together indie brands, gourmet food, and live music for unforgettable evenings.
      </p>
      <p>
        We help guests discover and book event tickets, and help local brands showcase and sell at our
        markets. Our platform handles ticketing, QR-based entry, and vendor onboarding end to end.
      </p>

      <h2>Who we are</h2>
      <p>{LEGAL.brand} is operated by {LEGAL.entity}, {LEGAL.address}.</p>

      <h2>Get in touch</h2>
      <p>
        Questions or partnership enquiries? Email{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or visit our{" "}
        <a href="/contact">Contact</a> page.
      </p>
    </LegalPage>
  );
}
