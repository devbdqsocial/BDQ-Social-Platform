"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="p-[var(--space-xl)]" style={{ border: "1px solid var(--color)" }}>
      <ul>
        {ticketTypes.map((t, i) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-[var(--space-lg)] py-[var(--space-lg)]"
            style={i > 0 ? { borderTop: "1px solid color-mix(in srgb, currentColor 30%, transparent)" } : undefined}
          >
            <div>
              <p className="f-paragraph f-bold">{t.name}</p>
              <p className="f-paragraph-small opacity-70">{formatPaise(t.priceInPaise)}</p>
            </div>
            <div className="flex items-center gap-[var(--space-md)]">
              <button type="button" aria-label={`Fewer ${t.name}`} data-cursor className="qty-btn" onClick={() => setQ(t.id, (qty[t.id] ?? 0) - 1)}>−</button>
              <span className="f-exat w-[2ch] text-center" style={{ fontSize: "var(--h32)", lineHeight: 1 }}>{qty[t.id] ?? 0}</span>
              <button type="button" aria-label={`More ${t.name}`} data-cursor className="qty-btn" onClick={() => setQ(t.id, (qty[t.id] ?? 0) + 1)}>+</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-[var(--space-lg)] flex flex-wrap items-end justify-between gap-[var(--space-lg)] pt-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
        <div>
          <p className="f-exat" style={{ fontSize: "var(--h60)", lineHeight: 1 }}>{formatPaise(total)}</p>
          <p className="kicker mt-[var(--space-xs)] opacity-70">{count} ticket{count === 1 ? "" : "s"}</p>
        </div>
        <button type="button" className="btn" data-cursor disabled={!count || busy} onClick={buy}>
          <span className="btn__text">{busy ? "Starting…" : "Buy tickets"}</span>
        </button>
      </div>
      {err && <p role="alert" className="f-paragraph-small f-bold mt-[var(--space-md)]" style={{ color: "var(--red)" }}>{err}</p>}
      <p className="f-paragraph-small mt-[var(--space-md)] opacity-60">
        Buying 6 or more? Bulk savings apply automatically. Coupons too. Secure payment via Razorpay.
      </p>
    </div>
  );
}
