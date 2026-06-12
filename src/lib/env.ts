import { z } from "zod";

/**
 * Typed, validated environment. Server-only secrets must never be imported into client code.
 * In P0 (local, no external keys) everything is optional so the app boots; slice 2 wires real keys.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_DOMAIN: z.string().default("bdqsocial.com"),
  DEV_ADMIN: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  DEV_VENDOR: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  // Database (Neon)
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_DIRECT: z.string().optional(),

  // Auth / app secrets
  SESSION_SECRET: z.string().optional(),
  // Dedicated key for ticket QR HMAC (falls back to SESSION_SECRET if unset).
  QR_TOKEN_SECRET: z.string().optional(),
  // AES-256-GCM key (base64, 32 bytes) for KYC field encryption. Required once KYC is collected.
  KYC_ENC_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  // Error monitoring (Sentry) — optional; instrumentation is fully inert when unset.
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  // TESTING ONLY: comma-list of admin emails allowed to sign in without TOTP. Empty in real prod.
  ADMIN_NO_2FA_EMAILS: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),

  // Payments / messaging / storage
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  // WhatsApp — official Cloud API (default) or Interakt, behind one facade
  WHATSAPP_PROVIDER: z.enum(["cloud", "interakt"]).optional(),
  WHATSAPP_CLOUD_TOKEN: z.string().optional(),
  WHATSAPP_CLOUD_PHONE_ID: z.string().optional(),
  WHATSAPP_CLOUD_API_VERSION: z.string().optional(),
  WHATSAPP_TEMPLATE_TICKET: z.string().optional(),
  WHATSAPP_TEMPLATE_LANG: z.string().optional(),
  INTERAKT_API_KEY: z.string().optional(),
  INTERAKT_BASE_URL: z.string().optional(),
  INTERAKT_TEMPLATE_TICKET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const prodSchema = schema.superRefine((v, ctx) => {
  // Skip during local dev, test, and `next build` (build phase sets NEXT_PHASE=phase-production-build).
  if (v.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const required: Array<[keyof typeof v, string]> = [
    ["SESSION_SECRET", "SESSION_SECRET must be set in production"],
    ["CRON_SECRET", "CRON_SECRET must be set in production"],
    ["RAZORPAY_WEBHOOK_SECRET", "RAZORPAY_WEBHOOK_SECRET must be set in production"],
    ["DATABASE_URL", "DATABASE_URL must be set in production"],
  ];
  for (const [key, msg] of required) {
    if (!v[key]) ctx.addIssue({ code: "custom", path: [key], message: msg });
  }
  // Auth bypasses are already inert in prod (every call site gates on NODE_ENV !== "production":
  // guard.ts DEV_ADMIN, vendor layout DEV_VENDOR, admin route ADMIN_NO_2FA_EMAILS). A stray flag
  // grants no access, so warn loudly to get it cleaned up — but don't crash the app over a no-op.
  if (v.DEV_ADMIN) console.error("[env] DEV_ADMIN is set in production (ignored at runtime; remove it).");
  if (v.DEV_VENDOR) console.error("[env] DEV_VENDOR is set in production (ignored at runtime; remove it).");
  if ((v.ADMIN_NO_2FA_EMAILS ?? "").trim())
    console.error("[env] ADMIN_NO_2FA_EMAILS is non-empty in production (ignored at runtime; clear it).");
  if (v.SESSION_SECRET && v.SESSION_SECRET.length < 32) {
    ctx.addIssue({ code: "custom", path: ["SESSION_SECRET"], message: "SESSION_SECRET must be at least 32 characters" });
  }
  if (v.CRON_SECRET && v.CRON_SECRET.length < 32) {
    ctx.addIssue({ code: "custom", path: ["CRON_SECRET"], message: "CRON_SECRET must be at least 32 characters" });
  }
});

export const env = prodSchema.parse(process.env);
export type Env = z.infer<typeof schema>;
