"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { payStallAction } from "@/app/vendor/(app)/onboarding/actions";
import { openCheckout } from "@/lib/razorpay-checkout";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/utils";

export function PayStep({ bookingId, amountPaise }: { bookingId: string; amountPaise: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pay = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await payStallAction(bookingId);
      if (!r.ok || !r.razorpayOrderId) throw new Error(r.error ?? "Could not start payment");
      await openCheckout({
        keyId: r.keyId ?? "",
        razorpayOrderId: r.razorpayOrderId,
        amountPaise: r.amountPaise ?? 0,
        description: "Stall fee",
        onSuccess: () => {
          router.push("/vendor/dashboard");
          router.refresh();
        },
        onDismiss: () => setBusy(false),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Payment failed");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button disabled={busy} onClick={pay}>{busy ? "Starting…" : `Pay ${formatPaise(amountPaise)} & confirm`}</Button>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <p className="text-xs text-muted-foreground">All stall fees are final and non-refundable.</p>
    </div>
  );
}
