import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebaseIdToken } from "@/lib/firebase-verify";
import { db } from "@/server/db";
import { createSession } from "@/server/auth/session";
import { enforceRateLimit } from "@/lib/ratelimit";
import type { Role } from "@/server/auth/guard";

export const runtime = "nodejs";

const bodySchema = z.object({ idToken: z.string().min(10), zone: z.enum(["vendor", "customer"]).optional() });

/** Exchange a Firebase ID token for an app session. Role from the explicit zone, else the hostname. */
export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, "auth", 30, 10 * 60 * 1000);
  if (limited) return limited;

  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION" } }, { status: 422 });
  }

  let verified;
  try {
    verified = await verifyFirebaseIdToken(body.idToken);
  } catch {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }

  const host = (req.headers.get("host") ?? "").toLowerCase();
  // Prefer the login page's declared zone (works on the preview domain with no subdomains); else host.
  const role: Role = body.zone ? (body.zone === "vendor" ? "VENDOR" : "CUSTOMER") : host.startsWith("vendors.") ? "VENDOR" : "CUSTOMER";

  // Match by firebaseUid first; else link to a pre-created account by phone (admin-provisioned
  // vendors have a phone but no uid). Linking keeps the existing role — never downgrade a VENDOR.
  let user = await db.user.findUnique({ where: { firebaseUid: verified.uid } });
  if (user) {
    user = await db.user.update({ where: { id: user.id }, data: { phone: verified.phone, email: verified.email } });
  } else if (verified.phone && (user = await db.user.findUnique({ where: { phone: verified.phone } }))) {
    user = await db.user.update({
      where: { id: user.id },
      data: { firebaseUid: verified.uid, email: user.email ?? verified.email },
    });
  } else {
    user = await db.user.create({ data: { firebaseUid: verified.uid, phone: verified.phone, email: verified.email, role } });
  }

  await createSession({ userId: user.id, role: user.role, permissions: user.permissions });
  return NextResponse.json({ ok: true, data: { userId: user.id, role: user.role } });
}
