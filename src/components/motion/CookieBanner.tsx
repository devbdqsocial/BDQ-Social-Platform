"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// RPA-style cookie consent: a small navy card bottom-left, fades in after load, once per device.
export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("bdq_cookie")) {
        const t = setTimeout(() => setShow(true), 900);
        return () => clearTimeout(t);
      }
    } catch {
      /* storage blocked — don't nag */
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem("bdq_cookie", "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="gama-1 bg-1 paint fixed bottom-[var(--space-lg)] left-[var(--space-lg)] z-[80] w-[min(27rem,calc(100vw-2*var(--space-lg)))] rounded-[var(--radius-lg)] p-[var(--space-xl)] shadow-[0_18px_48px_rgba(0,0,0,0.35)]"
      role="dialog"
      aria-label="Cookie notice"
    >
      <p className="f-exat" style={{ fontSize: "var(--h42)", lineHeight: 1.05 }}>Cookies</p>
      <p className="f-paragraph-small mt-[var(--space-sm)] opacity-80">
        We use cookies to make the site work and to understand what&apos;s popular. See our{" "}
        <Link href="/privacy" className="underline" data-cursor>privacy policy</Link>.
      </p>
      <div className="mt-[var(--space-lg)] flex items-center gap-[var(--space-lg)]">
        <button type="button" onClick={accept} className="btn" data-cursor style={{ width: "7.5rem" }}>
          <span className="btn__text">Accept</span>
        </button>
        <button type="button" onClick={accept} data-cursor className="f-paragraph-small f-bold t-upper opacity-70" style={{ letterSpacing: "0.12em" }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
