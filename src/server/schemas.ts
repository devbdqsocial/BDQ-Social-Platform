import { z } from "zod";

/**
 * Input schemas for the API/server-action contracts (Docs/API.md). Used by withValidation.
 * Money is integer paise; prices are dynamic (supplied per request, never hardcoded).
 */

const paise = z.number().int().nonnegative();
const ft = z.number().positive();
const id = z.string().min(1);

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

export const sponsorSchema = z.object({
  eventId: id,
  name: z.string().min(1),
  tier: z.enum(["TITLE", "POWERED_BY", "ZONE", "STALL", "ASSOCIATE"]),
  logoUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
});

export const waitlistSchema = z.object({
  eventId: id,
  type: z.enum(["TICKET", "STALL"]).default("TICKET"),
  contact: z.string().trim().min(3).max(120),
});

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #C2603B")
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

export const stallHoldSchema = z.object({ stallId: id });

export const checkinSchema = z.object({
  qrToken: z.string().min(1),
  gate: z.string().optional(),
  direction: z.enum(["IN", "OUT"]).default("IN"),
  clientScanId: z.string().optional(),
});

export const vendorProfileSchema = z.object({
  brandName: z.string().min(2),
  category: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
});

/** Normalise to E.164 (+91…) to match the format Firebase returns on phone login. */
export function normalizePhone(raw: string): string {
  const t = raw.trim();
  const digits = t.replace(/\D/g, "");
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

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
export type VendorProfileInput = z.infer<typeof vendorProfileSchema>;
export type VendorKycInput = z.infer<typeof vendorKycSchema>;
