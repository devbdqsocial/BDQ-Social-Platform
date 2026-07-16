import { z } from "zod";
import {
  phoneE164,
  phoneE164Optional,
  emailOptional,
  couponCode,
  panOptional,
  gstinOptional,
  fssaiOptional,
  MAX_PAISE,
} from "@/lib/validators";

// Phone normalisation lives in the shared validator layer (client + server share one rule).
export { normalizePhone } from "@/lib/validators";

/**
 * Input schemas for the API/server-action contracts (Docs/API.md). Used by withValidation.
 * Money is integer paise; prices are dynamic (supplied per request, never hardcoded).
 */

const paise = z.number().int().nonnegative();
const ft = z.number().positive();
const id = z.string().min(1);

/** Common action() inputs for id-only / id+flag mutations (publish, archive, toggle…). */
export const idActionSchema = z.object({ id });
export const idActiveSchema = z.object({ id, active: z.boolean() });

export const createEventSchema = z
  .object({
    name: z.string().min(2),
    description: z.string().optional(),
    location: z.string().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    capacity: z.number().int().positive().optional(),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: "End time must be after the start time.", path: ["endsAt"] });

/** Edit form — same as create plus an optional editable public slug (blank = keep current). */
export const updateEventSchema = z
  .object({
    name: z.string().min(2),
    description: z.string().optional(),
    location: z.string().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    capacity: z.number().int().positive().optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only.").min(2).max(60).optional(),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: "End time must be after the start time.", path: ["endsAt"] });

export const ticketTypeSchema = z.object({
  name: z.string().min(1),
  priceInPaise: paise.max(MAX_PAISE, "Price is too large"),
  earlyPricePaise: paise.max(MAX_PAISE, "Price is too large").optional(),
  totalQty: z.number().int().positive(),
  attendeesPer: z.number().int().positive().default(1),
});

export const stallTypeSchema = z.object({
  name: z.string().min(1),
  widthFt: ft,
  heightFt: ft,
  priceInPaise: paise,
  color: z.string().min(1),
  sellable: z.boolean().default(true),
});

/** Buy tickets. Group max 10 per order (BUSINESS-RULES §1.5). */
const utmSchema = z
  .object({
    source: z.string().trim().min(1).max(120).optional(),
    medium: z.string().trim().min(1).max(120).optional(),
    campaign: z.string().trim().min(1).max(120).optional(),
    term: z.string().trim().min(1).max(120).optional(),
    content: z.string().trim().min(1).max(120).optional(),
    ref: z.string().trim().min(1).max(120).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);

export const createOrderSchema = z.object({
  eventId: id,
  items: z
    .array(z.object({ ticketTypeId: id, qty: z.number().int().positive() }))
    .min(1)
    .refine((items) => items.reduce((s, i) => s + i.qty, 0) <= 10, {
      message: "Max 10 tickets per order",
    }),
  couponCode: z.string().trim().min(1).optional(),
  utm: utmSchema.optional(),
  clientOrderKey: z.string().uuid().optional(),
});

/** Order creation only (not quotes): checkout must send explicit T&C consent. */
export const placeOrderSchema = createOrderSchema.extend({ termsAccepted: z.literal(true) });

export const couponSchema = z
  .object({
    code: couponCode,
    type: z.enum(["FLAT", "PERCENT"]),
    value: z.number().int().nonnegative(),
    maxUses: z.number().int().positive().optional(),
    perUserLimit: z.number().int().positive().default(1),
    minOrder: paise.optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    active: z.boolean().default(true),
  })
  // PERCENT value is a 0-100 percentage; FLAT value is paise (bounded to the retail ceiling).
  .refine((c) => (c.type === "PERCENT" ? c.value <= 100 : c.value <= MAX_PAISE), {
    message: "Discount value is out of range",
    path: ["value"],
  });

export const scheduleItemSchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  title: z.string().min(1),
  stageOrZone: z.string().optional(),
  performer: z.string().optional(),
  eventDayId: z.string().optional(),
});

export const eventDaySchema = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    label: z.string().trim().max(60).optional(),
  })
  .refine((d) => d.endsAt > d.startsAt, { message: "End must be after start", path: ["endsAt"] });

export const mapElementSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["STALL", "INFRA"]),
  widthFt: ft,
  heightFt: ft,
  color: z.string().min(1),
  sellable: z.boolean().default(true),
});

export const campaignSchema = z.object({
  name: z.string().min(2),
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  audience: z.enum(["ALL", "BUYERS"]),
  subject: z.string().optional(),
  body: z.string().optional(),
});

