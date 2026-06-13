import { fmtDateFull } from "@/lib/date-formats";
import { LEGAL } from "@/lib/legal";
import { formatPaise } from "@/lib/utils";

/** Versioned so a re-issued agreement can be distinguished; stored on VendorContract.version. */
export const CONTRACT_VERSION = "v1.0-2026";

export type AgreementContext = {
  brandName: string;
  registeredName?: string | null;
  eventName?: string | null;
  stallLabel?: string | null;
  feePaise?: number | null;
  signerName?: string | null;
  signedAt?: Date | null;
};

const party = (ctx: AgreementContext) =>
  ctx.registeredName ? `${ctx.brandName} (operating as ${ctx.registeredName})` : ctx.brandName;

/** The full vendor agreement, with the vendor/event/stall specifics merged in. Used by the PDF
 *  renderer and the public /vendor-agreement page. */
export function agreementSections(ctx: AgreementContext): { heading: string; body: string[] }[] {
  const fee = ctx.feePaise != null ? formatPaise(ctx.feePaise) : "the stall fee shown for the event";
  return [
    {
      heading: "1. Parties",
      body: [
        `This Vendor Participation Agreement ("Agreement") is made between ${LEGAL.entity} ("Organiser", "we", "us"), operator of ${LEGAL.brand}, and ${party(ctx)} ("Vendor", "you").`,
        "By signing, you confirm you are authorised to enter into this Agreement on behalf of your business.",
      ],
    },
    {
      heading: "2. Eligibility & verification",
      body: [
        "Registering as a vendor does not guarantee a stall. Every application is subject to our review, a verification call-back from our team, and approval at our sole discretion.",
        "You agree to provide accurate business and identity details and the verification documents we request (PAN, and where applicable FSSAI, GST, and a government photo ID). We may reject or revoke an application if information is inaccurate, incomplete, or cannot be verified.",
      ],
    },
    {
      heading: "3. Licences & legal compliance",
      body: [
        "You are solely responsible for holding and maintaining all licences, registrations, and permits required to sell your products, including a valid FSSAI registration/licence for any food or beverage sold.",
        "You will comply with all applicable laws, the venue's rules, and the Organiser's Event Rules & Code of Conduct, which form part of this Agreement.",
      ],
    },
    {
      heading: "4. Stall allocation & use",
      body: [
        ctx.stallLabel
          ? `Subject to approval and payment, you are allocated stall ${ctx.stallLabel}${ctx.eventName ? ` at ${ctx.eventName}` : ""}.`
          : "Stalls are allocated per event, subject to approval and payment. The Organiser may reasonably reassign an equivalent stall.",
        "You will set up and staff your stall for the full event hours, keep your space clean and safe, and vacate it on time. You may trade only the products and categories declared in your approved profile.",
      ],
    },
    {
      heading: "5. Fees & payment",
      body: [
        `Stall fees are set by the Organiser per event and are dynamic. For this booking the fee is ${fee}.`,
        "Fees are payable in full within the window communicated after approval, before the stall is confirmed. ALL STALL FEES ARE FINAL AND NON-REFUNDABLE, including in the case of no-show, late arrival, early departure, or your failure to comply with this Agreement. The Organiser charges no commission on your sales.",
      ],
    },
    {
      heading: "6. Conduct & event rules",
      body: [
        "You and your staff will conduct yourselves professionally, follow all setup/teardown timings, fire and electrical safety, food-safety and hygiene requirements, noise limits, and the lawful instructions of the Organiser and venue on the day.",
        "Prohibited items and conduct are set out in the Event Rules & Code of Conduct. Breach may result in removal without refund and exclusion from future events.",
      ],
    },
    {
      heading: "7. Brand & promotion licence",
      body: [
        "You grant the Organiser a non-exclusive, royalty-free licence to use your brand name, logo, and submitted images to promote the event across our channels. You confirm you own or are licensed to use these materials.",
      ],
    },
    {
      heading: "8. Customer data & leads",
      body: [
        "Any customer contact details you capture at the event (including via lead-capture QR) must be collected with the customer's consent and used lawfully and only for the purposes disclosed, in compliance with India's Digital Personal Data Protection Act, 2023. You are the data fiduciary for that data and indemnify the Organiser against misuse.",
      ],
    },
    {
      heading: "9. Liability & indemnity",
      body: [
        "You are responsible for your stall, staff, stock, and equipment, and for any loss, damage, or injury arising from your participation. You indemnify the Organiser against any claim arising from your products, conduct, or breach of this Agreement. To the extent permitted by law, the Organiser's liability is limited to the stall fee paid.",
      ],
    },
    {
      heading: "10. Term, termination & governing law",
      body: [
        "This Agreement applies to the event(s) for which you are approved. The Organiser may terminate it immediately for breach. This Agreement is governed by the laws of India and subject to the exclusive jurisdiction of the courts at " +
          `${LEGAL.jurisdiction}.`,
      ],
    },
    {
      heading: "11. Acceptance",
      body: [
        ctx.signerName && ctx.signedAt
          ? `Signed electronically by ${ctx.signerName} on ${fmtDateFull(ctx.signedAt)}.`
          : "By typing your full legal name and confirming below, you agree to be bound by this Agreement.",
      ],
    },
  ];
}
