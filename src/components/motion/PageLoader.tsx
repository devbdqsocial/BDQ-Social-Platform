"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

// RPA-style page-load curtain: a navy panel with the wordmark that slides up off-screen.
// Runs once per session (sessionStorage); skipped entirely under reduced-motion.
export function PageLoader() {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("bdq-loaded");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) {
      sessionStorage.setItem("bdq-loaded", "1");
      setDone(true);
      return;
    }
    sessionStorage.setItem("bdq-loaded", "1");

    const el = ref.current;
    if (!el) return;
    const tl = gsap.timeline({ onComplete: () => setDone(true) });
    tl.to(el.querySelector("[data-loader-logo]"), {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "power2.out",
    }).to(el, {
      yPercent: -100,
      duration: 0.7,
      ease: "power3.inOut",
      delay: 0.35,
    });

    return () => {
      tl.kill();
    };
  }, []);

  if (done) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="bg-ink fixed inset-0 z-[200] grid place-items-center text-cream-100"
    >
      <span
        data-loader-logo
        className="translate-y-2 font-display text-3xl font-bold tracking-tight opacity-0"
      >
        BDQ<span className="text-lavender-400">.</span>
      </span>
    </div>
  );
}
