import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes, createHash } from "crypto";
import { generateSecret } from "otplib";
import QRCode from "qrcode";

// Enroll (or rotate) a SUPER_ADMIN: sets an email/password credential, a TOTP secret, and backup
// codes. Re-runnable; each run invalidates old authenticator setup and old backup codes. Run:
//   node --env-file=.env scripts/admin-enroll.mjs admin@example.com "your-password"

const db = new PrismaClient();
const BACKUP_CODE_COUNT = 10;

// Must match src/lib/password.ts (salt:hash hex, scrypt, keylen 64).
function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

function otpauthUrl(account, secret, issuer = "BDQSocial") {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

function hashBackupCode(code) {
  return createHash("sha256").update(code.toLowerCase().replace(/[^a-z0-9]/g, "")).digest("hex");
}

function generateBackupCodes() {
  const plain = [];
  const hashes = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const hex = randomBytes(4).toString("hex");
    const code = `${hex.slice(0, 4)}-${hex.slice(4)}`;
    plain.push(code);
    hashes.push(hashBackupCode(code));
  }
  return { plain, hashes };
}

async function main() {
  const email = (process.argv[2] || "").toLowerCase();
  const password = process.argv[3];
  if (!email || !password) {
    console.error('Usage: node --env-file=.env scripts/admin-enroll.mjs <email> "<password>"');
    process.exit(1);
  }

  const secret = generateSecret();
  const passwordHash = hashPassword(password);
  const { plain, hashes } = generateBackupCodes();
  const data = {
    role: "SUPER_ADMIN",
    passwordHash,
    totpSecret: secret,
    totpEnabled: true,
    totpPendingSecret: null,
    recoveryCodes: hashes,
  };

  const user = await db.user.upsert({
    where: { email },
    update: data,
    create: { email, name: "Admin", ...data },
  });

  const url = otpauthUrl(email, secret);
  console.log(`\nEnrolled SUPER_ADMIN: ${email} (${user.id})\n`);
  console.log("Scan this in your authenticator app (Google Authenticator / Authy):\n");
  console.log(await QRCode.toString(url, { type: "terminal", small: true }));
  console.log(`Or enter the secret manually: ${secret}`);
  console.log("\nSave these one-time backup codes now:");
  for (const code of plain) console.log(`  ${code}`);
  console.log(`otpauth URL: ${url}\n`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
