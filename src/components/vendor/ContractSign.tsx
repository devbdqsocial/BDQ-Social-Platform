"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signContractAction } from "@/app/vendor/(app)/onboarding/actions";
import { RpaInput, RpaSubmit } from "@/components/vendor/rpa-fields";

export function ContractSign() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await signContractAction(new FormData(e.currentTarget));
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
      <p className="f-paragraph-small opacity-80 text-pretty">
        Read the full{" "}
        <Link href="/vendor-agreement" target="_blank" className={lnk}>Vendor Participation Agreement</Link>{" "}
        (also the{" "}
        <Link href="/vendor-rules" target="_blank" className={lnk}>Event Rules</Link>,{" "}
        <Link href="/vendor-booking-policy" target="_blank" className={lnk}>Booking Policy</Link>, and{" "}
        <Link href="/vendor-data-policy" target="_blank" className={lnk}>Data Policy</Link>), then sign below.
        You&apos;ll get a downloadable signed PDF.
      </p>
      <label className="block space-y-[var(--space-sm)]">
        <span className="f-paragraph-small block font-bold">Type your full legal name</span>
        <RpaInput name="signerName" required minLength={2} placeholder="As you would sign" />
      </label>
      <label className="f-paragraph-small flex items-start gap-[var(--space-sm)]">
        <input type="checkbox" name="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 accent-[var(--light-blue)]" />
        I have read and agree to the Vendor Participation Agreement and the linked policies, and I understand all stall fees are final and non-refundable.
      </label>
      <RpaSubmit lg disabled={!agree || busy}>{busy ? "Signing…" : "Sign agreement"}</RpaSubmit>
    </form>
  );
}
