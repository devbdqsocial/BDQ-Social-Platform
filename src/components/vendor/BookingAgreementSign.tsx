"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signBookingAgreementAction } from "@/app/vendor/(app)/onboarding/actions";
import { BdqInput, BdqSubmit } from "@/components/vendor/bdq-fields";

/** Per-event agreement the vendor signs for this booking before paying (separate from the one-time
 * onboarding contract). Mirrors ContractSign. */
export function BookingAgreementSign({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await signBookingAgreementAction(new FormData(e.currentTarget));
      if (!r.ok) throw new Error(r.error ?? "Could not sign");
      toast.success("Agreement signed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign");
    } finally {
      setBusy(false);
    }
  };

  const lnk = "font-bold underline underline-offset-2";
  return (
    <form onSubmit={submit} className="max-w-xl space-y-[var(--space-lg)]">
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="f-paragraph-small opacity-80 text-pretty">
        Confirm this event&apos;s terms before paying. Read the{" "}
        <Link href="/vendor-agreement" target="_blank" className={lnk}>Vendor Participation Agreement</Link>{" "}
        and{" "}
        <Link href="/vendor-booking-policy" target="_blank" className={lnk}>Booking Policy</Link>, then sign below.
      </p>
      <label className="block space-y-[var(--space-sm)]">
        <span className="f-paragraph-small block font-bold">Type your full legal name</span>
        <BdqInput name="signerName" required minLength={2} placeholder="As you would sign" />
      </label>
      <label className="f-paragraph-small flex items-start gap-[var(--space-sm)]">
        <input type="checkbox" name="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 accent-[var(--light-blue)]" />
        I agree to this event&apos;s terms and understand the stall fee is final and non-refundable.
      </label>
      <BdqSubmit lg disabled={!agree || busy}>{busy ? "Signing…" : "Sign event agreement"}</BdqSubmit>
    </form>
  );
}