export const sponsorSchema = z.object({
  eventId: id,
  name: z.string().min(1),
  tier: z.enum(["TITLE", "POWERED_BY", "ZONE", "STALL", "ASSOCIATE"]),
  logoUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  amountPaise: z.number().int().nonnegative().optional(),
  status: z.enum(["PROPOSED", "SIGNED", "PAID"]).optional(),
  note: z.string().optional(),
});

export const waitlistSchema = z.object({
  eventId: id,
  type: z.enum(["TICKET", "STALL"]).default("TICKET"),
  contact: z.string().trim().min(3).max(120),
});

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #868EFF")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const eventThemeSchema = z.object({ primary: hexColor, accent: hexColor });

export const setVendorStallsSchema = z.object({ enabled: z.boolean() });

/** Event logistics: add-on ordering close window (hours before start) + vendor load-in/setup window. */
export const eventLogisticsSchema = z
  .object({
    addOnCloseHours: z.number().int().min(0).max(720).optional(),
    loadInStartsAt: z.coerce.date().optional(),
    loadInEndsAt: z.coerce.date().optional(),
  })
  .refine((d) => !(d.loadInStartsAt && d.loadInEndsAt) || d.loadInEndsAt >= d.loadInStartsAt, {
    message: "Load-in end must be after start",
    path: ["loadInEndsAt"],
  });

/** Per-event dynamic pricing rules consumed by the pricing engine. Bulk only triggers above 5
 * tickets (Docs/BUSINESS-RULES §9); discounts never stack — the single best of {early-bird, bulk,
 * coupon} wins. */
export const bulkTierSchema = z.object({
  minQty: z.number().int().min(6, "Bulk pricing applies above 5 tickets"),
  percent: z.number().min(0).max(100),
});
export const eventPricingSchema = z.object({
  earlyBird: z.object({
    active: z.boolean().default(false),
    percent: z.number().min(0).max(100).optional(),
  }),
  bulkTiers: z.array(bulkTierSchema).max(5),
});

/** Vendor self-serve offer (vendor creates a promo for an event their stall is booked in). */
export const vendorOfferSchema = z
  .object({
    eventId: id,
    title: z.string().trim().min(2).max(80),
    terms: z.string().trim().min(2).max(300),
    kind: z.enum(["DISCOUNT", "FREEBIE", "BUNDLE"]),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((d) => d.endsAt > d.startsAt, { message: "End must be after start", path: ["endsAt"] });

export const leadSchema = z
  .object({
    vendorProfileId: id,
    name: z.string().trim().max(120).optional(),
    phone: phoneE164Optional,
    email: emailOptional,
    consent: z.coerce.boolean().default(true),
  })
  .refine((d) => d.phone || d.email, { message: "Add a phone or email" });

export const checkinSchema = z.object({
  qrToken: z.string().min(1),
  gate: z.string().optional(),
  direction: z.enum(["IN", "OUT"]).default("IN"),
  clientScanId: z.string().optional(),
  /// Group-QR partial admit ("3 of us now") — default admits everyone outstanding.
  admit: z.number().int().min(1).max(500).optional(),
});

/** Structured product-category taxonomy for the brand-details step. */
export const PRODUCT_CATEGORIES = [
  "Apparel & Fashion",
  "Jewellery & Accessories",
  "Food & Beverage",
  "Home & Decor",
  "Beauty & Wellness",
  "Art & Craft",
  "Kids",
  "Other",
] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));

export const vendorProfileSchema = z.object({
  brandName: z.string().min(2),
  registeredName: optionalText(160),
  category: z.string().optional(),
  productCategory: z.enum(PRODUCT_CATEGORIES).optional().or(z.literal("").transform(() => undefined)),
  products: optionalText(600),
  description: optionalText(1000),
  website: optionalText(200),
  instagram: optionalText(120),
  contactPerson: optionalText(120),
  whatsapp: phoneE164Optional,
  city: optionalText(80),
});

/** Contract e-sign: typed legal name + explicit agreement (captured with time + IP server-side). */
export const contractSignSchema = z.object({
  signerName: z.string().trim().min(2).max(120),
  agree: z.coerce.boolean().refine((v) => v === true, { message: "You must agree to the terms to sign" }),
});

export const adminCreateVendorSchema = z.object({
  phone: phoneE164,
  name: z.string().trim().max(120).optional(),
  brandName: z.string().min(2),
  category: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
});

/** KYC is verify-only (no GST billing) — BUSINESS-RULES §2.5. */
export const vendorKycSchema = z.object({
  pan: panOptional,
  fssai: fssaiOptional,
  gstin: gstinOptional,
});

