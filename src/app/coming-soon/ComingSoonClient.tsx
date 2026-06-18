"use client";

import { useEffect, useRef, useState } from "react";
import { joinPlatformWaitlist } from "@/actions/waitlist";
import { phone10, digitsCapped } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";
import { InviteCountdown } from "./InviteCountdown";

// "The Invitation" coming-soon gate (bespoke, off-RPA). Luxury paper-invitation look with an
// accessible light/dark toggle (sun/moon, top-right). Plumbing unchanged — submits the same
// FormData to joinPlatformWaitlist. Colours come from .cs-invite tokens (AA contrast both themes).

const reveal = (d: string) => ({ "--d": d }) as React.CSSProperties;

function ArrowRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function ComingSoonClient({ count, targetIso }: { count: number; targetIso: string | null }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [interestedInStall, setInterestedInStall] = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [phone, setPhone] = useState("");
  const phoneField = useFieldValidation(phone10);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const successRef = useRef<HTMLParagraphElement>(null);

  // Resolve preferred theme after mount (SSR renders light → no hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem("cs-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const toggleTheme = () =>
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      localStorage.setItem("cs-theme", next);
      return next;
    });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phoneField.validate(phone)) return; // 10-digit rule, blocks before submit
    setStatus("loading");
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

  return (
    <main
      data-theme={theme}
      className="cs-invite relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-[clamp(2.5rem,7vh,4rem)]"
    >
      <div aria-hidden className="cs-frame cs-reveal" style={reveal("0s")} />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        className="fixed z-30 grid size-9 place-items-center rounded-full transition-opacity duration-300 hover:opacity-60"
        style={{ top: "clamp(20px,4vw,40px)", right: "clamp(20px,4vw,40px)", border: "1px solid var(--line)", color: "var(--ink)" }}
      >
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </button>

      <div className="relative z-10 flex w-full max-w-[40rem] flex-col items-center text-center">
        <span className="cs-reveal text-[0.7rem] uppercase" style={{ ...reveal("0s"), letterSpacing: "0.36em", color: "var(--ink-soft)" }}>
          BDQ Social
        </span>

        <span className="cs-reveal mt-[clamp(1.6rem,5vh,2.6rem)] text-[0.7rem] uppercase" style={{ ...reveal("0.1s"), letterSpacing: "0.38em", color: "var(--accent-text)" }}>
          Limited Invitation
        </span>

        <h1 className="cs-serif cs-reveal mt-[1rem]" style={{ ...reveal("0.2s"), fontSize: "clamp(1.9rem,5vw,3.4rem)", fontWeight: 500, lineHeight: 1.12, color: "var(--ink)" }}>
          Something Beautiful Is Gathering.
        </h1>

        <p className="cs-reveal mt-[1.15rem] max-w-[36rem]" style={{ ...reveal("0.3s"), color: "var(--ink-soft)", fontSize: "clamp(0.92rem,2.4vw,1.04rem)", lineHeight: 1.65 }}>
          An unforgettable evening of exceptional brands, remarkable food, live music and the city&apos;s most inspiring people.
        </p>

        <div className="cs-reveal mt-[clamp(1.8rem,5vh,2.6rem)] flex w-full max-w-[20rem] items-center gap-3" style={reveal("0.4s")}>
          <span className="cs-rule cs-reveal-draw" style={reveal("0.5s")} />
          <span className="cs-diamond shrink-0" />
          <span className="cs-rule cs-reveal-draw" style={reveal("0.5s")} />
        </div>

        <InviteCountdown targetIso={targetIso} />

        <div className="cs-reveal mt-[clamp(2rem,6vh,3rem)] w-full max-w-[26rem]" style={reveal("0.6s")}>
          {status === "success" ? (
            <div className="px-[1.6rem] py-[1.5rem]" style={{ border: "1px solid var(--line)" }}>
              <p ref={successRef} tabIndex={-1} className="cs-serif outline-none" style={{ fontSize: "clamp(1.4rem,4vw,1.8rem)", color: "var(--ink)" }}>
                Your invitation is reserved.
              </p>
              <p className="mt-[0.6rem] text-[0.9rem]" style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>
                We&apos;ll WhatsApp {submittedPhone || "you"} the moment doors open.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="mb-[0.9rem] text-[0.6rem] uppercase" style={{ letterSpacing: "0.32em", color: "var(--ink-soft)" }}>
                Request your invitation
              </p>

              <div className="flex items-baseline gap-2 pb-2" style={{ borderBottom: "1px solid var(--field-line)" }}>
                <span className="cs-serif shrink-0" style={{ fontSize: "1.15rem", color: "var(--ink)" }}>+91</span>
                <input
                  type="tel"
                  name="phone"
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
                  className="cs-serif w-full min-w-0 bg-transparent outline-none placeholder:opacity-35 disabled:opacity-50"
                  style={{ fontSize: "1.15rem", color: "var(--ink)", letterSpacing: "0.05em" }}
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  aria-label="Request invitation"
                  className="shrink-0 transition-opacity duration-300 hover:opacity-60 disabled:opacity-40"
                  style={{ color: "var(--accent-text)" }}
                >
                  {status === "loading" ? (
                    <span className="text-[0.7rem] uppercase" style={{ letterSpacing: "0.2em" }}>Sending</span>
                  ) : (
                    <ArrowRight />
                  )}
                </button>
              </div>

              {phoneField.error && (
                <p role="alert" className="mt-[0.55rem] text-[0.72rem]" style={{ color: "var(--error)" }}>
                  {phoneField.error}
                </p>
              )}

              <button
                type="button"
                onClick={() => setInterestedInStall((v) => !v)}
                aria-pressed={interestedInStall}
                className="mt-[1.1rem] flex items-center gap-[0.6rem] text-[0.62rem] uppercase"
                style={{ letterSpacing: "0.16em", color: "var(--ink-soft)" }}
              >
                <span
                  className="grid size-[0.95rem] shrink-0 place-items-center"
                  style={{ border: "1px solid var(--field-line)", background: interestedInStall ? "var(--gold)" : "transparent" }}
                >
                  {interestedInStall && <span className="size-[0.4rem]" style={{ background: "var(--paper)" }} />}
                </span>
                I would like to exhibit my brand
              </button>

              {status === "error" && (
                <p role="alert" className="mt-[0.9rem] text-[0.8rem]" style={{ color: "var(--ink)" }}>
                  {message}
                </p>
              )}

              {count > 0 && (
                <p className="mt-[1.2rem] text-[0.62rem] uppercase" style={{ letterSpacing: "0.2em", color: "var(--ink-soft)" }}>
                  {count.toLocaleString()} already requested
                </p>
              )}
            </form>
          )}
        </div>

        <p className="cs-reveal mt-[clamp(2rem,6vh,3rem)] text-[0.6rem] uppercase" style={{ ...reveal("0.7s"), letterSpacing: "0.28em", color: "var(--ink-soft)" }}>
          Vadodara · Autumn 2026
        </p>
      </div>
    </main>
  );
}
