"use client";

import { useEffect, useRef, useState } from "react";
import { joinPlatformWaitlist } from "@/actions/waitlist";
import { phone10, digitsCapped } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";
import { trackWaitlistSignup } from "@/lib/analytics-events";
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
  { label: "Food", tone: "yellow", note: "gourmet discoveries" },
  { label: "Experiences", tone: "green", note: "immersive moments" },
  { label: "Music", tone: "blue", note: "live sessions" },
  { label: "Community", tone: "red", note: "meaningful connections" },
] as const;

const MARQUEE = [...CATEGORIES.map((item) => item.label), "Vadodara"];
const SHARE_TEXT = "I just got my invite to BDQ Social — Vadodara's curated night market. Get yours:";

function ArrowRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h13M12 6l6 6-6 6" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ComingSoonClient({ count, event, whatsappEnabled }: { count: number; event: ComingSoonEvent | null; whatsappEnabled: boolean }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [interestedInStall, setInterestedInStall] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState("");
  const phoneField = useFieldValidation(phone10);
  const successRef = useRef<HTMLDivElement>(null);

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
    if ("error" in result) {
      setStatus("error");
      setMessage(result.error);
      return;
    }
    setAlreadyJoined(result.alreadyJoined);
    setPosition(result.position);
    setStatus("success");
    if (!result.alreadyJoined) trackWaitlistSignup(interestedInStall ? "STALL" : "TICKET");
  };

  const shareUrl = () => (typeof window !== "undefined" ? window.location.origin : "");
  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${shareUrl()}`)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — ignore */
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
            <span>Vadodara, Gujarat</span>
            <span>Coming Soon</span>
          </div>

          <SplitReveal as="h1" className="f-exat market-soon__title mt-[var(--space-md)]">
            More Than
            <br />
            A Market.
            <br />
            A Movement.
          </SplitReveal>

          <p className="f-paragraph market-soon__deck mt-[var(--space-md)]">
            We&apos;re bringing together the city&apos;s most exciting brands, creators, food concepts, and experiences under one roof.
          </p>

          <div className="market-soon__clock mt-[var(--space-lg)]">
            <PortalCountdown targetIso={event?.startsAtIso ?? null} />
          </div>
        </div>

        <aside className="market-pass" aria-label="Request an invite">
          <div className="market-pass__invite">
            {status === "success" ? (
              <div ref={successRef} tabIndex={-1} className="market-soon__success outline-none">
                <p className="f-exat f-h42">{alreadyJoined ? "You're already in." : "You're on the invite list."}</p>
                <p className="f-paragraph-small mt-[var(--space-sm)]">
                  {whatsappEnabled
                    ? "We'll WhatsApp you the moment the doors open."
                    : "We'll be in touch the moment the doors open."}
                </p>
                {position ? (
                  <p className="market-soon__rank mt-[var(--space-md)]">
                    <span className="f-exat">#{position.toLocaleString("en-IN")}</span> in line
                  </p>
                ) : null}
                <div className="market-soon__share mt-[var(--space-md)]">
                  <a className="market-soon__share-wa" href={whatsappShareHref} target="_blank" rel="noopener noreferrer">
                    Share on WhatsApp
                  </a>
                  <button type="button" className="market-soon__share-copy" onClick={copyLink} aria-live="polite">
                    {copied ? "Link copied" : "Copy link"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} aria-busy={status === "loading"}>
                <div className="market-soon__form-head">
                  <div>
                    <p className="kicker">Join the guest list</p>
                    <p className="market-soon__cta-note">Limited early access →</p>
                  </div>
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
                      {status === "loading" ? <Spinner /> : <ArrowRight />}
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

      <footer className="market-footer relative z-10">
        <p>Crafted with Love ❤️ By Digitanomics LLP · © 2026</p>
      </footer>
    </main>
  );
}