/** Finance ledger (cost side). Money is integer paise; the action converts rupee inputs first. */
export const EXPENSE_CATEGORIES = [
  "VENUE", "MARKETING", "STAFF", "SECURITY", "LOGISTICS",
  "PRODUCTION", "TALENT", "FNB", "PERMIT", "VENDOR_PAYOUT", "MISC",
] as const;

const optionalUrl = z.string().url().optional().or(z.literal("").transform(() => undefined));

export const expenseSchema = z.object({
  eventId: id.optional(),
  category: z.enum(EXPENSE_CATEGORIES),
  vendorProfileId: id.optional(),
  title: z.string().trim().min(2).max(160),
  amountPaise: z.number().int().positive(),
  incurredAt: z.coerce.date(),
  note: z.string().trim().max(500).optional(),
  receiptUrl: optionalUrl,
  status: z.enum(["DRAFT", "APPROVED", "PAID"]).default("DRAFT"),
});

export const budgetSchema = z.object({
  eventId: id,
  category: z.enum(EXPENSE_CATEGORIES),
  plannedPaise: z.number().int().nonnegative(),
});

export const expenseScheduleSchema = z.object({
  eventId: id.optional(),
  category: z.enum(EXPENSE_CATEGORIES),
  title: z.string().trim().min(2).max(160),
  amountPaise: z.number().int().positive(),
  cadence: z.enum(["WEEKLY", "MONTHLY"]),
  nextRunAt: z.coerce.date(),
  remaining: z.number().int().positive().optional(),
});

