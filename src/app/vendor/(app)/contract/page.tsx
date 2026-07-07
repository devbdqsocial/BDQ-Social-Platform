import type { Metadata } from "next";
import { fmtDateLong } from "@/lib/date-formats";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { getOrCreateContract } from "@/server/vendors/contract";
import { signContractAction } from "./actions";
import { VendorPageHeader } from "@/components/vendor/VendorPageHeader";

export const metadata: Metadata = { title: "Contract" };

const TERMS = [
  "I will trade only the products described in my brand profile, and hold any licences required (FSSAI for food).",
  "I will set up and staff my stall for the full event hours, and keep my space clean and safe.",
  "All sales are my own responsibility; the organizers take no commission and offer no refunds on stall fees.",
  "I grant the organizers permission to feature my brand name and logo in event promotion.",
  "I will follow the venue and organiser's reasonable instructions on the day.",
];

export default async function VendorContractPage() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) {
    return <p className="f-paragraph-small opacity-70">Create your brand profile first, then sign the contract.</p>;
  }
  const contract = await getOrCreateContract(profile.id);
  const signed = contract.status === "SIGNED";

  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-2xl)]">
      <VendorPageHeader
        kicker="Contract"
        title="Participation contract"
        action={<span className={signed ? "badge-bdq" : "badge-bdq badge-bdq--muted"}>{signed ? "Signed" : "Not signed"}</span>}
      />

      <div className="rounded-[var(--radius-lg)] p-[var(--space-xl)]" style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}>
        <h2 className="f-h32 f-exat">{profile.brandName} · stall agreement</h2>
        <p className="f-paragraph-small mt-1 opacity-70">Please read and accept before your stall can be confirmed.</p>
        <ol className="mt-[var(--space-lg)] list-decimal space-y-[var(--space-sm)] pl-5">
          {TERMS.map((t) => <li key={t} className="f-paragraph-small opacity-80 text-pretty">{t}</li>)}
        </ol>
      </div>

      {signed ? (
        <p className="f-paragraph-small font-bold" style={{ color: "var(--dark-green)" }}>
          Signed{contract.signedAt ? ` on ${fmtDateLong(contract.signedAt)}` : ""}. Thank you!
        </p>
      ) : (
        <form action={signContractAction} className="space-y-[var(--space-lg)]">
          <label className="f-paragraph-small flex items-start gap-[var(--space-sm)]">
            <input type="checkbox" name="agree" className="mt-0.5 size-4 accent-[var(--light-blue)]" />
            I, on behalf of {profile.brandName}, have read and agree to the terms above.
          </label>
          <button type="submit" className="bdq-btn px-[var(--space-2xl)]">
            Agree &amp; sign
          </button>
        </form>
      )}
    </div>
  );
}
