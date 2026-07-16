import "server-only";
import { db } from "@/server/db";
import type { Session } from "@/server/auth/guard";
import { signContract } from "@/server/vendors/contract";
import { renderAgreementPdf } from "./pdf";
import { agreementSections, CONTRACT_VERSION } from "./agreement";
import { resolveGlobalContract, makeSnapshot } from "@/server/legal/resolve";
import { mergeSections } from "@/server/legal/tokens";
import { uploadPdfBuffer } from "@/lib/cloudinary";
import type { DocSection } from "@/lib/legal-sections";

/**
 * Generate the e-signed vendor-agreement PDF, store it in Cloudinary, and mark the contract SIGNED
 * (audited, with signer name + IP + a snapshot of the exact merged text). The agreement text comes
 * from the admin-managed "vendor-agreement" document; the hardcoded agreementSections() remains as
 * the empty-DB fallback. If Cloudinary isn't configured (dev), the signature is still recorded
 * without a stored PDF url.
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
      productCategory: true,
      bookings: {
        where: { status: { in: ["RESERVED", "PENDING_PAYMENT", "BOOKED"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          stall: { select: { label: true, priceInPaise: true, stallType: { select: { name: true, priceInPaise: true } } } },
          event: { select: { name: true, startsAt: true, location: true } },
        },
      },
    },
  });
  if (!vendor) throw new Error("Vendor not found");

  const b = vendor.bookings[0];
  const feePaise = b?.stall.priceInPaise ?? b?.stall.stallType?.priceInPaise ?? null;
  const signedAt = new Date();

  const template = await resolveGlobalContract();
  let title: string;
  let version: string;
  let sections: DocSection[];
  if (template) {
    title = template.title;
    version = `${template.slug}@${template.version}`;
    sections = mergeSections(template.sections, {
      vendor: { brandName: vendor.brandName, registeredName: vendor.registeredName, productCategory: vendor.productCategory },
      event: b?.event ?? undefined,
      stall: b ? { label: b.stall.label, typeName: b.stall.stallType?.name ?? null } : undefined,
      fees: { totalPaise: feePaise },
      signature: { signerName, signedAt },
      doc: { version: template.version },
    }).sections;
  } else {
    // Empty-DB fallback: the legacy code-generated agreement (already merged).
    title = "Vendor Participation Agreement";
    version = CONTRACT_VERSION;
    sections = agreementSections({
      brandName: vendor.brandName,
      registeredName: vendor.registeredName,
      eventName: b?.event.name ?? null,
      stallLabel: b?.stall.label ?? null,
      feePaise,
      signerName,
      signedAt,
    }).map((s) => ({ heading: s.heading, body: s.body.join("\n\n") }));
  }

  const buffer = await renderAgreementPdf({
    title,
    versionLabel: version,
    sections,
    brandName: vendor.brandName,
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

  const termsSnapshot = makeSnapshot({ slug: template?.slug ?? "vendor-agreement", version, title, sections });
  await signContract(session, vendorProfileId, { signerName, signerIp, url, version, termsSnapshot });
  return { url };
}
