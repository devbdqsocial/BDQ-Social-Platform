import "server-only";
import { db } from "@/server/db";
import { BOOKING_CONTRACT_DEFAULT_SLUG, GLOBAL_CONTRACT_SLUG } from "@/lib/legal-docs";
import type { DocSection } from "@/lib/legal-sections";
import { docSectionsSchema } from "@/server/schemas";
import type { TokenContext } from "./tokens";
import { parseSections } from "./docs";

/**
 * Contract template resolution. Booking contracts resolve stall-type assignment → event default
 * → the well-known default slug → a tiny code fallback, so the payment flow never breaks on an
 * empty table. The global participation agreement falls back to the hardcoded agreementSections()
 * (src/server/contracts/agreement.ts) — signalled by `source: "code"` so the caller merges via
 * the legacy path. Sections returned here are UNMERGED templates ({{token}}s intact).
 */

export type ResolvedTemplate = {
  slug: string;
  title: string;
  version: string;
  sections: DocSection[];
  source: "stall-type" | "vendor-category" | "event-default" | "well-known" | "code";
};

const CODE_FALLBACK_BOOKING: DocSection[] = [
  {
    heading: "1. This booking",
    body: "This agreement covers your stall booking for {{event.name}}. Your stall is {{stall.label}}. It is separate from — and in addition to — your signed Vendor Participation Agreement, which continues to apply.",
  },
  {
    heading: "2. Fee & payment",
    body: "The fee for this booking is {{fees.total}}, payable in full within the window communicated after approval. ALL STALL FEES ARE FINAL AND NON-REFUNDABLE, including no-show, late arrival, early departure, or breach of the event rules.",
  },
  {
    heading: "3. Acceptance",
    body: "By typing your full legal name and confirming, you agree to this edition's terms and the Event Rules & Code of Conduct.",
  },
];

function toTemplate(
  doc: { slug: string; title: string; version: string; sections: unknown },
  source: ResolvedTemplate["source"],
): ResolvedTemplate {
  return { slug: doc.slug, title: doc.title, version: doc.version, sections: parseSections(doc.sections), source };
}

/** The contract template a vendor signs for this booking
 *  (stall type → vendor category → event default → global default). */
export async function resolveBookingContract(bookingId: string): Promise<ResolvedTemplate> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      eventId: true,
      stall: { select: { stallTypeId: true } },
      vendorProfile: { select: { productCategory: true } },
    },
  });
  if (booking) {
    const pick = (where: { stallTypeId: string | null; vendorCategory: string | null }) =>
      db.docAssignment.findFirst({
        where: { eventId: booking.eventId, ...where, kind: "BOOKING_CONTRACT", doc: { status: "PUBLISHED" } },
        select: { doc: { select: { slug: true, title: true, version: true, sections: true } } },
      });
    const stallTypeId = booking.stall?.stallTypeId ?? null;
    if (stallTypeId) {
      const byType = await pick({ stallTypeId, vendorCategory: null });
      if (byType) return toTemplate(byType.doc, "stall-type");
    }
    const category = booking.vendorProfile?.productCategory ?? null;
    if (category) {
      const byCategory = await pick({ stallTypeId: null, vendorCategory: category });
      if (byCategory) return toTemplate(byCategory.doc, "vendor-category");
    }
    const byEvent = await pick({ stallTypeId: null, vendorCategory: null });
    if (byEvent) return toTemplate(byEvent.doc, "event-default");
  }
  const fallback = await db.legalDocument.findFirst({
    where: { slug: BOOKING_CONTRACT_DEFAULT_SLUG, status: "PUBLISHED" },
    select: { slug: true, title: true, version: true, sections: true },
  });
  if (fallback) return toTemplate(fallback, "well-known");
  return {
    slug: "booking-agreement-fallback",
    title: "Stall Booking Agreement",
    version: "v1",
    sections: CODE_FALLBACK_BOOKING,
    source: "code",
  };
}

/** The global vendor participation agreement template, or null → caller uses agreementSections(). */
export async function resolveGlobalContract(): Promise<ResolvedTemplate | null> {
  const doc = await db.legalDocument.findFirst({
    where: { slug: GLOBAL_CONTRACT_SLUG, status: "PUBLISHED" },
    select: { slug: true, title: true, version: true, sections: true },
  });
  return doc ? toTemplate(doc, "well-known") : null;
}

/** Merge context (vendor/event/stall/fees) for a booking's contract. */
export async function bookingTokenContext(bookingId: string): Promise<TokenContext> {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      vendorProfile: { select: { brandName: true, registeredName: true, productCategory: true } },
      event: { select: { name: true, startsAt: true, location: true } },
      stall: { select: { label: true, priceInPaise: true, stallType: { select: { name: true, priceInPaise: true } } } },
    },
  });
  if (!b) return {};
  return {
    vendor: b.vendorProfile ?? undefined,
    event: b.event,
    stall: { label: b.stall?.label, typeName: b.stall?.stallType?.name ?? null },
    fees: { totalPaise: b.stall?.priceInPaise ?? b.stall?.stallType?.priceInPaise ?? null },
  };
}

// ── signed-contract snapshots (VendorContract.termsSnapshot / BookingAgreement.termsSnapshot) ──
// Once SIGNED, rendering always reads the snapshot — never re-resolves. Template edits after
// signing therefore never change what a vendor agreed to.
export type ContractSnapshot = { slug: string; version: string; title: string; sections: DocSection[] };

export function makeSnapshot(s: ContractSnapshot): string {
  return JSON.stringify(s);
}

export function parseSnapshot(termsSnapshot: string | null | undefined): ContractSnapshot | null {
  if (!termsSnapshot) return null;
  try {
    const o = JSON.parse(termsSnapshot) as ContractSnapshot;
    return { ...o, sections: docSectionsSchema.parse(o.sections) };
  } catch {
    return null;
  }
}