export const settlementSchema = z.object({
  gatewayRef: z.string().trim().min(3).max(120), // Razorpay settlement id / UTR
  amountPaise: z.number().int().nonnegative(),    // net amount Razorpay deposited
  feePaise: z.number().int().nonnegative().default(0),
  taxPaise: z.number().int().nonnegative().default(0),
  settledAt: z.coerce.date(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
export type VendorProfileInput = z.infer<typeof vendorProfileSchema>;
export type VendorKycInput = z.infer<typeof vendorKycSchema>;
export type ContractSignInput = z.infer<typeof contractSignSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type ExpenseScheduleInput = z.infer<typeof expenseScheduleSchema>;
export type SettlementInput = z.infer<typeof settlementSchema>;

/** Stall add-ons (R4.2). Price is admin-entered paise; stock null = unlimited. */
export const createAddOnSchema = z.object({
  eventId: id,
  name: z.string().min(1).max(60),
  pricePaise: paise.refine((n) => n > 0, "Price required").refine((n) => n <= MAX_PAISE, "Price is too large"),
  maxPerBooking: z.coerce.number().int().min(1).max(50).default(5),
  stock: z.coerce.number().int().nonnegative().nullish(),
  active: z.boolean().default(true),
});
export const updateAddOnSchema = createAddOnSchema.omit({ eventId: true }).extend({ id });
export const addOnOrderSchema = z.object({
  bookingId: id,
  items: z.array(z.object({ addOnId: id, qty: z.number().int().min(1) })).min(1),
});
export type CreateAddOnInput = z.infer<typeof createAddOnSchema>;
export type UpdateAddOnInput = z.infer<typeof updateAddOnSchema>;
export type AddOnOrderInput = z.infer<typeof addOnOrderSchema>;

/** Offers (R5.4 / admin-portal §6.1). Linked to a vendor OR a sponsor (exactly one). */
const offerFields = {
  eventId: id,
  vendorProfileId: id.nullish(),
  sponsorId: id.nullish(),
  title: z.string().min(1).max(60),
  terms: z.string().min(1).max(200),
  kind: z.enum(["DISCOUNT", "FREEBIE", "BUNDLE"]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  maxRedemptions: z.coerce.number().int().positive().nullish(),
};
const oneLink = (o: { vendorProfileId?: string | null; sponsorId?: string | null }) => Boolean(o.vendorProfileId) !== Boolean(o.sponsorId);
const endsAfterStart = (o: { startsAt: Date; endsAt: Date }) => o.endsAt > o.startsAt;
export const createOfferSchema = z
  .object(offerFields)
  .refine(oneLink, { message: "Link the offer to a vendor OR a sponsor (one)." })
  .refine(endsAfterStart, { message: "End must be after start." });
export const updateOfferSchema = z
  .object({ ...offerFields, id })
  .refine(oneLink, { message: "Link the offer to a vendor OR a sponsor (one)." })
  .refine(endsAfterStart, { message: "End must be after start." });
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;

/** Happening strip items (R6.3). Admin creates the manual kinds; LIVE_NOW/STARTING_SOON/OFFER are
 *  auto-sourced from schedule/offers but allowed here for flexibility. Title ≤80 (strip is glanceable). */
const happeningKind = z.enum(["LIVE_NOW", "STARTING_SOON", "OFFER", "ANNOUNCEMENT", "SPONSOR", "ACTIVITY", "WORKSHOP", "PERFORMANCE", "FACILITY"]);
const happeningFields = {
  eventId: id,
  kind: happeningKind,
  emoji: z.string().max(8).optional(),
  title: z.string().min(1).max(80),
  detail: z.string().max(120).optional(),
  href: z.string().max(200).optional(),
  priority: z.coerce.number().int().min(0).max(100).default(0),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
};
export const createHappeningSchema = z.object(happeningFields);
export const updateHappeningSchema = z.object({ ...happeningFields, id });
export type CreateHappeningInput = z.infer<typeof createHappeningSchema>;
export type UpdateHappeningInput = z.infer<typeof updateHappeningSchema>;

// ──────────────────────────── DOCUMENTS & LEGAL ─────────────────
export const LEGAL_DOC_CATEGORIES = ["TERMS", "PRIVACY", "DATA_POLICY", "EVENT_RULES", "EVENT_POLICY", "CONTRACT", "GUIDELINES", "OTHER"] as const;
export const LEGAL_DOC_AUDIENCES = ["PUBLIC", "CUSTOMER", "VENDOR"] as const;
export const DOC_ASSIGNMENT_KINDS = ["BOOKING_CONTRACT", "EVENT_RULES", "EVENT_POLICY"] as const;

// Empty heading = unheaded intro block (renders as plain paragraphs, no <h2>).
export const docSectionSchema = z.object({
  heading: z.string().trim().max(200),
  body: z.string().trim().min(1).max(20000),
});
export const docSectionsSchema = z.array(docSectionSchema).min(1).max(60);

const legalDocFields = {
  title: z.string().trim().min(1).max(160),
  category: z.enum(LEGAL_DOC_CATEGORIES),
  audience: z.enum(LEGAL_DOC_AUDIENCES),
};
export const createLegalDocSchema = z.object({
  ...legalDocFields,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Lowercase letters, digits and dashes only"),
});
/** Sections travel as one JSON hidden input from the editor. */
export const updateLegalDocSchema = z.object({
  id,
  ...legalDocFields,
  sections: z
    .string()
    .transform((s, ctx) => {
      try {
        return JSON.parse(s) as unknown;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid sections payload" });
        return z.NEVER;
      }
    })
    .pipe(docSectionsSchema),
});
export const assignDocSchema = z
  .object({
    docId: id,
    eventId: id,
    stallTypeId: id.optional(),
    vendorCategory: z.enum(PRODUCT_CATEGORIES).optional(),
    kind: z.enum(DOC_ASSIGNMENT_KINDS),
  })
  .refine((v) => !(v.stallTypeId && v.vendorCategory), { message: "Scope to a stall type OR a vendor category, not both." });
export type DocSectionInput = z.infer<typeof docSectionSchema>;
export type CreateLegalDocInput = z.infer<typeof createLegalDocSchema>;
export type UpdateLegalDocInput = z.infer<typeof updateLegalDocSchema>;
export type AssignDocInput = z.infer<typeof assignDocSchema>;

// ──────────────────────────── ARTISTS / TALENT ─────────────────
export const ARTIST_TYPES = ["MUSICIAN", "BAND", "DJ", "PERFORMER", "DANCE", "COMEDIAN", "SPEAKER", "HOST_MC", "OTHER"] as const;

export const artistCreateSchema = z.object({
  stageName: z.string().trim().min(1, "Stage name is required").max(120),
  realName: z.string().trim().max(160).optional(),
  type: z.enum(ARTIST_TYPES).default("MUSICIAN"),
  genre: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(2000).optional(),
  city: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  email: emailOptional,
  instagram: z.string().trim().max(80).optional(),
  // Rate card in PAISE (the action converts the ₹ form field). 0..MAX_PAISE.
  askingFeePaise: z.coerce.number().int().min(0).max(MAX_PAISE).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type ArtistCreateInput = z.infer<typeof artistCreateSchema>;

export const artistUpdateSchema = artistCreateSchema.partial().extend({ id: z.string().min(1) });
export type ArtistUpdateInput = z.infer<typeof artistUpdateSchema>;
