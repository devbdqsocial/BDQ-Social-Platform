import sgMail from "@sendgrid/mail";

// Proves the SendGrid key + send path using sandbox mode (validates without delivering).
// Run: node --env-file=.env scripts/verify-email.mjs

const key = process.env.SENDGRID_API_KEY;
if (!key) throw new Error("SENDGRID_API_KEY not set");
const fromRaw = process.env.EMAIL_FROM ?? "BDQ Social <hello@bdqsocial.com>";
const m = fromRaw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
const from = m ? { email: m[2].trim(), name: m[1] || undefined } : { email: fromRaw.trim() };

const html = `<!doctype html>
<html lang="en">
<body style="margin:0;background:#F7F3EA;font-family:Inter,Arial,sans-serif;color:#13172F">
  <div style="max-width:620px;margin:0 auto;padding:28px 14px">
    <div style="background:#01065B;color:#FFFFFF;border-radius:22px 22px 0 0;padding:28px">
      <p style="margin:0;color:#92FF73;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase">Integration test</p>
      <h1 style="margin:8px 0 0;font-size:32px;line-height:1.05">Email is working</h1>
    </div>
    <div style="background:#FFFFFF;border:1px solid #DDD8F0;border-top:none;border-radius:0 0 22px 22px;padding:28px">
      <p style="margin:0;font-weight:800">SendGrid integration verified for BDQ Social.</p>
    </div>
  </div>
</body>
</html>`;

sgMail.setApiKey(key);

try {
  const [res] = await sgMail.send({
    from,
    to: from.email,
    subject: "BDQ Social - email integration test",
    html,
    mailSettings: { sandboxMode: { enable: true } },
  });
  console.log("OK validated (sandbox, no delivery), message id:", res.headers["x-message-id"] ?? "(none)");
} catch (err) {
  console.error("FAIL:", JSON.stringify(err?.response?.body ?? err?.message ?? err));
  process.exit(1);
}
