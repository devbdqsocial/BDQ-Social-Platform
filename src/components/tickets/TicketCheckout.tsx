"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/utils";
import { openCheckout } from "@/lib/razorpay-checkout";

interface TicketType {
  id: string;
  name: string;
  priceInPaise: number;
}

export function TicketCheckout({ eventId, ticketTypes }: { eventId: string; ticketTypes: TicketType[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = ticketTypes.reduce((s, t) => s + (qty[t.id] ?? 0) * t.priceInPaise, 0);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  const setQ = (id: string, v: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(10, v)) }));

  const buy = async () => {
    const items = ticketTypes.filter((t) => (qty[t.id] ?? 0) > 0).map((t) => ({ ticketTypeId: t.id, qty: qty[t.id] }));
    if (!items.length) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, items }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.code === "SOLD_OUT" ? "Some tickets just sold out." : "Could not start checkout.");
      }
      await openCheckout({
        keyId: json.data.keyId,
        razorpayOrderId: json.data.razorpayOrderId,
        amountPaise: json.data.amountPaise,
        description: "Event tickets",
        onSuccess: () => router.push("/tickets"),
        onDismiss: () => setBusy(false),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <ul className="divide-y divide-border">
        {ticketTypes.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-sm text-muted-foreground">{formatPaise(t.priceInPaise)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setQ(t.id, (qty[t.id] ?? 0) - 1)}>−</Button>
              <span className="w-6 text-center text-sm font-medium">{qty[t.id] ?? 0}</span>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setQ(t.id, (qty[t.id] ?? 0) + 1)}>+</Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div>
          <p className="font-display text-xl font-semibold">{formatPaise(total)}</p>
          <p className="text-xs text-muted-foreground">{count} ticket{count === 1 ? "" : "s"}</p>
        </div>
        <Button className="h-11 px-6" disabled={!count || busy} onClick={buy}>{busy ? "Starting…" : "Buy tickets"}</Button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        Buying 6 or more? Bulk savings apply automatically. Coupons too. Secure payment via Razorpay.
      </p>
    </div>
  );
}
