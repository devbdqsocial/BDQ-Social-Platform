import { rejectCrossOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebaseIdToken } from "@/lib/firebase-verify";
import { db } from "@/server/db";
import { createSession, revokeSessions } from "@/server/auth/session";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  idToken: z.string().min(10),
  zone: z.enum(["vendor", "customer"]).optional(),
  // Deliberate self-serve vendor signup (the ONLY path that grants VENDOR without admin). Sent only
  // by the vendor signup wizard — never by the generic login form.
  vendorSignup: z.boolean().optional(),
});

/** Exchange a Firebase ID token for an app session. New accounts are always CUSTOMER. */
export async function POST(req: Request) {
  const cross = rejectCrossOrigin(req);
  if (cross) return cross;

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

  // Match by firebaseUid first; else link to a pre-created account by phone (admin-provisioned
  // vendors have a phone but no uid). Linking keeps the existing role — never downgrade a VENDOR.
  // A genuinely new account is ALWAYS created CUSTOMER: VENDOR/STAFF/admin roles are granted only by
  // admin provisioning + team call-back (CLAUDE.md locked rule), never self-served via the zone.
  let user = await db.user.findUnique({ where: { firebaseUid: verified.uid } });
  if (user) {
    user = await db.user.update({ where: { id: user.id }, data: { phone: verified.phone, email: verified.email } });
  } else if (verified.phone && (user = await db.user.findUnique({ where: { phone: verified.phone } }))) {
    user = await db.user.update({
      where: { id: user.id },
      data: { firebaseUid: verified.uid, email: user.email ?? verified.email },
    });
  } else {
    user = await db.user.create({ data: { firebaseUid: verified.uid, phone: verified.phone, email: verified.email, role: "CUSTOMER" } });
  }

  // Deliberate vendor self-signup: create the applicant profile (SUBMITTED) and elevate to VENDOR.
  // Booking is only confirmed after a team call-back + admin approval (CLAUDE.md locked rule).
  if (body.vendorSignup && user.role !== "SUPER_ADMIN") {
    const existing = await db.vendorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!existing) {
      await db.vendorProfile.create({ data: { userId: user.id, brandName: "New vendor", approvalStatus: "SUBMITTED" } });
    }
    if (user.role !== "VENDOR") {
      user = await db.user.update({ where: { id: user.id }, data: { role: "VENDOR" } });
      // Role changed: kill any outstanding sessions issued with the old claims.
      // createSession below reads the bumped tokenVersion, so this login stays valid.
      await revokeSessions(user.id);
    }
    await db.auditLog.create({
      data: { actorId: user.id, role: user.role, action: "CREATE", entity: "VendorProfile", entityId: user.id, after: { selfSignup: true } },
    });
  }

  await createSession({ userId: user.id, role: user.role, permissions: user.permissions });
  return NextResponse.json({ ok: true, data: { userId: user.id, role: user.role } });
}
