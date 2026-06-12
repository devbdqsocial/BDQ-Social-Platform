"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaise } from "@/lib/utils";
import { openCheckout } from "@/lib/razorpay-checkout";
import { quoteOrderAction } from "@/app/(public)/events/[slug]/actions";

interface TicketType {
  id: string;
  name: string;
  priceInPaise: number;
}

const COUPON_COPY: Record<string, string> = {
  COUPON_INVALID: "That code isn't valid for this event.",
  EMPTY: "Pick your tickets first, then apply the code.",
  RATE_LIMITED: "Too many tries — wait a few minutes.",
};

export function TicketCheckout({ eventId, ticketTypes }: { eventId: string; ticketTypes: TicketType[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; total: number } | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const localTotal = ticketTypes.reduce((s, t) => s + (qty[t.id] ?? 0) * t.priceInPaise, 0);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  const total = coupon ? coupon.total : localTotal;
  const setQ = (id: string, v: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(10, v)) }));

  const buildItems = () =>
    ticketTypes.filter((t) => (qty[t.id] ?? 0) > 0).map((t) => ({ ticketTypeId: t.id, qty: qty[t.id] }));

  const quote = async (code: string) => {
    const items = buildItems();
    if (!items.length) {
      setCouponErr(COUPON_COPY.EMPTY);
      return false;
    }
    setApplying(true);
    setCouponErr(null);
    const res = await quoteOrderAction({ eventId, items, couponCode: code });
    setApplying(false);
    if (res.ok) {
      setCoupon({ code, discount: res.data.discount, total: res.data.total });
      return true;
    }
    setCoupon(null);
    setCouponErr(res.error.message ?? COUPON_COPY[res.error.code] ?? "Couldn't check that code — try again.");
    return false;
  };

  // Re-quote when quantities change while a code is applied (totals must never go stale).
  const qtyKey = JSON.stringify(qty);
  const appliedCode = coupon?.code ?? null;
  const requoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!appliedCode) return;
    if (requoteTimer.current) clearTimeout(requoteTimer.current);
    requoteTimer.current = setTimeout(() => void quote(appliedCode), 350);
    return () => {
      if (requoteTimer.current) clearTimeout(requoteTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtyKey]);

  const buy = async () => {
    const items = buildItems();
    if (!items.length) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, items, couponCode: coupon?.code }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json?.error?.code === "COUPON_INVALID") {
          setCoupon(null);
          setCouponErr(COUPON_COPY.COUPON_INVALID);
          throw new Error("That coupon stopped working — the total is back to full price.");
        }
        throw new Error(json?.error?.code === "SOLD_OUT" ? "Some tickets just sold out." : "Could not start checkout.");
      }
      await openCheckout({
        keyId: json.data.keyId,
        razorpayOrderId: json.data.razorpayOrderId,
        amountPaise: json.data.amountPaise,
        description: "Event tickets",
        onSuccess: () => router.push(`/tickets?paid=${json.data.orderId}`),
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

      {/* Coupon (customer-portal §3.10): underline field + Apply; server-priced savings line. */}
      <div className="mt-[var(--space-lg)] pt-[var(--space-lg)]" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 30%, transparent)" }}>
        <div className="flex items-end gap-[var(--space-md)]">
          <input
            type="text"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            placeholder="COUPON CODE"
            aria-label="Coupon code"
            disabled={applying}
            className="f-paragraph-small f-bold w-full max-w-[16ch] bg-transparent pb-[2px] uppercase outline-none disabled:opacity-50"
            style={{ borderBottom: "1px solid currentColor", letterSpacing: "0.08em" }}
          />
          <button
            type="button"
            data-cursor
            className="f-paragraph-small f-bold t-upper link-underline disabled:opacity-50"
            style={{ letterSpacing: "0.08em" }}
            disabled={applying || !couponInput.trim()}
            onClick={() => void quote(couponInput.trim())}
          >
            {applying ? "Checking…" : "Apply"}
          </button>
          {coupon && (
            <button
              type="button"
              data-cursor
              aria-label="Remove coupon"
              className="f-paragraph-small opacity-70"
              onClick={() => { setCoupon(null); setCouponErr(null); setCouponInput(""); }}
            >
              ✕
            </button>
          )}
        </div>
        {coupon && coupon.discount > 0 && (
          <p className="f-paragraph-small f-bold mt-[var(--space-sm)]" style={{ color: "var(--success)" }}>
            {coupon.code} applied — you save {formatPaise(coupon.discount)}
          </p>
        )}
        {coupon && coupon.discount === 0 && (
          <p className="f-paragraph-small mt-[var(--space-sm)] opacity-75">
            {coupon.code} works, but another discount already beats it — best price wins.
          </p>
        )}
        {couponErr && (
          <p role="alert" className="f-paragraph-small f-bold mt-[var(--space-sm)]" style={{ color: "var(--red)" }}>{couponErr}</p>
        )}
      </div>

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
      {count > 1 && (
        <p className="f-paragraph-small f-bold mt-[var(--space-md)]">One QR admits your whole group — keep it on one phone.</p>
      )}
      <p className="f-paragraph-small mt-[var(--space-md)] opacity-75">
        Buying 6 or more? Bulk savings apply automatically. Secure payment via Razorpay.
      </p>
    </div>
  );
}
