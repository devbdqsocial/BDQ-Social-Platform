// Post-deploy vendor smoke: hits the key vendor surfaces and exits non-zero on any failure.
//   local: node scripts/smoke-vendor.mjs
//   prod:  BASE_URL=https://bdqsocial.com VENDOR_URL=https://vendors.bdqsocial.com node scripts/smoke-vendor.mjs
const base = process.env.BASE_URL ?? "http://localhost:3000";
const vendorBase = process.env.VENDOR_URL ?? `${base}/vendor`;

const checks = [
  { name: "health", url: `${base}/api/health`, expect: null },
  { name: "vendor login", url: `${vendorBase}/login`, expect: "Vendor sign in" },
  { name: "vendor signup", url: `${vendorBase}/signup`, expect: "Become a vendor" },
  // Unauthenticated → login. Local dev serves the portal instead (DEV_VENDOR bypass): SMOKE_DEV=1 skips.
  ...(process.env.SMOKE_DEV ? [] : [{ name: "portal auth gate", url: `${vendorBase}/home`, expect: "Vendor sign in" }]),
  { name: "public brands", url: `${base}/vendors`, expect: null },
];

let failed = 0;
for (const c of checks) {
  try {
    const res = await fetch(c.url, { redirect: "follow", headers: { "user-agent": "bdq-smoke" } });
    const body = await res.text();
    const ok = res.ok && (!c.expect || body.includes(c.expect));
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}  (${res.status}) ${c.url}`);
    if (!ok) failed++;
  } catch (e) {
    console.log(`FAIL  ${c.name}  ${c.url} — ${e.message}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nvendor smoke: all green");
