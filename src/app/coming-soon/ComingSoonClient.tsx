"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { joinPlatformWaitlist } from "@/actions/waitlist";
import { phone10, digitsCapped } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";
import { Magnetic } from "@/components/motion/Magnetic";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { MarketBackdrop } from "./MarketBackdrop";
import { PortalCountdown } from "./PortalCountdown";

type ComingSoonEvent = {
  name: string;
  location: string | null;
  startsAtIso: string;
};

const CATEGORIES = [
  { label: "Brands", tone: "pink", note: "curated labels" },
  { label: "Food", tone: "yellow", note: "gourmet counters" },
  { label: "Experiences", tone: "green", note: "immersive corners" },
  { label: "Music", tone: "blue", note: "indie sets" },
  { label: "Performances", tone: "red", note: "after-dark acts" },
] as const;

const MARQUEE = [...CATEGORIES.map((item) => item.label), "Vadodara"];

function ArrowRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h13M12 6l6 6-6 6" />
    </svg>
  );
}

export function ComingSoonClient({ count, event }: { count: number; event: ComingSoonEvent | null }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [interestedInStall, setInterestedInStall] = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [phone, setPhone] = useState("");
  const phoneField = useFieldValidation(phone10);
  const successRef = useRef<HTMLDivElement>(null);

  const eventDate = useMemo(() => {
    if (!event) return "Date reveal soon";
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }).format(new Date(event.startsAtIso));
  }, [event]);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phoneField.validate(phone)) return;
    setStatus("loading");
    setMessage("");
    const formData = new FormData(e.currentTarget);
    formData.set("interestedInStall", String(interestedInStall));
    const result = await joinPlatformWaitlist(formData);
    if (result.error) {
      setStatus("error");
      setMessage(result.error);
    } else {
      setSubmittedPhone(phone);
      setStatus("success");
    }
  };

  const phoneErrorId = phoneField.error ? "market-phone-error" : undefined;
  const serverErrorId = status === "error" ? "market-server-error" : undefined;
  const describedBy = [phoneErrorId, serverErrorId].filter(Boolean).join(" ") || undefined;

  return (
    <main id="main" data-header-mode="light" className="market-soon gama-1 bg-1 paint relative min-h-dvh overflow-hidden">
      <MarketBackdrop />

      <section className="wrapper market-soon__hero relative z-10">
        <div className="market-soon__copy">
          <div className="market-soon__topline">
            <span className="kicker">BDQ Social</span>
            <span>{event?.location ?? "Vadodara"}</span>
            <span>{eventDate}</span>
          </div>

          <SplitReveal as="h1" className="f-exat market-soon__title mt-[var(--space-md)]">
            Step into
            <br />
            Vadodara&apos;s
            <br />
            night market.
          </SplitReveal>

          <p className="f-paragraph market-soon__deck mt-[var(--space-md)]">
            A curated after-dark gathering of brands, food, experiences, music, and performances designed to make the city feel new.
          </p>

          <div className="market-soon__mix mt-[var(--space-lg)]" aria-label="Market mix">
            {CATEGORIES.map((item) => (
              <span key={item.label}>{item.label}</span>
            ))}
          </div>
        </div>

        <aside className="market-pass" aria-label="Request an invite">
          <PortalCountdown targetIso={event?.startsAtIso ?? null} />

          <div className="market-pass__invite">
            {status === "success" ? (
              <div ref={successRef} tabIndex={-1} className="market-soon__success outline-none">
                <p className="f-exat f-h42">You&apos;re on the invite list.</p>
                <p className="f-paragraph-small mt-[var(--space-sm)]">
                  We&apos;ll WhatsApp {submittedPhone || "you"} when the doors open.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} aria-live="polite">
                <div className="market-soon__form-head">
                  <p className="kicker">Request your invite</p>
                  {count > 0 ? <p>{count.toLocaleString("en-IN")} already requested access</p> : null}
                </div>

                <label className="market-soon__phone mt-[var(--space-md)]">
                  <span>+91</span>
                  <input
                    type="tel"
                    name="phone"
                    aria-label="Phone number"
                    aria-describedby={describedBy}
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="9876543210"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      setPhone(digitsCapped(10)(e.target.value));
                      phoneField.clear();
                    }}
                    onBlur={() => phone && phoneField.validate(phone)}
                    aria-invalid={!!phoneField.error}
                    disabled={status === "loading"}
                    className="min-w-0 bg-transparent outline-none placeholder:opacity-45 disabled:opacity-50"
                  />
                  <Magnetic className="shrink-0" strength={0.45}>
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      aria-label="Request invitation"
                      className="market-soon__submit"
                    >
                      {status === "loading" ? <span>Sending</span> : <ArrowRight />}
                    </button>
                  </Magnetic>
                </label>

                {phoneField.error ? (
                  <p id="market-phone-error" role="alert" className="f-paragraph-small mt-[var(--space-sm)] market-soon__error">
                    {phoneField.error}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => setInterestedInStall((v) => !v)}
                  aria-pressed={interestedInStall}
                  className="market-soon__stall"
                >
                  <span data-active={interestedInStall}>{interestedInStall ? <span /> : null}</span>
                  I want to exhibit my brand
                </button>

                {status === "error" ? (
                  <p id="market-server-error" role="alert" className="f-paragraph-small mt-[var(--space-sm)] market-soon__error">
                    {message}
                  </p>
                ) : null}
              </form>
            )}
          </div>

          <div className="market-categories" aria-label="Coming inside">
            <p className="kicker">Inside the night</p>
            <div className="market-categories__grid">
              {CATEGORIES.map((item, i) => (
                <span
                  key={item.label}
                  className="market-category-card"
                  data-tone={item.tone}
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <span>{item.label}</span>
                  <small>{item.note}</small>
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <div className="market-marquee relative z-10" aria-hidden>
        <div>
          {[...MARQUEE, ...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={`${item}-${i}`}>{item}</span>
          ))}
        </div>
      </div>
    </main>
  );
}
