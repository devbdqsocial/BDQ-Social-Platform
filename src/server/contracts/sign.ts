import "server-only";
import { db } from "@/server/db";
import type { Session } from "@/server/auth/guard";
import { signContract } from "@/server/vendors/contract";
import { renderVendorAgreementPdf } from "./pdf";
import { CONTRACT_VERSION } from "./agreement";
import { uploadPdfBuffer } from "@/lib/cloudinary";

/**
 * Generate the e-signed vendor-agreement PDF, store it in Cloudinary, and mark the contract SIGNED
 * (audited, with signer name + IP). If Cloudinary isn't configured (dev), the signature is still
 * recorded without a stored PDF url.
 */
export async function generateAndSignContract(
  session: Session,
  vendorProfileId: string,
  signerName: string,
  signerIp: string | null,
): Promise<{ url: string | null }> {
  const vendor = await db.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    select: {
      brandName: true,
      registeredName: true,
      bookings: {
        where: { status: { in: ["RESERVED", "PENDING_PAYMENT", "BOOKED"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          stall: { select: { label: true, priceInPaise: true, stallType: { select: { priceInPaise: true } } } },
          event: { select: { name: true } },
        },
      },
    },
  });
  if (!vendor) throw new Error("Vendor not found");

  const b = vendor.bookings[0];
  const feePaise = b?.stall.priceInPaise ?? b?.stall.stallType?.priceInPaise ?? null;
  const signedAt = new Date();

  const buffer = await renderVendorAgreementPdf({
    brandName: vendor.brandName,
    registeredName: vendor.registeredName,
    eventName: b?.event.name ?? null,
    stallLabel: b?.stall.label ?? null,
    feePaise,
    signerName,
    signedAt,
  });

  let url: string | null = null;
  try {
    const up = await uploadPdfBuffer(buffer, "bdq/vendors/contracts", `contract_${vendorProfileId}_${signedAt.getTime()}`);
    url = up.url;
  } catch {
    url = null; // Cloudinary not configured — still record the signature below.
  }

  await signContract(session, vendorProfileId, { signerName, signerIp, url, version: CONTRACT_VERSION });
  return { url };
}
