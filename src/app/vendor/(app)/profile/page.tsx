import type { Metadata } from "next";
import Link from "next/link";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { BrandForm } from "@/components/vendor/BrandForm";

export const metadata: Metadata = { title: "Brand profile" };

export default async function VendorProfilePage() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) {
    return <p className="f-paragraph-small opacity-70">Set up your brand details from your home to start your profile.</p>;
  }
  const approved = profile.approvalStatus === "APPROVED";

  return (
    <div className="max-w-3xl space-y-[var(--space-2xl)]">
      <header className="flex items-start justify-between gap-[var(--space-lg)]">
        <div>
          <p className="kicker opacity-60">Brand profile</p>
          <h1 className="f-exat f-h60 mt-1">Your brand</h1>
          <p className="f-paragraph-small mt-[var(--space-sm)] opacity-75 text-pretty">
            Tell shoppers who you are. We&apos;ll call to verify your details before your stall is confirmed.
          </p>
        </div>
        {approved && (
          <Link href={`/vendors/${profile.id}`} target="_blank" className="link--split f-paragraph-small shrink-0 font-bold" style={{ color: "var(--light-blue)" }}>
            See your brand page <span className="arrow">→</span>
          </Link>
        )}
      </header>

      <BrandForm profile={profile} />
    </div>
  );
}
