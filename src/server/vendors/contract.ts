import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/** Vendor participation contract (e-sign). One per vendor; approval requires SIGNED. */

export function getContract(vendorProfileId: string) {
  return db.vendorContract.findUnique({ where: { vendorProfileId } });
}

export async function getOrCreateContract(vendorProfileId: string) {
  return db.vendorContract.upsert({
    where: { vendorProfileId },
    update: {},
    create: { vendorProfileId, status: "SENT" },
  });
}

export function signContract(session: Session, vendorProfileId: string) {
  return withAudit(session, { action: "SIGN", entity: "VendorContract", entityId: vendorProfileId }, async () => {
    const before = await db.vendorContract.findUnique({ where: { vendorProfileId }, select: { status: true } });
    return {
      before,
      run: async () => {
        const c = await db.vendorContract.upsert({
          where: { vendorProfileId },
          update: { status: "SIGNED", signedAt: new Date() },
          create: { vendorProfileId, status: "SIGNED", signedAt: new Date() },
        });
        return { result: c, after: { status: c.status, signedAt: c.signedAt } };
      },
    };
  });
}
