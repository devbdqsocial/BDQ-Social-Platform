import type { Metadata } from "next";
import { fmtDateLong } from "@/lib/date-formats";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { getOrCreateContract } from "@/server/vendors/contract";
import { resolveGlobalContract, parseSnapshot } from "@/server/legal/resolve";
import { mergeSections } from "@/server/legal/tokens";
import { agreementSections, CONTRACT_VERSION } from "@/server/contracts/agreement";
import { DocSectionsView } from "@/components/legal/DocSections";
import type { DocSection } from "@/lib/legal-sections";
import { signContractAction } from "./actions";
import { VendorPageHeader } from "@/components/vendor/VendorPageHeader";

export const metadata: Metadata = { title: "Contract" };

const PROSE =
  "f-paragraph-small mt-[var(--space-lg)] max-h-[60vh] overflow-y-auto pr-[var(--space-md)] [&_a]:underline [&_h2]:mt-[var(--space-lg)] [&_h2]:font-bold [&_h2]:first:mt-0 [&_li]:mb-[var(--space-2xs)] [&_li]:opacity-80 [&_ol]:mt-[var(--space-sm)] [&_ol]:list-decimal [&_ol]:pl-[var(--space-lg)] [&_p]:mt-[var(--space-sm)] [&_p]:opacity-80 [&_strong]:font-bold [&_ul]:mt-[var(--space-sm)] [&_ul]:list-disc [&_ul]:pl-[var(--space-lg)]";

export default async function VendorContractPage() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) {
    return <p className="f-paragraph-small opacity-70">Create your brand profile first, then sign the contract.</p>;
  }
  const contract = await getOrCreateContract(profile.id);
  const signed = contract.status === "SIGNED";

  // Signed = frozen: render the snapshot taken at signing. Otherwise show the live template.
  const snapshot = signed ? parseSnapshot(contract.termsSnapshot) : null;
  let title = "Vendor Participation Agreement";
  let version = contract.version ?? CONTRACT_VERSION;
  let sections: DocSection[];
  if (snapshot) {
    ({ title } = snapshot);
    version = contract.version ?? snapshot.version;
    sections = snapshot.sections;
  } else {
    const template = await resolveGlobalContract();
    if (template) {
      title = template.title;
      version = `${template.slug}@${template.version}`;
      sections = mergeSections(template.sections, {
        vendor: { brandName: profile.brandName, registeredName: profile.registeredName },
        doc: { version: template.version },
      }).sections;
    } else {
      version = CONTRACT_VERSION;
      sections = agreementSections({ brandName: profile.brandName, registeredName: profile.registeredName }).map((s) => ({
        heading: s.heading,
        body: s.body.join("\n\n"),
      }));
    }
  }

  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-2xl)]">
      <VendorPageHeader
        kicker="Contract"
        title="Participation contract"
        action={<span className={signed ? "badge-bdq" : "badge-bdq badge-bdq--muted"}>{signed ? "Signed" : "Not signed"}</span>}
      />

      <div className="rounded-[var(--radius-lg)] p-[var(--space-xl)]" style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}>
        <h2 className="f-h32 f-exat">{title}</h2>
        <p className="f-paragraph-small mt-1 opacity-70">
          {signed ? `The exact terms you signed (${version}).` : `Please read and accept before your stall can be confirmed. Version ${version}.`}
        </p>
        <div className={PROSE}>
          <DocSectionsView sections={sections} />
        </div>
      </div>

      {signed ? (
        <p className="f-paragraph-small font-bold" style={{ color: "var(--dark-green)" }}>
          Signed{contract.signedAt ? ` on ${fmtDateLong(contract.signedAt)}` : ""}. Thank you!
        </p>
      ) : (
        <form action={signContractAction} className="space-y-[var(--space-lg)]">
          <label className="f-paragraph-small flex items-start gap-[var(--space-sm)]">
            <input type="checkbox" name="agree" className="mt-0.5 size-4 accent-[var(--light-blue)]" />
            I, on behalf of {profile.brandName}, have read and agree to the agreement above.
          </label>
          <button type="submit" className="bdq-btn px-[var(--space-2xl)]">
            Agree &amp; sign
          </button>
        </form>
      )}
    </div>
  );
}
