"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signContractAction } from "@/app/vendor/(app)/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Read the full{" "}
        <Link href="/vendor-agreement" target="_blank" className="text-primary underline">Vendor Participation Agreement</Link>{" "}
        (also the{" "}
        <Link href="/vendor-rules" target="_blank" className="text-primary underline">Event Rules</Link>,{" "}
        <Link href="/vendor-booking-policy" target="_blank" className="text-primary underline">Booking Policy</Link>, and{" "}
        <Link href="/vendor-data-policy" target="_blank" className="text-primary underline">Data Policy</Link>), then sign below.
        You&apos;ll get a downloadable signed PDF.
      </p>
      <label className="block text-sm font-medium">
        Type your full legal name
        <Input name="signerName" required minLength={2} className="mt-1.5" placeholder="As you would sign" />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
        I have read and agree to the Vendor Participation Agreement and the linked policies, and I understand all stall fees are final and non-refundable.
      </label>
      <Button type="submit" disabled={!agree || busy}>{busy ? "Signing…" : "Sign agreement"}</Button>
    </form>
  );
}
