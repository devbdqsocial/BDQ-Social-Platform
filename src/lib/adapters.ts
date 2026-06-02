/**
 * External service adapters (CLAUDE.md). All third-party SDK calls go through these, so providers
 * are swappable behind one interface. Each adapter no-ops or throws cleanly when its key is missing.
 */

// Razorpay — orders + webhook verification (idempotent fulfilment by gatewayRef)
export { createRazorpayOrder, verifyWebhookSignature } from "@/lib/razorpay";

// Firebase — verify phone-OTP ID token (via Google JWKS, no service account; see firebase-verify)
export { verifyFirebaseIdToken } from "@/lib/firebase-verify";

// WhatsApp — official Cloud API or Interakt, behind one facade (dormant until configured)
export { sendWhatsApp, whatsAppConfigured } from "@/lib/whatsapp";

// Resend — transactional email
export { sendEmail, resendConfigured } from "@/lib/resend";

// Cloudinary — signed direct uploads for vendor assets
export { signUpload } from "@/lib/cloudinary";
