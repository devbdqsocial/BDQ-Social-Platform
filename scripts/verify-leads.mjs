import { PrismaClient } from "@prisma/client";

// Proves lead capture: POST /api/leads creates a Lead row; missing contact is rejected. Dev server up.
// Run: node --env-file=.env scripts/verify-leads.mjs

const db = new PrismaClient();
const APP = "http://localhost:3000";

async function main() {
  const vp = await db.vendorProfile.findFirst({ select: { id: true } });
  if (!vp) throw new Error("Seed first.");
  await db.rateLimit.deleteMany({ where: { key: "leads:local" } });

  const email = `verify-lead+${Date.now()}@example.com`;
  const r = await fetch(`${APP}/api/leads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ vendorProfileId: vp.id, name: "Test Lead", email, consent: true }),
  });
  console.log("capture:", r.status);
  if (r.status !== 200) throw new Error("FAIL: capture rejected");

  const lead = await db.lead.findFirst({ where: { vendorProfileId: vp.id, email } });
  console.log("lead row:", lead ? "created" : "MISSING");
  if (!lead) throw new Error("FAIL: no lead row");

  const bad = await fetch(`${APP}/api/leads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ vendorProfileId: vp.id, name: "No contact" }),
  });
  console.log("no-contact:", bad.status);
  if (bad.status !== 422) throw new Error("FAIL: missing contact not rejected");

  await db.lead.deleteMany({ where: { id: lead.id } });
  console.log("OK: lead capture + validation");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
