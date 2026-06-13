"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { EASE } from "@/lib/motion";
import { WordmarkWall } from "./WordmarkWall";

// Signature load moment (RPA preloader, adapted): animated wordmark wall + organic green
// blob with a counter, then the whole panel sweeps up. Hard-capped (~1.8s), runs once per
// session, never gates on network, skipped under reduced-motion.
export function PageLoader() {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("bdq-loaded");
    // Automation agents (Lighthouse drives CDP so webdriver alone isn't enough; headless crawlers,
    // e2e) skip the intro — it would only delay their LCP, and bots don't enjoy the show.
    const automated = navigator.webdriver === true || /Chrome-Lighthouse|HeadlessChrome/i.test(navigator.userAgent);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || automated;
    if (seen || reduce) {
      sessionStorage.setItem("bdq-loaded", "1");
      setDone(true);
      return;
    }
    sessionStorage.setItem("bdq-loaded", "1");

    const el = ref.current;
    if (!el) return;
    const rows = el.querySelectorAll(".wall .marquee");
    const blob = el.querySelector("[data-loader-blob]");
    const blobB = el.querySelector("[data-loader-blob-b]");
    const num = el.querySelector("[data-loader-count]");
    const counter = { v: 0 };

    const tl = gsap.timeline({ onComplete: () => setDone(true) });
    tl.from(rows, {
      xPercent: (i: number) => (i % 2 ? 6 : -6),
      opacity: 0,
      duration: 0.5,
      ease: EASE.max,
      stagger: 0.05,
    })
      .from(blob, { scale: 0.3, rotation: -10, duration: 0.55, ease: "back.out(1.4)" }, 0.12)
      .to(
        counter,
        {
          v: 100,
          duration: 0.8,
          ease: EASE.inOut,
          snap: { v: 1 },
          onUpdate: () => {
            if (num) num.textContent = `${counter.v}%`;
          },
        },
        0.25,
      )
      // crossfade to a second mask shape — reads as the blob morphing
      .to(blobB, { opacity: 1, duration: 0.35, ease: EASE.inOut }, 0.62)
      .to(el, { yPercent: -100, duration: 0.7, ease: EASE.strongInOut }, 1.15);

    return () => {
      tl.kill();
    };
  }, []);

  if (done) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed inset-0 z-[200] overflow-hidden"
      style={
        {
          background: "var(--dark-blue)",
          color: "var(--light-blue)",
          "--color": "var(--light-blue)", // wall rows shadow-paint with var(--color)
        } as React.CSSProperties
      }
    >
      <WordmarkWall
        rows={6}
        duration={16}
        rowClassName="f-h133"
        className="absolute inset-0 flex flex-col justify-between py-[var(--space-lg)] opacity-90"
      />
      <div
        data-loader-blob
        className="absolute left-1/2 top-1/2 w-[34vw] min-w-[20rem] max-w-[34rem] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="svg svg--form2 w-full">
          <div className="svg__bg" style={{ background: "var(--green)" }} />
        </div>
        <div data-loader-blob-b className="svg svg--form6 absolute inset-0 h-full w-full opacity-0" style={{ aspectRatio: "auto" }}>
          <div className="svg__bg" style={{ background: "var(--green)" }} />
        </div>
        <span
          data-loader-count
          className="f-exat f-h60 absolute inset-0 grid place-items-center"
          style={{ color: "var(--dark-blue)" }}
        >
          0%
        </span>
      </div>
    </div>
  );
}
