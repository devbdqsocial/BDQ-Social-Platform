"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBookingStatusAction, payStallAction } from "@/app/vendor/(app)/onboarding/actions";
import { openCheckout } from "@/lib/razorpay-checkout";
import { formatPaise } from "@/lib/utils";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function PayStep({ bookingId, amountPaise }: { bookingId: string; amountPaise: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "paying" | "confirming" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);

  // Fulfilment is webhook-driven; poll until the webhook flips the booking to BOOKED
  // so the vendor never lands back on a stale "pay" screen after paying.
  const confirm = async () => {
    setPhase("confirming");
    for (let i = 0; i < 8; i++) {
      await sleep(1500);
      try {
        const { status } = await getBookingStatusAction(bookingId);
        if (status === "BOOKED") {
          setPhase("done");
          router.refresh();
          return;
        }
      } catch {
        // transient — keep polling
      }
    }
    // Webhook is running late — refresh anyway; the reconcile cron is the safety net.
    router.refresh();
  };

  const pay = async () => {
    setPhase("paying");
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
          void confirm();
        },
        onDismiss: () => setPhase("idle"),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Payment failed");
      setPhase("idle");
    }
  };

  if (phase === "confirming") {
    return (
      <div className="space-y-[var(--space-sm)]" role="status" aria-live="polite">
        <p className="f-paragraph font-bold">Payment received — locking your stall…</p>
        <p className="f-paragraph-small opacity-70">This takes a few seconds. Don&apos;t close the page.</p>
      </div>
    );
  }
  if (phase === "done") {
    return (
      <p className="f-paragraph font-bold" role="status">
        Stall locked — it&apos;s yours.
      </p>
    );
  }

  return (
    <div className="space-y-[var(--space-md)]">
      <button type="button" disabled={phase === "paying"} onClick={pay} className="bdq-btn px-[var(--space-2xl)]">
        {phase === "paying" ? "Starting…" : `Pay ${formatPaise(amountPaise)}`}
      </button>
      {err && <p className="f-paragraph-small font-bold" style={{ color: "var(--red)" }}>{err}</p>}
      <p className="f-paragraph-small opacity-60">All stall fees are final and non-refundable.</p>
    </div>
  );
}
