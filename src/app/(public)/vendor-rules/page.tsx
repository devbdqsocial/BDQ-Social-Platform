import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { getPublishedDoc } from "@/server/legal/docs";
import { LEGAL } from "@/lib/legal";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Event Rules & Code of Conduct" };

export default async function VendorRulesPage() {
  const doc = await getPublishedDoc("vendor-rules");
  if (doc) return <LegalDocView doc={doc} />;
  return <Fallback />;
}

/** Pre-seed / empty-DB fallback — the original hardcoded page. */
function Fallback() {
  return (
    <LegalPage title="Event Rules & Code of Conduct" updated={LEGAL.lastUpdated}>
      <p>
        These rules apply to every vendor and their staff at a {LEGAL.brand} market. They form part of your
        Vendor Participation Agreement. Breach may result in removal without refund and exclusion from future events.
      </p>

      <h2>Setup &amp; teardown</h2>
      <ul>
        <li>Arrive within your allotted setup window and be fully ready before gates open.</li>
        <li>Staff your stall for the entire event — no early packing down or leaving the stall unattended.</li>
        <li>Tear down only after the event closes; clear your space completely and remove all waste.</li>
        <li>Stay within your allocated stall footprint; do not encroach on walkways or neighbours.</li>
      </ul>

      <h2>What to do</h2>
      <ul>
        <li>Sell only the products and categories declared in your approved profile.</li>
        <li>Display clear, accurate prices; honour them.</li>
        <li>Keep your stall clean, safe, and presentable throughout.</li>
        <li>Hold and display all required licences (FSSAI for food, etc.).</li>
        <li>Handle cash/UPI yourself — the Organiser takes no commission and is not party to your sales.</li>
        <li>Follow the lawful instructions of the Organiser and venue staff on the day.</li>
      </ul>

      <h2>What not to do</h2>
      <ul>
        <li>No prohibited, illegal, counterfeit, hazardous, or age-restricted goods (incl. alcohol/tobacco unless expressly permitted and licensed).</li>
        <li>No open flame, gas, or high-load electrical equipment without prior written approval and safety clearance.</li>
        <li>No amplified sound or hawking that disturbs neighbours or the event ambience.</li>
        <li>No sub-letting, sharing, or transferring your stall to another brand.</li>
        <li>No misrepresenting your brand, products, or sourcing.</li>
        <li>No littering, blocking fire exits, or unsafe stacking.</li>
      </ul>

      <h2>Food &amp; safety</h2>
      <ul>
        <li>Food vendors must hold a valid FSSAI registration/licence and follow hygiene and cold-chain norms.</li>
        <li>Keep a fire extinguisher appropriate to your setup if you cook on site.</li>
        <li>Dispose of oil and wet waste only in designated bins.</li>
      </ul>

      <h2>Conduct &amp; penalties</h2>
      <p>
        Treat customers, neighbours, staff, and volunteers with respect. Harassment, aggressive selling, or
        unsafe behaviour will not be tolerated. Serious or repeated breaches may lead to immediate removal
        without refund of stall fees and a ban from future {LEGAL.brand} events. Questions? Email{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    </LegalPage>
  );
}
