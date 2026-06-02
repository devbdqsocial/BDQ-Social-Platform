import { Resend } from "resend";

// Proves the Resend key + send path by emailing Resend's SIMULATED success address
// (delivered@resend.dev) — no real inbox is emailed.
// Run: node --env-file=.env scripts/verify-email.mjs

const key = process.env.RESEND_API_KEY;
if (!key) throw new Error("RESEND_API_KEY not set");
const from = process.env.EMAIL_FROM ?? "BDQ Social <onboarding@resend.dev>";

const resend = new Resend(key);
const { data, error } = await resend.emails.send({
  from,
  to: "delivered@resend.dev",
  subject: "BDQ Social — email integration test",
  html: "<p>Resend integration verified for BDQ Social.</p>",
});

if (error) {
  console.error("FAIL:", JSON.stringify(error));
  process.exit(1);
}
console.log("OK sent (simulated), message id:", data?.id);
