import "server-only";
import { whatsAppConfigured, whatsAppProvider } from "@/lib/whatsapp";
import { emailConfigured } from "@/lib/sendgrid";

/**
 * Read-only integration status (never the secret values). "Configured" means the keys exist; it does
 * not ping the provider. Used by the Settings › Integrations board + System Health.
 * SendGrid resolves DB-first (systemSetting) via emailConfigured(), so a key stored in the DB — not
 * just env — counts as configured.
 */

export type IntegrationStatus = { name: string; configured: boolean; detail: string };

const has = (k: string) => !!process.env[k];

export async function integrationStatuses(): Promise<IntegrationStatus[]> {
  const provider = whatsAppProvider();

  return [
    { name: "Database (Neon)", configured: has("DATABASE_URL"), detail: "Postgres connection" },
    { name: "Razorpay", configured: has("RAZORPAY_KEY_ID") && has("RAZORPAY_KEY_SECRET") && has("RAZORPAY_WEBHOOK_SECRET"), detail: "Payments + webhook" },
    { name: "Firebase Auth", configured: has("NEXT_PUBLIC_FIREBASE_PROJECT_ID"), detail: "Customer / vendor phone login" },
    { name: "Cloudinary", configured: has("CLOUDINARY_CLOUD_NAME") && has("CLOUDINARY_API_KEY") && has("CLOUDINARY_API_SECRET"), detail: "Image / asset uploads" },
    { name: "SendGrid (email)", configured: await emailConfigured(), detail: "Transactional email" },
    { name: "WhatsApp", configured: whatsAppConfigured(), detail: provider ? `Provider: ${provider}` : "No provider set" },
    { name: "Sentry", configured: has("SENTRY_DSN"), detail: "Error monitoring" },
  ];
}
