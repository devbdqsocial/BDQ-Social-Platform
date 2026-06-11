import { db } from "@/server/db";
import { verifyUnsubscribe } from "@/lib/unsubscribe-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Messages are hardcoded today, but escape anyway so a future interpolation can't become XSS.
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(message: string): Response {
  return new Response(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribe — BDQ Social</title></head>
<body style="margin:0;background:#FBF7F0;font-family:Inter,Arial,sans-serif;color:#352F26;display:flex;min-height:100vh;align-items:center;justify-content:center">
  <div style="text-align:center;max-width:420px;padding:24px">
    <div style="font-size:20px;font-weight:600">BDQ <span style="color:#D69A22">Social</span></div>
    <p style="margin-top:16px;color:#6F6552">${escapeHtml(message)}</p>
  </div>
</body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const contact = (url.searchParams.get("c") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("t") ?? "";

  if (!contact || !verifyUnsubscribe(contact, token)) {
    return page("This unsubscribe link is invalid or has expired.");
  }

  await db.suppression.upsert({
    where: { contact },
    update: {},
    create: { contact, reason: "user_unsubscribe" },
  });

  return page("You've been unsubscribed. You won't receive further marketing messages from us.");
}
