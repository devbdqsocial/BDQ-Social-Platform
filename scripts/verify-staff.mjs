import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

// Proves staff accounts: a STAFF user (no TOTP) signs in with email+password and gets the right
// permissions; after access is revoked, the same login is rejected. Needs the dev server running.
// Run: npm run dev (another shell) then node --env-file=.env scripts/verify-staff.mjs

const db = new PrismaClient();
const APP = "http://localhost:3000";

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
const post = (body) =>
  fetch(`${APP}/api/auth/admin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

async function main() {
  const email = `verify-staff+${Date.now()}@bdqsocial.com`;
  const password = "staffPass-123";

  await db.rateLimit.deleteMany({ where: { key: "admin-auth:local" } });
  const staff = await db.user.create({
    data: { email, name: "Verify Staff", role: "STAFF", permissions: ["CHECKIN"], passwordHash: hashPassword(password) },
  });

  try {
    // 1) staff signs in with just password (no TOTP required for STAFF)
    const ok = await post({ email, password });
    const j = await ok.json().catch(() => ({}));
    console.log(`staff login: ${ok.status}, role=${j?.data?.role}`);
    if (ok.status !== 200 || j?.data?.role !== "STAFF") throw new Error("FAIL: staff login did not succeed");

    const fresh = await db.user.findUnique({ where: { id: staff.id }, select: { permissions: true } });
    console.log(`permissions=[${fresh.permissions.join(",")}]`);
    if (!(fresh.permissions.length === 1 && fresh.permissions[0] === "CHECKIN")) throw new Error("FAIL: wrong permissions");

    // 2) revoke access → login rejected
    await db.user.update({ where: { id: staff.id }, data: { passwordHash: null, permissions: [] } });
    await db.rateLimit.deleteMany({ where: { key: "admin-auth:local" } });
    const after = await post({ email, password });
    console.log(`after revoke: ${after.status}`);
    if (after.status !== 401) throw new Error("FAIL: revoked staff still logs in");

    console.log("OK: staff login (no TOTP) + correct permissions + access revocation");
  } finally {
    await db.user.deleteMany({ where: { id: staff.id } });
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
