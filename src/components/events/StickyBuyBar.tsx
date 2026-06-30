"use client";

import { useEffect, useState } from "react";

/**
 * Sticky mobile purchase bar (R3.3). Appears once the hero CTA scrolls out of view, giving a
 * persistent thumb-reachable "Get tickets" that jumps to the checkout. Mobile only — desktop keeps
 * the inline CTAs. No layout shift: it's fixed-position and fades in.
 */
export function StickyBuyBar({ priceLabel }: { priceLabel: string | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("event-hero-cta");
    if (!hero) { setShow(true); return; }
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { rootMargin: "0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 lg:hidden ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}
      style={{ transition: "transform .25s ease, opacity .25s ease", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="bdq-night flex items-center justify-between gap-[var(--space-lg)] px-[var(--space-lg)] py-[var(--space-md)]" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 25%, transparent)" }}>
        <div className="min-w-0">
          <p className="kicker opacity-70">Tickets</p>
          {priceLabel && <p className="f-exat f-h32">{priceLabel}</p>}
        </div>
        <a href="#tickets" className="btn shrink-0" data-cursor>
          <span className="btn__text">Get tickets</span>
        </a>
      </div>
    </div>
  );
}
