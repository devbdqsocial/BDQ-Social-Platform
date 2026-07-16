import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * Seeds the Documents & Legal library: the nine legacy policy pages (transcribed from the old
 * hardcoded JSX, with {{legal.*}} tokens replacing the LEGAL constant), the tokenized vendor
 * participation agreement, and the default + food booking-agreement templates.
 * Idempotent: upsert by slug with `update: {}` — re-runs NEVER clobber admin edits.
 * Run AFTER `prisma migrate deploy`, on each DB (local + prod).
 */

/** @type {Array<{slug:string,title:string,category:string,audience:string,status?:string,sections:{heading:string,body:string}[]}>} */
const DOCS = [
  {
    slug: "terms",
    title: "Terms & Conditions",
    category: "TERMS",
    audience: "PUBLIC",
    sections: [
      { heading: "", body: "These Terms govern your use of {{legal.brand}}, operated by {{legal.entity}}. By using our website or buying a ticket, you agree to these Terms. If you do not agree, do not use the service." },
      { heading: "Eligibility & accounts", body: "You must be capable of entering a binding contract under Indian law. You sign in with your mobile number via a one-time password; you are responsible for activity on your account. Some events may carry their own age or entry conditions, stated on the event page." },
      { heading: "Tickets & entry", body: "- A ticket is a limited, revocable licence to attend the specified event. Each ticket carries a unique QR code.\n- Entry requires a valid QR code; tickets may be scanned once. Re-entry is at the organiser's discretion.\n- Do not copy, resell, or share tickets. We may refuse or revoke entry for duplicated, tampered, or fraudulent tickets.\n- Attendees must follow venue rules and staff instructions. We may refuse entry for safety or conduct reasons." },
      { heading: "Pricing & payment", body: "All prices are set per event and shown at checkout in Indian Rupees. Prices may include early-bird or other dynamic pricing and may change over time. Payment is processed by our gateway; your order is confirmed only after payment is verified." },
      { heading: "Refund policy", body: "Ticket and stall purchases follow our [Cancellation & Refund Policy](/refunds). Please review it before purchasing." },
      { heading: "Vendors", body: "Vendors are subject to additional [Vendor Terms](/vendor-terms), including approval by our team. Stall allocation is confirmed only after approval and payment." },
      { heading: "Acceptable use", body: "You may not misuse the service, attempt to gain unauthorised access, disrupt operations, scrape data, or use it for unlawful purposes." },
      { heading: "Intellectual property", body: "The {{legal.brand}} name, content, and software are owned by us or our licensors and may not be used without permission." },
      { heading: "Liability", body: 'The service is provided on an "as is" basis. To the maximum extent permitted by law, our aggregate liability for any claim is limited to the amount you paid for the relevant order. We are not liable for indirect or consequential losses.' },
      { heading: "Changes & governing law", body: "We may update these Terms; continued use means acceptance. These Terms are governed by the laws of India, and the courts of {{legal.jurisdiction}} have exclusive jurisdiction." },
      { heading: "Contact", body: "{{legal.entity}}, {{legal.address}}. Email [{{legal.email}}](mailto:{{legal.email}})." },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    category: "PRIVACY",
    audience: "PUBLIC",
    sections: [
      { heading: "", body: 'This Privacy Policy explains how {{legal.entity}} ("{{legal.brand}}", "we", "us") collects, uses, and protects your personal data when you use our website and services. We process personal data in accordance with India\'s Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000 and its rules.' },
      { heading: "Information we collect", body: "- **Account & identity:** mobile number (verified via one-time password) and, where provided, name and email.\n- **Vendor KYC:** business details and verification identifiers (e.g. PAN, FSSAI) submitted by vendors. KYC is verify-only; sensitive identifiers are encrypted at rest.\n- **Orders & tickets:** purchase details, ticket and check-in records. We do **not** store card or bank details — payments are processed by our gateway.\n- **Technical:** IP address, device/browser information, and cookies/local storage needed for security, sign-in, and core functionality." },
      { heading: "How we use it", body: "- To provide ticketing, vendor onboarding, event entry, and customer support.\n- To process payments and prevent fraud and abuse (including rate limiting and security monitoring).\n- To send transactional messages (tickets, reminders, service notices) by email and WhatsApp.\n- To comply with legal obligations and enforce our Terms." },
      { heading: "Service providers", body: "We share the minimum data necessary with processors who help us operate:\n\n- **Razorpay** — payment processing.\n- **Google Firebase** — phone-number OTP authentication.\n- **Cloudinary** — image/asset hosting.\n- **SendGrid** — transactional email.\n- **Interakt / Meta (WhatsApp)** — transactional WhatsApp messages.\n- **Neon / Vercel** — database and application hosting.\n\nWe do not sell your personal data." },
      { heading: "Retention", body: "We keep personal data only as long as needed for the purposes above or as required by law, after which it is deleted or anonymised. You may request deletion of your data (see your rights below)." },
      { heading: "Your rights", body: "Subject to applicable law, you may request access to, correction of, or erasure of your personal data, and may withdraw consent for non-essential processing. To exercise these rights, contact us using the details below." },
      { heading: "Security", body: "We apply technical and organisational safeguards including encryption in transit (HTTPS), encryption of sensitive KYC fields at rest, access controls, audit logging, and rate limiting. No method of transmission or storage is completely secure, but we work to protect your data." },
      { heading: "Cookies", body: "We use strictly necessary cookies/local storage for sign-in sessions and security. We do not use third-party advertising cookies." },
      { heading: "Grievance Officer", body: "In accordance with the IT Act and DPDP Act, you may contact our Grievance Officer: {{legal.grievanceOfficer}}, [{{legal.grievanceEmail}}](mailto:{{legal.grievanceEmail}}). We aim to acknowledge grievances within 24 hours and resolve them within 15 days." },
      { heading: "Contact", body: "{{legal.entity}}, {{legal.address}}. Email [{{legal.email}}](mailto:{{legal.email}}), phone {{legal.phone}}." },
    ],
  },
  {
    slug: "refunds",
    title: "Cancellation & Refund Policy",
    category: "TERMS",
    audience: "PUBLIC",
    sections: [
      { heading: "", body: "Please read this policy carefully before purchasing. By completing a purchase on {{legal.brand}} you acknowledge and accept it." },
      { heading: "Refund policy", body: "Ticket and stall purchases are confirmed at checkout and are not refundable for change of mind, inability to attend, late arrival, or partial attendance." },
      { heading: "Event cancellation or rescheduling by the organiser", body: "If an event is cancelled or materially rescheduled by the organiser, we will contact affected ticket holders with available options (such as transfer to the rescheduled date or an equivalent credit). Any such option is communicated on a case-by-case basis at the organiser's discretion and in line with applicable law." },
      { heading: "Duplicate or failed payments", body: "If you are charged but no ticket is issued, or you are charged more than once for the same order due to a technical error, contact us with your payment reference. Verified, unfulfilled duplicate charges will be reconciled." },
      { heading: "How to reach us", body: "For any payment or order issue, contact {{legal.entity}} at [{{legal.email}}](mailto:{{legal.email}}) or {{legal.phone}}. Please include your order reference. See also our [Contact](/contact) page." },
    ],
  },
  {
    slug: "shipping",
    title: "Shipping & Delivery Policy",
    category: "TERMS",
    audience: "PUBLIC",
    sections: [
      { heading: "", body: "{{legal.brand}} sells digital event tickets. There is no physical shipment." },
      { heading: "Delivery of tickets", body: '- Tickets are delivered electronically as soon as your payment is confirmed.\n- Your ticket (with its QR code) is available in your account under "My tickets" and is sent to you by email and/or WhatsApp where contact details are provided.\n- Delivery is typically immediate; during high demand it may take a few minutes.' },
      { heading: "Not received your ticket?", body: "Tickets remain accessible in your account at any time. If you have not received yours after a successful payment, please check your account first, then contact [{{legal.email}}](mailto:{{legal.email}}) or {{legal.phone}} with your order reference." },
      { heading: "Entry", body: "Present your ticket QR code at the venue gate for scanning. See our [Terms & Conditions](/terms) for entry rules." },
    ],
  },
  {
    slug: "vendor-terms",
    title: "Vendor Terms",
    category: "TERMS",
    audience: "PUBLIC",
    sections: [
      { heading: "", body: "These Vendor Terms summarise the conditions for selling at {{legal.brand}} markets and complement the binding contract you sign in your vendor dashboard. They are in addition to our general [Terms & Conditions](/terms)." },
      { heading: "Approval", body: "- Registering does not guarantee a stall. Every vendor is reviewed and approved by our team, which includes a verification call-back.\n- We may approve or decline applications at our discretion." },
      { heading: "KYC (verify-only)", body: "We collect business verification details (such as PAN and FSSAI where applicable) solely to verify vendors. We do not act as a tax collector and do not levy GST through the platform. Sensitive identifiers are encrypted at rest (see our [Privacy Policy](/privacy))." },
      { heading: "Stall booking & payment", body: "- Stall prices are set per event. A stall is confirmed only after approval and successful payment.\n- Only one active booking can exist per stall. Holds during payment are time-limited.\n- Stall fees are **final and non-refundable** (see [Cancellation & Refund Policy](/refunds))." },
      { heading: "Conduct", body: "Vendors must comply with venue rules, applicable law, and any product/food-safety requirements, and must accurately represent their brand and products. We may revoke a booking for breach." },
      { heading: "Leads & data", body: "Where customers share contact details at your stall, you must use them lawfully and only for the purpose consented to. You are responsible for your handling of any personal data you collect." },
      { heading: "Contact", body: "Vendor support: [{{legal.email}}](mailto:{{legal.email}}), {{legal.phone}}." },
    ],
  },
  {
    slug: "vendor-rules",
    title: "Event Rules & Code of Conduct",
    category: "EVENT_RULES",
    audience: "PUBLIC",
    sections: [
      { heading: "", body: "These rules apply to every vendor and their staff at a {{legal.brand}} market. They form part of your Vendor Participation Agreement. Breach may result in removal without refund and exclusion from future events." },
      { heading: "Setup & teardown", body: "- Arrive within your allotted setup window and be fully ready before gates open.\n- Staff your stall for the entire event — no early packing down or leaving the stall unattended.\n- Tear down only after the event closes; clear your space completely and remove all waste.\n- Stay within your allocated stall footprint; do not encroach on walkways or neighbours." },
      { heading: "What to do", body: "- Sell only the products and categories declared in your approved profile.\n- Display clear, accurate prices; honour them.\n- Keep your stall clean, safe, and presentable throughout.\n- Hold and display all required licences (FSSAI for food, etc.).\n- Handle cash/UPI yourself — the Organiser takes no commission and is not party to your sales.\n- Follow the lawful instructions of the Organiser and venue staff on the day." },
      { heading: "What not to do", body: "- No prohibited, illegal, counterfeit, hazardous, or age-restricted goods (incl. alcohol/tobacco unless expressly permitted and licensed).\n- No open flame, gas, or high-load electrical equipment without prior written approval and safety clearance.\n- No amplified sound or hawking that disturbs neighbours or the event ambience.\n- No sub-letting, sharing, or transferring your stall to another brand.\n- No misrepresenting your brand, products, or sourcing.\n- No littering, blocking fire exits, or unsafe stacking." },
      { heading: "Food & safety", body: "- Food vendors must hold a valid FSSAI registration/licence and follow hygiene and cold-chain norms.\n- Keep a fire extinguisher appropriate to your setup if you cook on site.\n- Dispose of oil and wet waste only in designated bins." },
      { heading: "Conduct & penalties", body: "Treat customers, neighbours, staff, and volunteers with respect. Harassment, aggressive selling, or unsafe behaviour will not be tolerated. Serious or repeated breaches may lead to immediate removal without refund of stall fees and a ban from future {{legal.brand}} events. Questions? Email [{{legal.email}}](mailto:{{legal.email}})." },
    ],
  },
  {
    slug: "vendor-agreement",
    title: "Vendor Participation Agreement",
    category: "CONTRACT",
    audience: "PUBLIC",
    sections: [
      { heading: "", body: "This is the standard agreement every approved vendor signs to participate at a {{legal.brand}} market. When you sign during onboarding, a copy with your details and signature is generated as a PDF for your records." },
      { heading: "1. Parties", body: 'This Vendor Participation Agreement ("Agreement") is made between {{legal.entity}} ("Organiser", "we", "us"), operator of {{legal.brand}}, and {{vendor.party}} ("Vendor", "you").\n\nBy signing, you confirm you are authorised to enter into this Agreement on behalf of your business.' },
      { heading: "2. Eligibility & verification", body: "Registering as a vendor does not guarantee a stall. Every application is subject to our review, a verification call-back from our team, and approval at our sole discretion.\n\nYou agree to provide accurate business and identity details and the verification documents we request (PAN, and where applicable FSSAI, GST, and a government photo ID). We may reject or revoke an application if information is inaccurate, incomplete, or cannot be verified." },
      { heading: "3. Licences & legal compliance", body: "You are solely responsible for holding and maintaining all licences, registrations, and permits required to sell your products, including a valid FSSAI registration/licence for any food or beverage sold.\n\nYou will comply with all applicable laws, the venue's rules, and the Organiser's Event Rules & Code of Conduct, which form part of this Agreement." },
      { heading: "4. Stall allocation & use", body: "Subject to approval and payment, your stall for this booking is {{stall.label}} at {{event.name}}. The Organiser may reasonably reassign an equivalent stall.\n\nYou will set up and staff your stall for the full event hours, keep your space clean and safe, and vacate it on time. You may trade only the products and categories declared in your approved profile." },
      { heading: "5. Fees & payment", body: "Stall fees are set by the Organiser per event and are dynamic. For this booking the fee is {{fees.total}}.\n\nFees are payable in full within the window communicated after approval, before the stall is confirmed. ALL STALL FEES ARE FINAL AND NON-REFUNDABLE, including in the case of no-show, late arrival, early departure, or your failure to comply with this Agreement. The Organiser charges no commission on your sales." },
      { heading: "6. Conduct & event rules", body: "You and your staff will conduct yourselves professionally, follow all setup/teardown timings, fire and electrical safety, food-safety and hygiene requirements, noise limits, and the lawful instructions of the Organiser and venue on the day.\n\nProhibited items and conduct are set out in the Event Rules & Code of Conduct. Breach may result in removal without refund and exclusion from future events." },
      { heading: "7. Brand & promotion licence", body: "You grant the Organiser a non-exclusive, royalty-free licence to use your brand name, logo, and submitted images to promote the event across our channels. You confirm you own or are licensed to use these materials." },
      { heading: "8. Customer data & leads", body: "Any customer contact details you capture at the event (including via lead-capture QR) must be collected with the customer's consent and used lawfully and only for the purposes disclosed, in compliance with India's Digital Personal Data Protection Act, 2023. You are the data fiduciary for that data and indemnify the Organiser against misuse." },
      { heading: "9. Liability & indemnity", body: "You are responsible for your stall, staff, stock, and equipment, and for any loss, damage, or injury arising from your participation. You indemnify the Organiser against any claim arising from your products, conduct, or breach of this Agreement. To the extent permitted by law, the Organiser's liability is limited to the stall fee paid." },
      { heading: "10. Term, termination & governing law", body: "This Agreement applies to the event(s) for which you are approved. The Organiser may terminate it immediately for breach. This Agreement is governed by the laws of India and subject to the exclusive jurisdiction of the courts at {{legal.jurisdiction}}." },
      { heading: "11. Acceptance", body: "By typing your full legal name and confirming below, you agree to be bound by this Agreement." },
    ],
  },
  {
    slug: "vendor-booking-policy",
    title: "Stall Booking & Payment Policy",
    category: "EVENT_POLICY",
    audience: "PUBLIC",
    sections: [
      { heading: "", body: "This policy governs how stalls are reserved, approved, paid for, and confirmed at a {{legal.brand}} market." },
      { heading: "Pricing", body: "Stall fees are set by the Organiser per event and are dynamic — they vary by event, stall type, size, and location. The fee for your stall is shown before you reserve and again on your agreement." },
      { heading: "Reserve → approve → pay", body: "- Registering or reserving a stall does not guarantee participation.\n- You reserve a preferred stall during onboarding; it is held for you while your application is open.\n- Our team verifies your details with a call-back and approves (or reassigns an equivalent stall).\n- Once approved, you have a limited window (typically 48 hours) to pay the full stall fee to confirm.\n- Your stall is confirmed (BOOKED) only after payment is received." },
      { heading: "All fees are final and non-refundable", body: "ALL STALL FEES ARE FINAL AND NON-REFUNDABLE under all circumstances, including no-show, late arrival, early departure, cancellation by you, or removal for breach of the Event Rules. There are no refunds and no GST invoicing on stall fees. Please reserve and pay only when you are certain." },
      { heading: "No-show & missed payment", body: "If you do not pay within the approval window, your reservation lapses and the stall is released to others. If you pay but do not show up, the fee is forfeited.\n\nQuestions about a booking? Email [{{legal.email}}](mailto:{{legal.email}}) or call {{legal.phone}}." },
    ],
  },
  {
    slug: "vendor-data-policy",
    title: "Vendor Data & Leads Policy",
    category: "DATA_POLICY",
    audience: "PUBLIC",
    sections: [
      { heading: "", body: "This policy covers how you may collect and use customer contact details at a {{legal.brand}} market — including details captured through our lead-capture QR — in line with India's Digital Personal Data Protection Act, 2023 (DPDP)." },
      { heading: "You are the data fiduciary", body: "Any customer data you collect is yours to control and yours to safeguard. {{legal.brand}} provides the lead-capture tool as a convenience; we are not responsible for how you use the data you collect." },
      { heading: "Consent & lawful use", body: "- Collect contact details only with the customer's clear, informed consent.\n- Tell customers who you are and why you're collecting their details before they share them.\n- Use the data only for the purpose disclosed (e.g. updates about your brand) — no onward sale or spam.\n- Honour opt-outs promptly and stop contacting anyone who asks you to." },
      { heading: "Security & retention", body: "- Keep customer data secure and access-controlled; do not share it with unrelated third parties.\n- Retain it only as long as needed for the disclosed purpose, then delete it.\n- Comply with any data-deletion or access request a customer makes to you." },
      { heading: "Indemnity", body: "You indemnify {{legal.entity}} against any claim, fine, or loss arising from your collection or use of customer data, including any breach of the DPDP Act or misuse of the lead-capture tool.\n\nGrievances regarding data may be raised with {{legal.grievanceOfficer}} at [{{legal.grievanceEmail}}](mailto:{{legal.grievanceEmail}})." },
    ],
  },
  {
    slug: "booking-agreement-default",
    title: "Stall Booking Agreement",
    category: "CONTRACT",
    audience: "VENDOR",
    sections: [
      { heading: "", body: "This agreement covers your stall booking for {{event.name}}. It is in addition to your signed [Vendor Participation Agreement](/vendor-agreement) and the [Stall Booking & Payment Policy](/vendor-booking-policy), which continue to apply." },
      { heading: "1. Your booking", body: "Your booking is for {{stall.label}} ({{stall.type}}) at {{event.name}}.\n\nYou may trade only the products and categories declared in your approved profile, and only from your allocated stall." },
      { heading: "2. Fee & payment", body: "The fee for this booking is {{fees.total}}, payable in full within the payment window communicated after approval.\n\nALL STALL FEES ARE FINAL AND NON-REFUNDABLE — including no-show, late arrival, early departure, cancellation by you, or removal for breach of the Event Rules." },
      { heading: "3. Event rules", body: "You and your staff will follow the [Event Rules & Code of Conduct](/vendor-rules), all setup/teardown timings, and the lawful instructions of the Organiser and venue staff on the day." },
      { heading: "4. Acceptance", body: "By typing your full legal name and confirming, you agree to this edition's terms for {{event.name}}." },
    ],
  },
  {
    slug: "booking-agreement-food",
    title: "Food Stall Booking Agreement",
    category: "CONTRACT",
    audience: "VENDOR",
    status: "DRAFT",
    sections: [
      { heading: "", body: "This agreement covers your food stall booking for {{event.name}}. It is in addition to your signed [Vendor Participation Agreement](/vendor-agreement) and the [Stall Booking & Payment Policy](/vendor-booking-policy), which continue to apply." },
      { heading: "1. Your booking", body: "Your booking is for {{stall.label}} ({{stall.type}}) at {{event.name}}.\n\nYou may trade only the products and categories declared in your approved profile, and only from your allocated stall." },
      { heading: "2. Fee & payment", body: "The fee for this booking is {{fees.total}}, payable in full within the payment window communicated after approval.\n\nALL STALL FEES ARE FINAL AND NON-REFUNDABLE — including no-show, late arrival, early departure, cancellation by you, or removal for breach of the Event Rules." },
      { heading: "3. Food safety & FSSAI", body: "- You must hold and display a valid FSSAI registration/licence for everything you sell at the event.\n- Follow hygiene and cold-chain norms at all times; food handlers must maintain personal hygiene standards.\n- Keep a fire extinguisher appropriate to your setup if you cook on site; open flame or gas requires prior written approval.\n- Dispose of oil and wet waste only in designated bins." },
      { heading: "4. Event rules", body: "You and your staff will follow the [Event Rules & Code of Conduct](/vendor-rules), all setup/teardown timings, and the lawful instructions of the Organiser and venue staff on the day." },
      { heading: "5. Acceptance", body: "By typing your full legal name and confirming, you agree to this edition's terms for {{event.name}}." },
    ],
  },
];

async function main() {
  for (const doc of DOCS) {
    const status = doc.status ?? "PUBLISHED";
    await db.legalDocument.upsert({
      where: { slug: doc.slug },
      update: {},
      create: {
        slug: doc.slug,
        title: doc.title,
        category: doc.category,
        audience: doc.audience,
        status,
        sections: doc.sections,
        version: "v1",
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });
  }
  const count = await db.legalDocument.count();
  console.log(`seed-legal: ${DOCS.length} docs ensured (${count} total in table).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
