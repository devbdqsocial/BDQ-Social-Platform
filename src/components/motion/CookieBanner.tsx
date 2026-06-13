"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// Floating mini-pill consent (user-chosen style): one line, bottom-left, rounded ink pill.
// Safe-area aware; shows once per device; sits clear of the mobile tab bar.
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

  return show ? (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed left-[var(--space-lg)] z-[80] flex max-w-[calc(100vw-2*var(--space-lg))] items-center gap-[var(--space-md)] rounded-full py-[0.5em] pl-[1.1em] pr-[0.7em] shadow-[0_10px_30px_rgba(0,0,0,0.3)] bottom-[calc(var(--space-lg)+env(safe-area-inset-bottom,0px)+3.5rem)] sm:bottom-[calc(var(--space-lg)+env(safe-area-inset-bottom,0px))]"
      style={{
        background: "var(--color-ink)",
        color: "var(--color-cream-100)",
        fontSize: "var(--paragraph-small)",
      }}
    >
      <p className="whitespace-nowrap">
        🍪 Cookies keep BDQ working ·{" "}
        <Link href="/privacy" data-cursor className="underline opacity-80 hover:opacity-100">
          Privacy
        </Link>
      </p>
      <button
        type="button"
        onClick={accept}
        data-cursor
        className="f-bold t-upper underline underline-offset-2"
        style={{ letterSpacing: "0.1em" }}
      >
        Accept
      </button>
      <button
        type="button"
        onClick={accept}
        aria-label="Dismiss cookie notice"
        data-cursor
        className="grid size-[1.9em] shrink-0 place-items-center rounded-full"
        style={{ background: "rgba(255,255,255,0.12)" }}
      >
        ✕
      </button>
    </div>
  ) : null;
}
