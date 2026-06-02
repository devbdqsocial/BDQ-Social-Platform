import { PrismaClient } from "@prisma/client";

// Proves the rate limiter: hammering /api/auth/verify past the window limit returns 429.
// Needs the dev server running. Run: node --env-file=.env scripts/verify-ratelimit.mjs

const db = new PrismaClient();
const APP = "http://localhost:3000";

const hit = () =>
  fetch(`${APP}/api/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken: "x".repeat(20) }),
  }).then((r) => r.status);

async function main() {
  await db.rateLimit.deleteMany({ where: { key: { startsWith: "auth:" } } });

  let blockedAt = 0;
  for (let i = 1; i <= 40; i++) {
    const status = await hit();
    if (status === 429) {
      blockedAt = i;
      break;
    }
  }
  console.log(blockedAt ? `429 at request #${blockedAt}` : "never blocked");
  if (!blockedAt) throw new Error("FAIL: rate limit never triggered");

  await db.rateLimit.deleteMany({ where: { key: { startsWith: "auth:" } } });
  console.log("OK: rate limit enforced (429); row reset");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
