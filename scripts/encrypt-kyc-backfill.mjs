// One-off: encrypt existing plaintext VendorKyc PII (PAN/GSTIN/FSSAI) in place.
// Usage: KYC_ENC_KEY=<base64-32-bytes> DATABASE_URL=... node scripts/encrypt-kyc-backfill.mjs
// Idempotent: rows already in `enc:v1:` form are skipped. Run once after deploying field encryption.
import { PrismaClient } from "@prisma/client";
import { createCipheriv, randomBytes } from "crypto";

const PREFIX = "enc:v1:";
const keyB64 = process.env.KYC_ENC_KEY;
if (!keyB64) {
  console.error("KYC_ENC_KEY not set");
  process.exit(1);
}
const key = Buffer.from(keyB64, "base64");
if (key.length !== 32) {
  console.error("KYC_ENC_KEY must be base64-encoded 32 bytes");
  process.exit(1);
}

function enc(v) {
  if (v == null || v === "" || v.startsWith(PREFIX)) return v ?? null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(v, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

const db = new PrismaClient();
try {
  const rows = await db.vendorKyc.findMany();
  let n = 0;
  for (const r of rows) {
    const data = { pan: enc(r.pan), fssai: enc(r.fssai), gstin: enc(r.gstin) };
    if (data.pan !== r.pan || data.fssai !== r.fssai || data.gstin !== r.gstin) {
      await db.vendorKyc.update({ where: { id: r.id }, data });
      n++;
    }
  }
  console.log(`Encrypted ${n} KYC row(s) of ${rows.length}.`);
} finally {
  await db.$disconnect();
}
