"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { formatPaise } from "@/lib/utils";
import { openCheckout } from "@/lib/razorpay-checkout";
import { orderAddOnsAction } from "@/app/vendor/(app)/add-ons/actions";

export interface AddOnItem {
  id: string;
  name: string;
  pricePaise: number;
  maxPerBooking: number;
  /** null = unlimited stock. */
  remaining: number | null;
}

/** Vendor add-on ordering (vendor-portal §5): qty steppers, live summary, one Razorpay order. */
export function AddOnsClient({ items }: { items: AddOnItem[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cap = (it: AddOnItem) => Math.min(it.maxPerBooking, it.remaining ?? it.maxPerBooking);
  const set = (it: AddOnItem, n: number) => setQty((q) => ({ ...q, [it.id]: Math.max(0, Math.min(cap(it), n)) }));

  const total = useMemo(
    () => items.reduce((s, it) => s + (qty[it.id] ?? 0) * it.pricePaise, 0),
    [items, qty],
  );
  const chosen = items.filter((it) => (qty[it.id] ?? 0) > 0).map((it) => ({ addOnId: it.id, qty: qty[it.id] }));

  const pay = async () => {
    if (chosen.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await orderAddOnsAction(chosen);
      if (!r.ok) throw new Error(r.error);
      await openCheckout({
        keyId: r.keyId,
        razorpayOrderId: r.razorpayOrderId,
        amountPaise: r.amountPaise,
        description: "Stall add-ons",
        onSuccess: () => {
          router.refresh();
          setQty({});
          setBusy(false);
        },
        onDismiss: () => setBusy(false),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start the order");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-[var(--space-xl)]">
      <ul className="space-y-[var(--space-md)]">
        {items.map((it) => {
          const n = qty[it.id] ?? 0;
          const soldOut = it.remaining === 0;
          return (
            <li
              key={it.id}
              className="flex flex-wrap items-center justify-between gap-[var(--space-md)] rounded-[var(--radius-lg)] p-[var(--space-lg)]"
              style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}
            >
              <div className="min-w-0">
                <p className="f-h42 f-exat">{it.name}</p>
                <p className="f-paragraph-small opacity-70">
                  {formatPaise(it.pricePaise)} each
                  {it.remaining != null && it.remaining <= 5 ? ` · ${it.remaining} left` : ""}
                </p>
              </div>
              {soldOut ? (
                <span className="f-paragraph-small font-bold opacity-60">Sold out</span>
              ) : (
                <div className="flex items-center gap-[var(--space-md)]">
                  <button type="button" aria-label={`Less ${it.name}`} className="qty-btn" disabled={n === 0} onClick={() => set(it, n - 1)}>
                    <Minus className="size-3.5" />
                  </button>
                  <span className="f-paragraph w-6 text-center font-bold tabular-nums">{n}</span>
                  <button type="button" aria-label={`More ${it.name}`} className="qty-btn" disabled={n >= cap(it)} onClick={() => set(it, n + 1)}>
                    <Plus className="size-3.5" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-[var(--space-lg)]">
        <p className="f-h32 f-exat">Total {formatPaise(total)}</p>
        <button type="button" disabled={busy || total === 0} onClick={pay} data-cursor className="btn btn--lg btn--accent">
          <span className="btn__text">{busy ? "Starting…" : "Pay & order"}</span>
        </button>
      </div>
      {err && <p className="f-paragraph-small font-bold" style={{ color: "var(--red)" }}>{err}</p>}
      <p className="f-paragraph-small opacity-60">All add-on orders are final and non-refundable.</p>
    </div>
  );
}
