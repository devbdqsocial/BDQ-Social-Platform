import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { getPublishedDoc } from "@/server/legal/docs";
import { LEGAL } from "@/lib/legal";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const doc = await getPublishedDoc("privacy");
  if (doc) return <LegalDocView doc={doc} />;
  return <Fallback />;
}

/** Pre-seed / empty-DB fallback — the original hardcoded page. */
function Fallback() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL.lastUpdated}>
      <p>
        This Privacy Policy explains how {LEGAL.entity} (&ldquo;{LEGAL.brand}&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;) collects, uses, and protects your personal data when you use our website and
        services. We process personal data in accordance with India&rsquo;s Digital Personal Data
        Protection Act, 2023 and the Information Technology Act, 2000 and its rules.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account &amp; identity:</strong> mobile number (verified via one-time password) and, where provided, name and email.</li>
        <li><strong>Vendor KYC:</strong> business details and verification identifiers (e.g. PAN, FSSAI) submitted by vendors. KYC is verify-only; sensitive identifiers are encrypted at rest.</li>
        <li><strong>Orders &amp; tickets:</strong> purchase details, ticket and check-in records. We do <strong>not</strong> store card or bank details — payments are processed by our gateway.</li>
        <li><strong>Technical:</strong> IP address, device/browser information, and cookies/local storage needed for security, sign-in, and core functionality.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide ticketing, vendor onboarding, event entry, and customer support.</li>
        <li>To process payments and prevent fraud and abuse (including rate limiting and security monitoring).</li>
        <li>To send transactional messages (tickets, reminders, service notices) by email and WhatsApp.</li>
        <li>To comply with legal obligations and enforce our Terms.</li>
      </ul>

      <h2>Service providers</h2>
      <p>We share the minimum data necessary with processors who help us operate:</p>
      <ul>
        <li><strong>Razorpay</strong> — payment processing.</li>
        <li><strong>Google Firebase</strong> — phone-number OTP authentication.</li>
        <li><strong>Cloudinary</strong> — image/asset hosting.</li>
        <li><strong>SendGrid</strong> — transactional email.</li>
        <li><strong>Interakt / Meta (WhatsApp)</strong> — transactional WhatsApp messages.</li>
        <li><strong>Neon / Vercel</strong> — database and application hosting.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>Retention</h2>
      <p>
        We keep personal data only as long as needed for the purposes above or as required by law,
        after which it is deleted or anonymised. You may request deletion of your data (see your
        rights below).
      </p>

      <h2>Your rights</h2>
      <p>
        Subject to applicable law, you may request access to, correction of, or erasure of your
        personal data, and may withdraw consent for non-essential processing. To exercise these
        rights, contact us using the details below.
      </p>

      <h2>Security</h2>
      <p>
        We apply technical and organisational safeguards including encryption in transit (HTTPS),
        encryption of sensitive KYC fields at rest, access controls, audit logging, and rate limiting.
        No method of transmission or storage is completely secure, but we work to protect your data.
      </p>

      <h2>Cookies</h2>
      <p>
        We use strictly necessary cookies/local storage for sign-in sessions and security. We do not
        use third-party advertising cookies.
      </p>

      <h2>Grievance Officer</h2>
      <p>
        In accordance with the IT Act and DPDP Act, you may contact our Grievance Officer:{" "}
        {LEGAL.grievanceOfficer}, <a href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</a>.
        We aim to acknowledge grievances within 24 hours and resolve them within 15 days.
      </p>

      <h2>Contact</h2>
      <p>
        {LEGAL.entity}, {LEGAL.address}. Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>,
        phone {LEGAL.phone}.
      </p>
    </LegalPage>
  );
}
