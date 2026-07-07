import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import { enqueueVendorNotification } from "@/server/notifications/vendor";
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

export function signContract(
  session: Session,
  vendorProfileId: string,
  opts?: { signerName?: string; signerIp?: string | null; url?: string | null; version?: string },
) {
  return withAudit(session, { action: "SIGN", entity: "VendorContract", entityId: vendorProfileId }, async () => {
    const before = await db.vendorContract.findUnique({ where: { vendorProfileId }, select: { status: true } });
    const fields = {
      status: "SIGNED" as const,
      signedAt: new Date(),
      signerName: opts?.signerName ?? null,
      signerIp: opts?.signerIp ?? null,
      version: opts?.version ?? null,
      ...(opts?.url ? { url: opts.url } : {}),
    };
    return {
      run: async () => {
        const c = await db.vendorContract.upsert({
          where: { vendorProfileId },
          update: fields,
          create: { vendorProfileId, ...fields },
        });
        // First signature = the application is submitted for review → ack the vendor.
        if (before?.status !== "SIGNED") {
          await enqueueVendorNotification(vendorProfileId, "vendor-application", {}, `vendor-app:${vendorProfileId}`);
        }
        return { result: c, after: { status: c.status, signedAt: c.signedAt, signerName: c.signerName } };
      },
      before,
    };
  });
}
