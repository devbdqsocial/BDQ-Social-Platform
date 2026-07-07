import type { Metadata } from "next";
import Link from "next/link";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { BrandForm } from "@/components/vendor/BrandForm";
import { VendorPageHeader } from "@/components/vendor/VendorPageHeader";

export const metadata: Metadata = { title: "Brand profile" };

export default async function VendorProfilePage() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) {
    return <p className="f-paragraph-small opacity-70">Set up your brand details from your home to start your profile.</p>;
  }
  const approved = profile.approvalStatus === "APPROVED";

  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-2xl)]">
      <VendorPageHeader
        kicker="Brand profile"
        title="Your brand"
        description="Tell shoppers who you are. We'll call to verify your details before your stall is confirmed."
        action={
          approved ? (
            <Link href={`/vendors/${profile.id}`} target="_blank" className="link--split f-paragraph-small font-bold" style={{ color: "var(--light-blue)" }}>
              See your brand page <span className="arrow">→</span>
            </Link>
          ) : undefined
        }
      />

      <BrandForm profile={profile} />
    </div>
  );
}
