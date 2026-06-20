import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes, createHash } from "crypto";
import { generateSecret, generateSync } from "otplib";

// Matches src/lib/backup-codes.ts: sha256 of the code lowercased with non-alphanumerics stripped.
const hashBackupCode = (code) => createHash("sha256").update(code.toLowerCase().replace(/[^a-z0-9]/g, "")).digest("hex");

// Proves admin sign-in: correct password + TOTP -> 200 + session cookie; wrong code -> 401;
// a non-admin credential -> 401; a backup code works once then is rejected. Needs the dev server running.
// Run: npm run dev (another shell) then node --env-file=.env scripts/verify-admin-login.mjs

const db = new PrismaClient();
const APP = "http://localhost:3000";

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

const post = (body) =>
  fetch(`${APP}/api/auth/admin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

async function main() {
  const ts = Date.now();
  const adminEmail = `verify-admin+${ts}@bdqsocial.com`;
  const custEmail = `verify-cust+${ts}@bdqsocial.com`;
  const password = "verifyPass-123";
  const secret = generateSecret();

  // clear the shared local rate-limit bucket so repeated runs don't trip the limiter
  await db.rateLimit.deleteMany({ where: { key: "admin-auth:local" } });

  const admin = await db.user.create({
    data: { email: adminEmail, role: "SUPER_ADMIN", passwordHash: hashPassword(password), totpSecret: secret, totpEnabled: true },
  });
  const cust = await db.user.create({
    data: { email: custEmail, role: "CUSTOMER", passwordHash: hashPassword(password) },
  });

  try {
    // 1) correct password + current TOTP -> 200 + session cookie
    const ok = await post({ email: adminEmail, password, code: generateSync({ secret }) });
    const cookie = ok.headers.get("set-cookie") ?? "";
    console.log(`correct creds: ${ok.status}, session cookie: ${cookie.includes("bdq_session") ? "set" : "MISSING"}`);
    if (ok.status !== 200 || !cookie.includes("bdq_session")) throw new Error("FAIL: valid login did not succeed");

    // 2) wrong TOTP -> 401
    const current = generateSync({ secret });
    const wrong = current === "000000" ? "111111" : "000000";
    const bad = await post({ email: adminEmail, password, code: wrong });
    console.log(`wrong code: ${bad.status}`);
    if (bad.status !== 401) throw new Error("FAIL: wrong code was not rejected");

    // 3) non-admin credential -> 401 (even with right password)
    const nonAdmin = await post({ email: custEmail, password });
    console.log(`non-admin: ${nonAdmin.status}`);
    if (nonAdmin.status !== 401) throw new Error("FAIL: customer was allowed into admin");

    // 4) backup code works once, then is consumed (single-use)
    await db.user.update({ where: { id: admin.id }, data: { recoveryCodes: [hashBackupCode("backup01")] } });
    await db.rateLimit.deleteMany({ where: { key: "admin-auth:local" } });
    const recover = await post({ email: adminEmail, password, backupCode: "backup01" });
    console.log(`backup code (1st use): ${recover.status}`);
    if (recover.status !== 200) throw new Error("FAIL: valid backup code was not accepted");
    const reuse = await post({ email: adminEmail, password, backupCode: "backup01" });
    console.log(`backup code (reuse): ${reuse.status}`);
    if (reuse.status !== 401) throw new Error("FAIL: backup code was accepted twice (not single-use)");

    console.log("OK: admin login (password + TOTP) + rejects wrong code + rejects non-admin + single-use backup code");
  } finally {
    await db.user.deleteMany({ where: { id: { in: [admin.id, cust.id] } } });
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
