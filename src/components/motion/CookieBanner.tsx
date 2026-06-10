"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// Slim one-line consent bar pinned to the bottom edge: ink bg, never covers content.
// Shows once per device; sits below the customer tab bar's z-index on mobile.
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
      className="fixed inset-x-0 bottom-0 z-[80] flex flex-wrap items-center justify-center gap-x-[var(--space-xl)] gap-y-[var(--space-sm)] px-[var(--wrapper-padd)] py-[var(--space-md)] text-center"
      style={{ background: "var(--ink, #14141A)", color: "#F4F2EC" }}
      role="dialog"
      aria-label="Cookie notice"
    >
      <p className="f-paragraph-small opacity-90">
        We use cookies to make the site work and to see what&apos;s popular.{" "}
        <Link href="/privacy" className="underline" data-cursor>Privacy policy</Link>
      </p>
      <div className="flex items-center gap-[var(--space-xl)]">
        <button type="button" onClick={accept} data-cursor className="f-paragraph-small f-bold t-upper underline" style={{ letterSpacing: "0.12em" }}>
          Accept
        </button>
        <button type="button" onClick={accept} data-cursor className="f-paragraph-small f-bold t-upper opacity-60" style={{ letterSpacing: "0.12em" }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
