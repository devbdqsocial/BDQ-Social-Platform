"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { stallsToRenderLayout, type StallLike } from "@/lib/map/normalize";
import { type StallStatus } from "@/lib/stall-colors";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/utils";
import { openCheckout } from "@/lib/razorpay-checkout";
import { StallLegend } from "@/components/map/StallLegend";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-96 place-items-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
      Loading event layout…
    </div>
  ),
});

interface StallInput extends StallLike {
  id: string;
  status: string;
  priceInPaise: number | null;
}
type PayResult = {
  ok: boolean;
  razorpayOrderId?: string;
  amountPaise?: number;
  keyId?: string;
  error?: string;
  unauthorized?: boolean;
};

export function VendorStallPay({
  stalls,
  payAction,
}: {
  stalls: StallInput[];
  payAction: (stallId: string) => Promise<PayResult>;
}) {
  const router = useRouter();
  const idByLabel = useMemo(() => Object.fromEntries(stalls.map((s) => [s.label, s.id])), [stalls]);
  const priceByLabel = useMemo(() => Object.fromEntries(stalls.map((s) => [s.label, s.priceInPaise])), [stalls]);
  const { layout } = useMemo(() => stallsToRenderLayout(stalls), [stalls]);
  const statuses = useMemo<Record<string, StallStatus>>(
    () => Object.fromEntries(stalls.filter((s) => s.kind !== "INFRA").map((s) => [s.label, s.status as StallStatus])),
    [stalls],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sel = [...selected][0];

  const toggle = (label: string) => {
    if ((statuses[label] ?? "AVAILABLE") !== "AVAILABLE") return;
    setSelected((prev) => (prev.has(label) ? new Set() : new Set([label])));
  };

  const pay = async () => {
    if (!sel) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await payAction(idByLabel[sel]);
      if (r.unauthorized) {
        router.push("/vendor/login");
        return;
      }
      if (!r.ok || !r.razorpayOrderId) throw new Error(r.error ?? "Could not start payment");
      await openCheckout({
        keyId: r.keyId ?? "",
        razorpayOrderId: r.razorpayOrderId,
        amountPaise: r.amountPaise ?? 0,
        description: `Stall ${sel}`,
        onSuccess: () => router.push("/vendor/dashboard"),
        onDismiss: () => setBusy(false),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Payment failed");
      setBusy(false);
    }
  };

  const price = sel ? priceByLabel[sel] : null;

  return (
    <div className="space-y-4">
      <StallLegend />
      <MapCanvas layout={layout} statuses={statuses} selected={selected} onSelect={toggle} />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!sel || busy} onClick={pay}>
          {busy
            ? "Starting…"
            : sel
              ? `Pay ${price != null ? formatPaise(price) : ""} & book ${sel}`
              : "Select an available stall"}
        </Button>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        Paying holds the stall; our team verifies by call before it&apos;s confirmed.
      </p>
    </div>
  );
}
