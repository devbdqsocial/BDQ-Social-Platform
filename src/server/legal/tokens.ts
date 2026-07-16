import "server-only";
import { fmtDateFull } from "@/lib/date-formats";
import { LEGAL } from "@/lib/legal";
import { formatPaise } from "@/lib/utils";
import type { DocSection } from "@/lib/legal-sections";

/**
 * {{token}} merge for LegalDocument templates. Every known token has a FALLBACK phrase (the same
 * graceful degradation the old hardcoded agreementSections used), so merged output — and therefore
 * any signed snapshot or PDF — can never contain literal `{{…}}`. `missing` lists tokens that fell
 * back, surfaced as warnings in the admin preview.
 */

export type TokenContext = {
  vendor?: { brandName?: string | null; registeredName?: string | null; productCategory?: string | null };
  event?: { name?: string | null; startsAt?: Date | null; location?: string | null };
  stall?: { label?: string | null; typeName?: string | null };
  fees?: { totalPaise?: number | null };
  signature?: { signerName?: string | null; signedAt?: Date | null };
  doc?: { version?: string | null };
};

const FALLBACKS: Record<string, string> = {
  "vendor.brandName": "the Vendor",
  "vendor.party": "the Vendor",
  "vendor.category": "your approved product category",
  "event.name": "the event",
  "event.date": "the event dates communicated to you",
  "event.location": "the event venue",
  "stall.label": "the stall shown in your booking",
  "stall.type": "your stall type",
  "fees.total": "the stall fee shown for the event",
  "signature.name": "the undersigned",
  "signature.date": "the date of signing",
  "doc.version": "the current version",
};

function tokenMap(ctx: TokenContext): Record<string, string | null> {
  const brand = ctx.vendor?.brandName ?? null;
  const party = brand
    ? ctx.vendor?.registeredName
      ? `${brand} (operating as ${ctx.vendor.registeredName})`
      : brand
    : null;
  return {
    "vendor.brandName": brand,
    "vendor.party": party,
    "vendor.category": ctx.vendor?.productCategory ?? null,
    "event.name": ctx.event?.name ?? null,
    "event.date": ctx.event?.startsAt ? fmtDateFull(ctx.event.startsAt) : null,
    "event.location": ctx.event?.location ?? null,
    "stall.label": ctx.stall?.label ?? null,
    "stall.type": ctx.stall?.typeName ?? null,
    "fees.total": ctx.fees?.totalPaise != null ? formatPaise(ctx.fees.totalPaise) : null,
    "signature.name": ctx.signature?.signerName ?? null,
    "signature.date": ctx.signature?.signedAt ? fmtDateFull(ctx.signature.signedAt) : null,
    "doc.version": ctx.doc?.version ?? null,
    today: fmtDateFull(new Date()),
    "legal.brand": LEGAL.brand,
    "legal.entity": LEGAL.entity,
    "legal.email": LEGAL.email,
    "legal.phone": LEGAL.phone,
    "legal.address": LEGAL.address,
    "legal.jurisdiction": LEGAL.jurisdiction,
    "legal.grievanceOfficer": LEGAL.grievanceOfficer,
    "legal.grievanceEmail": LEGAL.grievanceEmail,
  };
}

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

export function mergeTokens(text: string, ctx: TokenContext): { text: string; missing: string[] } {
  const map = tokenMap(ctx);
  const missing: string[] = [];
  const merged = text.replace(TOKEN_RE, (_all, key: string) => {
    const value = map[key];
    if (value) return value;
    missing.push(key);
    return FALLBACKS[key] ?? `[${key}]`; // unknown token (typo) — visible marker, flagged in preview
  });
  return { text: merged, missing };
}

export function mergeSections(sections: DocSection[], ctx: TokenContext): { sections: DocSection[]; missing: string[] } {
  const missing = new Set<string>();
  const merged = sections.map((s) => {
    const heading = mergeTokens(s.heading, ctx);
    const body = mergeTokens(s.body, ctx);
    for (const key of [...heading.missing, ...body.missing]) missing.add(key);
    return { heading: heading.text, body: body.text };
  });
  return { sections: merged, missing: [...missing] };
}

/** Representative values for the admin preview. */
export const SAMPLE_TOKEN_CONTEXT: TokenContext = {
  vendor: { brandName: "Sample Brand", registeredName: "Sample Brand LLP", productCategory: "Food & Beverage" },
  event: { name: "BDQ Social — Sample Edition", startsAt: new Date(), location: "Vadodara" },
  stall: { label: "A-12", typeName: "Food 10×10" },
  fees: { totalPaise: 1500000 },
  doc: { version: "v1" },
};
