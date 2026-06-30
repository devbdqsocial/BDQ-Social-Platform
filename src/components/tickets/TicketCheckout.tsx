"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaise } from "@/lib/utils";
import { openCheckout } from "@/lib/razorpay-checkout";
import { usePhoneOtp } from "@/components/auth/usePhoneOtp";
import { phone10, otp6, digitsCapped } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";
import { readStoredUtm, utmFromSearch, writeStoredUtm, type UtmData } from "@/lib/utm";
import { Magnetic } from "@/components/motion/Magnetic";
import { quoteOrderAction } from "@/app/(public)/events/[slug]/actions";

interface TicketType {
  id: string;
  name: string;
  priceInPaise: number;
  /** availability for scarcity + per-type sold-out (R3.3) */
  remaining: number;
}

const COUPON_COPY: Record<string, string> = {
  COUPON_INVALID: "That code isn't valid for this event.",
  EMPTY: "Pick your tickets first, then apply the code.",
  RATE_LIMITED: "Too many tries — wait a few minutes.",
};

const LOW_STOCK = 10; // show "only N left" at/under this
const newClientOrderKey = () => crypto.randomUUID();

export function TicketCheckout({ eventId, ticketTypes }: { eventId: string; ticketTypes: TicketType[] }) {
  const router = useRouter();
  const otp = usePhoneOtp("checkout-recaptcha");
  const phoneField = useFieldValidation(phone10);
  const otpField = useFieldValidation(otp6);
  const localPhone = otp.phone.replace(/^\+91/, "");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState(false); // inline OTP sheet (guest-first, cart preserved)
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; total: number } | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [utm, setUtm] = useState<UtmData | undefined>();
  const clientOrderKey = useRef<string>(newClientOrderKey());

  const localTotal = ticketTypes.reduce((s, t) => s + (qty[t.id] ?? 0) * t.priceInPaise, 0);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  const total = coupon ? coupon.total : localTotal;
  const capOf = (t: TicketType) => Math.max(0, Math.min(10, t.remaining));
  const setQ = (t: TicketType, v: number) => setQty((q) => ({ ...q, [t.id]: Math.max(0, Math.min(capOf(t), v)) }));

  const buildItems = () =>
    ticketTypes.filter((t) => (qty[t.id] ?? 0) > 0).map((t) => ({ ticketTypeId: t.id, qty: qty[t.id] }));

  const quote = async (code: string) => {
    const items = buildItems();
    if (!items.length) { setCouponErr(COUPON_COPY.EMPTY); return false; }
    setApplying(true);
    setCouponErr(null);
    const res = await quoteOrderAction({ eventId, items, couponCode: code });
    setApplying(false);
    if (res.ok) { setCoupon({ code, discount: res.data.discount, total: res.data.total }); return true; }
    setCoupon(null);
    setCouponErr(res.error.message ?? COUPON_COPY[res.error.code] ?? "Couldn't check that code — try again.");
    return false;
  };

  // Re-quote when quantities change while a code is applied (totals must never go stale).
  const qtyKey = JSON.stringify(qty);
  const appliedCode = coupon?.code ?? null;
  const requoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const captured = utmFromSearch(window.location.search);
    if (captured) {
      writeStoredUtm(captured);
      setUtm(captured);
    } else {
      setUtm(readStoredUtm());
    }
  }, []);

  useEffect(() => {
    clientOrderKey.current = newClientOrderKey();
  }, [qtyKey, appliedCode]);

  useEffect(() => {
    if (!appliedCode) return;
    if (requoteTimer.current) clearTimeout(requoteTimer.current);
    requoteTimer.current = setTimeout(() => void quote(appliedCode), 350);
    return () => { if (requoteTimer.current) clearTimeout(requoteTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtyKey]);

  // Place the order + open Razorpay. On 401 (anonymous) we open the inline OTP sheet instead of
  // bouncing to /login — the cart (qty + coupon) stays exactly as-is and we resume after verify.
  const placeOrder = async () => {
    const items = buildItems();
    if (!items.length) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, items, couponCode: coupon?.code, utm, clientOrderKey: clientOrderKey.current }),
      });
      if (res.status === 401) { setBusy(false); setAuthStep(true); return; }
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json?.error?.code === "COUPON_INVALID") {
          setCoupon(null);
          setCouponErr(COUPON_COPY.COUPON_INVALID);
          throw new Error("That coupon stopped working — the total is back to full price.");
        }
        throw new Error(json?.error?.code === "SOLD_OUT" ? "Some tickets just sold out — adjust your quantities and try again." : "Could not start checkout. Please try again.");
      }
      await openCheckout({
        keyId: json.data.keyId,
        razorpayOrderId: json.data.razorpayOrderId,
        amountPaise: json.data.amountPaise,
        description: "Event tickets",
        onSuccess: () => router.push(`/tickets?reveal=${json.data.orderId}`),
        onDismiss: () => setBusy(false),
      });
    } catch (e) {
      clientOrderKey.current = newClientOrderKey();
      setErr(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  };

  const verifyAndPay = () =>
    otp.verifyOtp(async () => { setAuthStep(false); await placeOrder(); }, { zone: "customer" });

  return (
    <div className="p-[var(--space-xl)]" style={{ border: "1px solid var(--color)" }}>
      <ul>
        {ticketTypes.map((t, i) => {
          const soldOut = t.remaining <= 0;
          const low = t.remaining > 0 && t.remaining <= LOW_STOCK;
          const selected = (qty[t.id] ?? 0) > 0;
          return (
            <li
              key={t.id}
              className="flex items-center justify-between gap-[var(--space-lg)] rounded-[var(--radius-md)] px-[var(--space-md)] py-[var(--space-lg)] transition-colors duration-200"
              style={{
                ...(i > 0 ? { borderTop: "1px solid color-mix(in srgb, currentColor 30%, transparent)" } : {}),
                ...(selected ? { background: "color-mix(in srgb, currentColor 7%, transparent)" } : {}),
              }}
            >
              <div>
                <p className="f-paragraph f-bold">{t.name}</p>
                <p className="f-paragraph-small opacity-70">{formatPaise(t.priceInPaise)}</p>
                {soldOut ? (
                  <p className="f-paragraph-small f-bold mt-[2px]" style={{ color: "var(--red)" }}>Sold out</p>
                ) : low ? (
                  <p className="f-paragraph-small f-bold mt-[2px]" style={{ color: "var(--red)" }}>Only {t.remaining} left</p>
                ) : null}
              </div>
              <div className="flex items-center gap-[var(--space-md)]">
                <button type="button" aria-label={`Fewer ${t.name}`} data-cursor className="qty-btn" disabled={soldOut} onClick={() => setQ(t, (qty[t.id] ?? 0) - 1)}>−</button>
                <span className="f-exat w-[2ch] text-center f-h32">{qty[t.id] ?? 0}</span>
                <button type="button" aria-label={`More ${t.name}`} data-cursor className="qty-btn" disabled={soldOut || (qty[t.id] ?? 0) >= capOf(t)} onClick={() => setQ(t, (qty[t.id] ?? 0) + 1)}>+</button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Coupon (customer-portal §3.10): underline field + Apply; server-priced savings line. */}
      <div className="mt-[var(--space-lg)] pt-[var(--space-lg)]" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 30%, transparent)" }}>
        <div className="flex items-end gap-[var(--space-md)]">
          <input
            type="text"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="COUPON CODE"
            aria-label="Coupon code"
            maxLength={20}
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
            <button type="button" data-cursor aria-label="Remove coupon" className="f-paragraph-small opacity-70" onClick={() => { setCoupon(null); setCouponErr(null); setCouponInput(""); }}>✕</button>
          )}
        </div>
        {coupon && coupon.discount > 0 && (
          <p className="f-paragraph-small f-bold mt-[var(--space-sm)]" style={{ color: "var(--success)" }}>{coupon.code} applied — you save {formatPaise(coupon.discount)}</p>
        )}
        {coupon && coupon.discount === 0 && (
          <p className="f-paragraph-small mt-[var(--space-sm)] opacity-75">{coupon.code} works, but another discount already beats it — best price wins.</p>
        )}
        {couponErr && <p role="alert" className="f-paragraph-small f-bold mt-[var(--space-sm)]" style={{ color: "var(--red)" }}>{couponErr}</p>}
      </div>

      <div className="mt-[var(--space-lg)] flex flex-wrap items-end justify-between gap-[var(--space-lg)] pt-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
        <div>
          <p className="f-exat f-h60">{formatPaise(total)}</p>
          <p className="kicker mt-[var(--space-xs)] opacity-70">{count} ticket{count === 1 ? "" : "s"}</p>
        </div>
        {!authStep && (
          <Magnetic>
            <button type="button" className="btn btn--lg" data-cursor disabled={!count || busy} onClick={() => void placeOrder()}>
              <span className="btn__text">{busy ? "Starting…" : "Buy tickets"}</span>
            </button>
          </Magnetic>
        )}
      </div>

      {/* Inline phone-OTP (R3.3): verify in place, then payment resumes with the cart intact. */}
      {authStep && (
        <div className="mt-[var(--space-lg)] pt-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
          <p className="f-paragraph f-bold">Verify your phone to pay</p>
          <p className="f-paragraph-small mt-[2px] opacity-70">We&apos;ll text a one-time code. Your tickets are held — no need to start over.</p>
          {!otp.confirmation ? (
            <div className="mt-[var(--space-md)] flex flex-wrap items-end gap-[var(--space-md)]">
              <div className="flex items-baseline gap-[var(--space-xs)] pb-[4px]" style={{ borderBottom: "1px solid currentColor" }}>
                <span className="f-paragraph opacity-70">+91</span>
                <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={localPhone} aria-label="Phone number"
                  aria-invalid={!!phoneField.error}
                  onChange={(e) => { otp.setPhone("+91" + digitsCapped(10)(e.target.value)); phoneField.clear(); }}
                  onBlur={() => localPhone && phoneField.validate(localPhone)}
                  placeholder="9876543210"
                  className="f-paragraph w-full max-w-[14ch] bg-transparent outline-none" />
              </div>
              <button type="button" className="btn" data-cursor disabled={otp.loading} onClick={() => { if (phoneField.validate(localPhone)) void otp.sendOtp(); }}>
                <span className="btn__text">{otp.loading ? "Sending…" : "Send code"}</span>
              </button>
              {phoneField.error && <p role="alert" className="f-paragraph-small f-bold w-full" style={{ color: "var(--red)" }}>{phoneField.error}</p>}
            </div>
          ) : (
            <div className="mt-[var(--space-md)] flex flex-wrap items-end gap-[var(--space-md)]">
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp.code}
                onChange={(e) => { otp.setCode(digitsCapped(6)(e.target.value)); otpField.clear(); }}
                onBlur={() => otp.code && otpField.validate(otp.code)}
                aria-invalid={!!otpField.error}
                placeholder="6-digit code" aria-label="One-time code"
                className="f-paragraph w-full max-w-[12ch] bg-transparent pb-[4px] text-center tracking-[0.4em] outline-none" style={{ borderBottom: "1px solid currentColor" }} />
              <button type="button" className="btn" data-cursor disabled={otp.loading || otp.code.length !== 6} onClick={() => { if (otpField.validate(otp.code)) void verifyAndPay(); }}>
                <span className="btn__text">{otp.loading ? "Verifying…" : "Verify & pay"}</span>
              </button>
              {otpField.error && <p role="alert" className="f-paragraph-small f-bold w-full" style={{ color: "var(--red)" }}>{otpField.error}</p>}
            </div>
          )}
          {otp.status && <p role="status" aria-live="polite" className="f-paragraph-small mt-[var(--space-sm)] opacity-75">{otp.status}</p>}
          <button type="button" className="f-paragraph-small mt-[var(--space-sm)] opacity-60 link-underline" onClick={() => { setAuthStep(false); otp.reset(); }}>Back</button>
          <div id="checkout-recaptcha" />
        </div>
      )}

      {err && <p role="alert" className="f-paragraph-small f-bold mt-[var(--space-md)]" style={{ color: "var(--red)" }}>{err}</p>}
      {count > 1 && (
        <p className="f-paragraph-small f-bold mt-[var(--space-md)]">One QR admits your whole group — keep it on one phone.</p>
      )}

      {/* Trust strip (R3.3) — visible reassurance at the point of payment. */}
      <ul className="mt-[var(--space-md)] flex flex-wrap gap-x-[var(--space-lg)] gap-y-[var(--space-xs)] opacity-75">
        <li className="f-paragraph-small">🔒 Secure payment via Razorpay</li>
        <li className="f-paragraph-small">Instant QR ticket to your phone</li>
        <li className="f-paragraph-small">Support available for payment issues</li>
      </ul>
      <p className="f-paragraph-small mt-[var(--space-xs)] opacity-60">Buying 6 or more? Bulk savings apply automatically.</p>
    </div>
  );
}
