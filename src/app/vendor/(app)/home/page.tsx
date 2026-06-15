import Image from "next/image";
import Link from "next/link";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { getContract } from "@/server/vendors/contract";
import { db } from "@/server/db";
import { primaryLogo } from "@/lib/vendor-assets";
import { isReviewOverdue } from "@/lib/vendor-sla";
import { formatPaise } from "@/lib/utils";
import { Countdown } from "@/components/landing/Countdown";
import { VendorTimeline, type VendorNode } from "@/components/vendor/VendorTimeline";
import { BrandForm } from "@/components/vendor/BrandForm";
import { KycForm } from "@/components/vendor/KycForm";
import { ContractSign } from "@/components/vendor/ContractSign";
import { PayStep } from "@/components/vendor/PayStep";

export const dynamic = "force-dynamic";

const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);

const APPROVAL_BADGE: Record<string, string> = {
  SUBMITTED: "In review",
  UNDER_REVIEW: "In review",
  APPROVED: "Approved",
  REJECTED: "Not approved",
};

export default async function VendorHome({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) {
    return (
      <div className="max-w-xl space-y-[var(--space-lg)]">
        <h1 className="f-exat f-h60">Let&apos;s get started</h1>
        <p className="f-paragraph opacity-80">We couldn&apos;t find your vendor profile. Sign up to begin.</p>
        <Link href="/vendor/signup?zone=vendor" className="btn btn--accent" data-cursor>
          <span className="btn__text">Become a vendor</span>
        </Link>
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
  const rejected = profile.approvalStatus === "REJECTED";
  const reviewOverdue = isReviewOverdue(contract?.signedAt);

  // Linear flow: account → brand → docs → stall → agreement → payment.
  const order = ["account", "brand", "docs", "stall", "contract", "payment"] as const;
  const done: Record<string, boolean> = {
    account: true,
    brand: brandDone,
    docs: docsDone,
    stall: stallDone,
    contract: signed,
    payment: paid,
  };
  const lockedFrom: Record<string, boolean> = {
    account: false,
    brand: false,
    docs: !brandDone,
    stall: !docsDone,
    contract: !stallDone,
    payment: !signed,
  };
  const firstIncomplete = order.find((k) => !done[k] && !lockedFrom[k]) ?? "payment";
  const { step: requested } = await searchParams;
  const requestedValid = requested && order.includes(requested as (typeof order)[number]) && !lockedFrom[requested];
  const current = requestedValid ? (requested as (typeof order)[number]) : firstIncomplete;

  const label = booking?.stall.label;
  const fee = booking ? booking.stall.priceInPaise ?? booking.stall.stallType?.priceInPaise ?? 0 : 0;
  const isFood = profile.productCategory === "Food & Beverage";

  // Payment node sub-line — the highest-anxiety state gets explicit copy + SLA (vendor-portal.md §3).
  const paymentSub = paid
    ? `Stall ${label} is yours. See you at the market.`
    : rejected
      ? "This application wasn't approved. Call us and we'll help — we want you at the market."
      : approvedForPay && booking?.payBy
        ? `You're approved! Complete payment by ${fmtDateTime(booking.payBy)} to lock Stall ${label}.`
        : signed
          ? reviewOverdue
            ? "You're in review — thanks for your patience. We're running a little behind on calls, but you're on the list and we'll reach you very soon. Nothing else is needed from you."
            : "You're in review. Our team calls within 48 hours — keep your phone close. Nothing else is needed from you."
          : "Payment unlocks once our team approves you.";

  const nodes: VendorNode[] = order.map((key) => {
    const state: VendorNode["state"] = done[key] ? "done" : key === current ? "current" : "locked";
    switch (key) {
      case "account":
        return { key, label: "Account", state, sub: "Phone verified." };
      case "brand":
        return {
          key,
          label: "Brand",
          state,
          sub: done.brand ? "Brand details saved." : "Tell us who you are — name, what you sell, your story.",
          editHref: done.brand ? "/vendor/home?step=brand" : undefined,
          editLabel: "Edit brand",
        };
      case "docs":
        return {
          key,
          label: "Documents",
          state,
          sub: done.docs ? "Documents received." : "PAN for every vendor; FSSAI if you serve food. Photos or PDFs.",
          editHref: done.docs ? "/vendor/home?step=docs" : undefined,
          editLabel: "Update documents",
        };
      case "stall":
        return {
          key,
          label: "Stall",
          state,
          sub: stallDone ? `Stall ${label} reserved — ${booking?.event.name}.` : "Pick your spot on the live layout. Good ones go first.",
        };
      case "contract":
        return {
          key,
          label: "Agreement",
          state,
          sub: signed ? "Agreement signed." : "Read once, sign once. Takes two minutes.",
          timestamp: signed && contract?.signedAt ? `Signed ${fmtDateTime(contract.signedAt)}` : undefined,
        };
      case "payment":
        return {
          key,
          label: "Payment",
          state: rejected ? "current" : state,
          sub: paymentSub,
          timestamp: signed && !approvedForPay && !paid && !rejected && contract?.signedAt ? `Submitted ${fmtDateTime(contract.signedAt)}` : undefined,
        };
    }
  });

  const logo = primaryLogo(profile.assets);

  return (
    <div className="mx-auto max-w-[52rem] space-y-[var(--space-3xl)]">
      {/* Header */}
      <header className="flex items-center gap-[var(--space-lg)]">
        {logo ? (
          <Image src={logo} alt="" width={56} height={56} className="size-14 rounded-[var(--radius-md)] object-cover" style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)" }} />
        ) : (
          <div className="grid size-14 shrink-0 place-items-center rounded-[var(--radius-md)] f-exat f-h32" style={{ background: "var(--dark-blue)", color: "var(--light-blue)" }}>
            {profile.brandName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="kicker opacity-60">Vendor portal</p>
          <h1 className="f-exat f-h60 truncate">{profile.brandName}</h1>
        </div>
        <span className={`badge-rpa ml-auto shrink-0 ${rejected ? "" : "badge-rpa--muted"}`}>
          {APPROVAL_BADGE[profile.approvalStatus] ?? profile.approvalStatus}
        </span>
      </header>

      <div className="grid gap-[var(--space-3xl)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Status spine */}
        <section>
          <h2 className="kicker mb-[var(--space-lg)] opacity-60">Your application</h2>
          <VendorTimeline nodes={nodes} />
        </section>

        {/* Contextual card for the current step */}
        <section
          className="h-fit rounded-[var(--radius-lg)] p-[var(--space-xl)]"
          style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)", background: "color-mix(in srgb, currentColor 3%, transparent)" }}
        >
          {current === "account" && (
            <div className="space-y-[var(--space-md)]">
              <p className="f-paragraph">Phone verified — let&apos;s build your brand.</p>
              <Link href="/vendor/home?step=brand" className="link--split f-paragraph font-bold">
                Continue to brand details <span className="arrow">→</span>
              </Link>
            </div>
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
              <div className="space-y-[var(--space-md)]">
                <p className="f-paragraph">
                  Reserved: <strong>Stall {booking.stall.label}</strong> at {booking.event.name}.
                </p>
                <Link href="/vendor/home?step=contract" className="link--split f-paragraph font-bold">
                  Continue to the agreement <span className="arrow">→</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-[var(--space-lg)]">
                <p className="f-paragraph opacity-80">Pick an event and reserve your stall on the live layout.</p>
                <Link href="/vendor/events" className="btn btn--accent" data-cursor>
                  <span className="btn__text">Browse markets</span>
                </Link>
              </div>
            ))}

          {current === "contract" &&
            (signed ? (
              <div className="space-y-[var(--space-md)]">
                <p className="f-paragraph">Agreement signed.</p>
                {contract?.url && (
                  <a href={contract.url} target="_blank" rel="noreferrer" className="link--split f-paragraph font-bold">
                    Download signed PDF <span className="arrow">→</span>
                  </a>
                )}
                <p className="f-paragraph-small opacity-70">
                  Our team will verify your details and call you back, then payment unlocks.
                </p>
              </div>
            ) : (
              <ContractSign />
            ))}

          {current === "payment" &&
            (paid ? (
              <div className="space-y-[var(--space-md)]">
                <p className="f-h32 f-exat">Stall {label} is yours.</p>
                <p className="f-paragraph opacity-80">See you at the market. We&apos;ll be in touch with prep details closer to the date.</p>
                <Link href="/vendor/add-ons" className="link--split f-paragraph font-bold" style={{ color: "var(--light-blue)" }}>
                  Order tables, chairs &amp; power <span className="arrow">→</span>
                </Link>
              </div>
            ) : rejected ? (
              <div className="space-y-[var(--space-md)]">
                <p className="f-h32 f-exat">This application wasn&apos;t approved.</p>
                <p className="f-paragraph opacity-80">Call us and we&apos;ll help — we want you at the market.</p>
                <Link href="/contact" className="link--split f-paragraph font-bold">
                  Talk to our team <span className="arrow">→</span>
                </Link>
              </div>
            ) : approvedForPay && booking ? (
              <div className="space-y-[var(--space-lg)]">
                <div>
                  <p className="kicker opacity-60">You&apos;re approved</p>
                  <p className="f-h32 f-exat mt-1">Lock Stall {label} — {formatPaise(fee)}</p>
                </div>
                {booking.payBy && (
                  <div>
                    <p className="kicker mb-[var(--space-sm)] opacity-60">Pay by {fmtDateTime(booking.payBy)}</p>
                    <Countdown target={booking.payBy.toISOString()} />
                  </div>
                )}
                <PayStep bookingId={booking.id} amountPaise={fee} />
              </div>
            ) : (
              <div className="space-y-[var(--space-md)]">
                <p className="f-h32 f-exat">You&apos;re in review.</p>
                <p className="f-paragraph opacity-80">
                  {reviewOverdue
                    ? "Thanks for your patience — we're running a little behind on calls. You're still on the list and we'll reach you very soon. Nothing else is needed from you."
                    : "Our team calls within 48 hours — keep your phone close. Nothing else is needed from you."}
                </p>
                {contract?.signedAt && <p className="f-paragraph-small opacity-55">Submitted {fmtDateTime(contract.signedAt)}</p>}
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}
