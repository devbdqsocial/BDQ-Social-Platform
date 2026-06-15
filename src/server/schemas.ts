import { z } from "zod";

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

export const createEventSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  location: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  capacity: z.number().int().positive().optional(),
});

export const ticketTypeSchema = z.object({
  name: z.string().min(1),
  priceInPaise: paise,
  earlyPricePaise: paise.optional(),
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
export const createOrderSchema = z.object({
  eventId: id,
  items: z
    .array(z.object({ ticketTypeId: id, qty: z.number().int().positive() }))
    .min(1)
    .refine((items) => items.reduce((s, i) => s + i.qty, 0) <= 10, {
      message: "Max 10 tickets per order",
    }),
  couponCode: z.string().trim().min(1).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3),
  type: z.enum(["FLAT", "PERCENT"]),
  value: z.number().int().nonnegative(),
  maxUses: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
  minOrder: paise.optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  active: z.boolean().default(true),
});

export const scheduleItemSchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  title: z.string().min(1),
  stageOrZone: z.string().optional(),
  performer: z.string().optional(),
});

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

export const leadSchema = z
  .object({
    vendorProfileId: id,
    name: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(20).optional(),
    email: z.string().trim().email().max(120).optional().or(z.literal("").transform(() => undefined)),
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
  whatsapp: optionalText(20),
  city: optionalText(80),
});

/** Contract e-sign: typed legal name + explicit agreement (captured with time + IP server-side). */
export const contractSignSchema = z.object({
  signerName: z.string().trim().min(2).max(120),
  agree: z.coerce.boolean().refine((v) => v === true, { message: "You must agree to the terms to sign" }),
});

/** Normalise to E.164 (+91…) to match the format Firebase returns on phone login. */
export function normalizePhone(raw: string): string {
  const t = raw.trim();
  let digits = t.replace(/\D/g, "");
  if (!t.startsWith("+") && digits.startsWith("0")) {
    digits = digits.substring(1);
  }
  if (t.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

export const adminCreateVendorSchema = z.object({
  phone: z.string().transform(normalizePhone).pipe(z.string().regex(/^\+\d{10,15}$/, "Enter a valid phone number")),
  name: z.string().trim().max(120).optional(),
  brandName: z.string().min(2),
  category: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
});

/** KYC is verify-only (no GST billing) — BUSINESS-RULES §2.5. */
export const vendorKycSchema = z.object({
  pan: z.string().trim().min(10).max(10).optional(),
  fssai: z.string().trim().optional(),
  gstin: z.string().trim().optional(),
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
  pricePaise: paise.refine((n) => n > 0, "Price required"),
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
