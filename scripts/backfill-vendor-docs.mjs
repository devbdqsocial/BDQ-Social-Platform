// Backfill VendorDoc rows from the legacy VendorKyc.docUrls JSON. Idempotent (upsert by
// [vendorProfileId, docType]) — safe to re-run.
//   local: node --env-file=.env scripts/backfill-vendor-docs.mjs
//   prod:  set DATABASE_URL to PROD_DATABASE_URL_DIRECT first (run AFTER the prod migration).
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const TYPES = ["pan", "fssai", "gst", "id"];

const rows = await db.vendorKyc.findMany({ select: { vendorProfileId: true, docUrls: true } });
let created = 0;
for (const r of rows) {
  const docs = r.docUrls ?? {};
  for (const t of TYPES) {
    const d = docs[t];
    if (!d?.url) continue;
    await db.vendorDoc.upsert({
      where: { vendorProfileId_docType: { vendorProfileId: r.vendorProfileId, docType: t } },
      update: {},
      create: { vendorProfileId: r.vendorProfileId, docType: t, url: d.url, publicId: d.publicId ?? "" },
    });
    created++;
  }
}
console.log(`backfilled ${created} docs from ${rows.length} VendorKyc rows`);
await db.$disconnect();
