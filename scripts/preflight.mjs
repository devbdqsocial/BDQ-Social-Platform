import { PrismaClient } from "@prisma/client";

// Pre-deploy sanity check. Run: node --env-file=.env scripts/preflight.mjs
// Exits non-zero on a hard miss (missing required env or unreachable DB).

const REQUIRED = ["DATABASE_URL", "DATABASE_URL_DIRECT", "SESSION_SECRET", "CRON_SECRET", "APP_BASE_DOMAIN"];

const FEATURES = {
  "Payments (Razorpay)": ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "NEXT_PUBLIC_RAZORPAY_KEY_ID"],
  "Email (SendGrid)": ["SENDGRID_API_KEY", "EMAIL_FROM"],
  "WhatsApp (Cloud API)": ["WHATSAPP_CLOUD_TOKEN", "WHATSAPP_CLOUD_PHONE_ID"],
  "Login (Firebase)": ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  "Uploads (Cloudinary)": ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
};

let hardFail = false;
const warn = (m) => console.log(`  ⚠ ${m}`);

console.log("\nRequired environment:");
for (const k of REQUIRED) {
  if (process.env[k]) console.log(`  ✓ ${k}`);
  else {
    console.log(`  ✗ ${k} MISSING`);
    hardFail = true;
  }
}

console.log("\nFeature env (optional — dormant until set):");
for (const [name, keys] of Object.entries(FEATURES)) {
  const have = keys.filter((k) => process.env[k]).length;
  console.log(`  ${have === keys.length ? "✓" : have === 0 ? "·" : "partial"} ${name} (${have}/${keys.length})`);
}

console.log("\nSafety:");
if (process.env.DEV_ADMIN === "true" || process.env.DEV_VENDOR === "true") {
  warn("DEV_ADMIN/DEV_VENDOR is true — must be off in production (open admin/vendor access).");
}
if (process.env.SENDGRID_API_KEY && !process.env.EMAIL_FROM) {
  warn("SENDGRID_API_KEY is set but EMAIL_FROM is empty — SendGrid rejects sends from an unverified sender.");
}

console.log("\nDatabase:");
const db = new PrismaClient();
try {
  await db.$queryRaw`SELECT 1`;
  console.log("  ✓ reachable");
} catch (e) {
  console.log(`  ✗ unreachable: ${e.message?.slice(0, 120)}`);
  hardFail = true;
}
await db.$disconnect();

console.log(hardFail ? "\nPREFLIGHT FAILED\n" : "\nPreflight OK\n");
process.exit(hardFail ? 1 : 0);
