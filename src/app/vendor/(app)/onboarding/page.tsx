import Link from "next/link";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { getContract } from "@/server/vendors/contract";
import { db } from "@/server/db";
import { Button } from "@/components/ui/button";
import { OnboardingStepper, type Step } from "@/components/vendor/OnboardingStepper";
import { BrandForm } from "@/components/vendor/BrandForm";
import { KycForm } from "@/components/vendor/KycForm";
import { ContractSign } from "@/components/vendor/ContractSign";
import { PayStep } from "@/components/vendor/PayStep";

export const dynamic = "force-dynamic";

export default async function VendorOnboarding({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="font-display text-2xl font-semibold">Let&apos;s get started</h1>
        <p className="text-sm text-muted-foreground">We couldn&apos;t find your vendor profile. Sign up to begin.</p>
        <Button asChild><Link href="/vendor/signup?zone=vendor">Become a vendor</Link></Button>
      </div>
    );
  }

  const contract = await getContract(profile.id);
  const booking = await db.booking.findFirst({
    where: { vendorProfileId: profile.id, status: { in: ["RESERVED", "PENDING_PAYMENT", "BOOKED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      stall: { select: { label: true, priceInPaise: true, stallType: { select: { priceInPaise: true } } } },
      event: { select: { name: true } },
    },
  });

  const docUrls = (profile.kyc?.docUrls as Record<string, { url: string } | undefined> | null) ?? {};
  const brandDone = profile.brandName !== "New vendor" && !!profile.products && !!profile.productCategory;
  const docsDone = !!docUrls.pan;
  const stallDone = !!booking;
  const signed = contract?.status === "SIGNED";
  const approvedForPay = booking?.status === "PENDING_PAYMENT";
  const paid = booking?.status === "BOOKED";

  const steps: Step[] = [
    { key: "account", label: "Account", done: true, locked: false },
    { key: "brand", label: "Brand details", done: brandDone, locked: false },
    { key: "docs", label: "Documents", done: docsDone, locked: !brandDone },
    { key: "stall", label: "Event & stall", done: stallDone, locked: !docsDone },
    { key: "contract", label: "Agreement", done: signed, locked: !stallDone },
    { key: "payment", label: "Payment", done: paid, locked: !signed || (!approvedForPay && !paid) },
  ];

  const { step: requested } = await searchParams;
  const firstIncomplete = steps.find((s) => !s.done && !s.locked)?.key ?? "payment";
  const valid = steps.find((s) => s.key === requested && !s.locked);
  const current = valid?.key ?? firstIncomplete;

  const fee = booking ? booking.stall.priceInPaise ?? booking.stall.stallType?.priceInPaise ?? 0 : 0;
  const isFood = profile.productCategory === "Food & Beverage";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Vendor onboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete each step. Your stall is confirmed after our team verifies your details and you pay.
        </p>
      </div>

      <OnboardingStepper steps={steps} current={current} />

      <div className="rounded-xl border border-border bg-card p-6">
        {current === "account" && (
          <p className="text-sm">
            Phone verified.{" "}
            <Link href="/vendor/onboarding?step=brand" className="text-primary underline">Continue to brand details →</Link>
          </p>
        )}

        {current === "brand" && <BrandForm profile={profile} />}

        {current === "docs" && (
          <KycForm
            kyc={{ pan: profile.kyc?.pan ?? null, fssai: profile.kyc?.fssai ?? null, gstin: profile.kyc?.gstin ?? null, docs: docUrls }}
            isFood={isFood}
          />
        )}

        {current === "stall" &&
          (booking ? (
            <div className="space-y-3">
              <p className="text-sm">
                Reserved: <strong>Stall {booking.stall.label}</strong> at {booking.event.name}.
              </p>
              <Link href="/vendor/onboarding?step=contract" className="text-sm text-primary underline">Continue to the agreement →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Pick an event and reserve your stall on the live layout.</p>
              <Button asChild><Link href="/vendor/events">Browse markets &amp; reserve →</Link></Button>
            </div>
          ))}

        {current === "contract" &&
          (signed ? (
            <div className="space-y-3">
              <p className="text-sm">
                Agreement signed ✓{" "}
                {contract?.url && (
                  <a href={contract.url} target="_blank" rel="noreferrer" className="text-primary underline">Download signed PDF</a>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                Our team will verify your details and call you back, then payment unlocks.
              </p>
            </div>
          ) : (
            <ContractSign />
          ))}

        {current === "payment" &&
          (paid ? (
            <p className="text-sm">Paid ✓ Your stall is booked. See you at the market!</p>
          ) : approvedForPay && booking ? (
            <PayStep bookingId={booking.id} amountPaise={fee} />
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Under review</p>
              <p className="text-sm text-muted-foreground">
                Thanks — our team will verify your details and call you back. Payment unlocks once you&apos;re approved.
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
