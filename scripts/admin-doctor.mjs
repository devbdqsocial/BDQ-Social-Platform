import { PrismaClient } from "@prisma/client";

// Diagnose admin sign-in problems by reporting WHICH database you're connected to and which admin/staff
// accounts can actually log in there. The #1 cause of "id/password not working" is enrolling an admin in
// the local .env DB but logging into the deployed prod DB (a different Neon instance).
//
// Run against local:  node --env-file=.env scripts/admin-doctor.mjs
// Run against prod:    DATABASE_URL="<prod-url>" node scripts/admin-doctor.mjs   (or `vercel env pull`)

const db = new PrismaClient();

/** Show the host (and db name) of a Postgres URL without leaking the password. */
function describeDb(url) {
  if (!url) return "(DATABASE_URL not set)";
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  console.log(`\nDB host: ${describeDb(process.env.DATABASE_URL)}\n`);

  const admins = await db.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "STAFF"] } },
    select: { email: true, role: true, passwordHash: true, totpEnabled: true, totpSecret: true, recoveryCodes: true },
    orderBy: { role: "asc" },
  });

  if (admins.length === 0) {
    console.log("No SUPER_ADMIN / ADMIN / STAFF accounts in THIS database.");
    console.log("→ Enroll one:  node scripts/admin-enroll.mjs <email> \"<password>\"  (against this same DB)\n");
    return;
  }

  console.log(`${admins.length} admin/staff account(s) in this database:\n`);
  for (const a of admins) {
    const hasPassword = !!a.passwordHash;
    const has2fa = a.totpEnabled && !!a.totpSecret;
    const ready = hasPassword && (a.role === "STAFF" || has2fa);
    // SUPER_ADMIN/ADMIN are rejected unless 2FA is enabled (src/app/api/auth/admin/route.ts).
    const prodBlocked = (a.role === "SUPER_ADMIN" || a.role === "ADMIN") && !has2fa;
    console.log(
      `  ${a.email ?? "(no email)"}  [${a.role}]  ready:${ready ? "yes" : "NO"}  password:${hasPassword ? "yes" : "NO"}  2fa:${has2fa ? "on" : "off"}  backupCodes:${a.recoveryCodes.length}` +
        (prodBlocked ? "  ⚠ blocked on prod (needs 2FA)" : "") +
        (!hasPassword ? "  ⚠ cannot sign in (no password)" : ""),
    );
  }
  console.log("");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
