import { z } from "zod";

/**
 * Shared input validators — the single source of truth for field rules, used by BOTH the client
 * (hard limits + live errors via use-field-validation) and the server (schemas.ts / actions).
 * zod-only, no server imports → safe to import in client components.
 *
 * Phone rule (owner): exactly 10 digits, first digit 6-9, stored as E.164 (+91…) to match Firebase.
 */

// ── regex + length limits (also drive client `maxLength` / sanitizers) ────────────────────────────
export const RE = {
  phone: /^[6-9]\d{9}$/,
  phoneE164: /^\+91[6-9]\d{9}$/,
  otp: /^\d{6}$/,
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  fssai: /^\d{14}$/,
  couponCode: /^[A-Z0-9]{3,20}$/,
  pincode: /^\d{6}$/,
  instagram: /^@?[A-Za-z0-9._]{1,30}$/,
} as const;

export const LEN = {
  phone: 10,
  otp: 6,
  pan: 10,
  gstin: 15,
  fssai: 14,
  coupon: 20,
  pincode: 6,
  name: 80,
  email: 160,
} as const;

/** ₹10,00,000 sanity ceiling for retail prices (tickets/add-ons/coupon flat value). */
export const MAX_PAISE = 100_000_000;

// ── sanitizers (apply in onChange for hard input limits) ──────────────────────────────────────────
export const onlyDigits = (s: string) => s.replace(/\D/g, "");
export const capLen = (n: number) => (s: string) => s.slice(0, n);
export const toUpper = (s: string) => s.toUpperCase();
/** digits-only, capped to n (e.g. phone → digitsCapped(10), OTP → digitsCapped(6)). */
export const digitsCapped = (n: number) => (s: string) => onlyDigits(s).slice(0, n);

const blankToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(blankToUndef, schema.optional());

// ── phone (Indian 10-digit → E.164) ───────────────────────────────────────────────────────────────
const PHONE_MSG = "Enter a valid 10-digit mobile number";

/** Normalise to E.164 (+91…) to match the format Firebase returns on phone login. */
export function normalizePhone(raw: string): string {
  const t = raw.trim();
  let digits = t.replace(/\D/g, "");
  if (!t.startsWith("+") && digits.startsWith("0")) digits = digits.slice(1);
  if (t.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

/** What the user types: 10-digit Indian mobile (digits only). */
export const phone10 = z.string().trim().transform(onlyDigits).pipe(z.string().regex(RE.phone, PHONE_MSG));
/** Normalised E.164 (+91…) for storage; accepts 10-digit or 0-prefixed input. */
export const phoneE164 = z.string().trim().transform(normalizePhone).pipe(z.string().regex(RE.phoneE164, PHONE_MSG));
export const phoneE164Optional = optional(phoneE164);

// ── email ─────────────────────────────────────────────────────────────────────────────────────────
export const email = z.string().trim().toLowerCase().pipe(z.string().email("Enter a valid email").max(LEN.email));
export const emailOptional = optional(email);

// ── one-time codes ──────────────────────────────────────────────────────────────────────────────
export const otp6 = z.string().trim().transform(onlyDigits).pipe(z.string().regex(RE.otp, "Enter the 6-digit code"));
/** TOTP (admin 2FA) — same 6-digit shape. */
export const totp6 = otp6;

// ── KYC identifiers (upper-cased / digit-coerced) ─────────────────────────────────────────────────
export const pan = z.string().trim().toUpperCase().pipe(z.string().regex(RE.pan, "Enter a valid PAN (e.g. ABCDE1234F)"));
export const gstin = z.string().trim().toUpperCase().pipe(z.string().regex(RE.gstin, "Enter a valid 15-character GSTIN"));
export const fssai = z.string().trim().transform(onlyDigits).pipe(z.string().regex(RE.fssai, "Enter a valid 14-digit FSSAI number"));
export const panOptional = optional(pan);
export const gstinOptional = optional(gstin);
export const fssaiOptional = optional(fssai);

// ── codes / misc ──────────────────────────────────────────────────────────────────────────────────
export const couponCode = z.string().trim().toUpperCase().pipe(z.string().regex(RE.couponCode, "Use 3-20 letters or numbers"));
export const pincode = z.string().trim().transform(onlyDigits).pipe(z.string().regex(RE.pincode, "Enter a valid 6-digit PIN code"));
export const instagramHandle = optional(z.string().trim().max(30).regex(RE.instagram, "Enter a valid Instagram handle"));
export const urlOptional = optional(z.string().trim().url("Enter a valid URL (https://…)").max(200));

// ── money / quantity ──────────────────────────────────────────────────────────────────────────────
export const pricePaise = z.number().int("Amount must be whole paise").positive("Enter an amount").max(MAX_PAISE, "Amount is too large");
export const paiseNonNeg = z.number().int().nonnegative().max(MAX_PAISE, "Amount is too large");
/** Rupees (decimal allowed) → integer paise, bounded. Use for ₹ inputs that store paise. */
export const rupeesToPaise = z.coerce.number().nonnegative("Enter an amount").transform((r) => Math.round(r * 100)).pipe(paiseNonNeg);
export const quantity = (max = 10000) => z.coerce.number().int("Whole numbers only").min(1, "At least 1").max(max, `At most ${max}`);
export const percent = z.coerce.number().int().min(0).max(100, "0-100 only");

// ── pure validation core (the client hook is a thin wrapper over these — node-testable) ────────────
/** Returns the first error message, or null when valid. */
export function validateValue<T extends z.ZodTypeAny>(schema: T, raw: unknown): string | null {
  const r = schema.safeParse(raw);
  return r.success ? null : (r.error.issues[0]?.message ?? "Invalid value");
}

/** Validates an object and returns a { field: firstMessage } map ({} when all valid). */
export function validateForm(schema: z.ZodType, values: Record<string, unknown>): Record<string, string> {
  const r = schema.safeParse(values);
  if (r.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
