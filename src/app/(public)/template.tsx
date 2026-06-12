"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { EASE } from "@/lib/motion";

// React warns on useLayoutEffect during SSR; template still server-renders once.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Navy curtain page transition: on each client navigation the curtain covers the incoming
// route in the same commit (no blank flash), sweeps up, and the content rises in.
// Hidden by default so SSR/no-JS and the very first load (PageLoader owns it) show plain content.
let firstMount = true;

export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  const curtain = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const cur = curtain.current;
    const el = content.current;
    if (!cur || !el) return;

    const skip = firstMount || navigator.webdriver === true;
    firstMount = false;
    if (skip || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ScrollTrigger.refresh();
      return;
    }

    gsap.set(cur, { display: "grid", yPercent: 0 });
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(cur, { display: "none" });
        gsap.set(el, { clearProps: "transform,opacity" });
        ScrollTrigger.refresh();
      },
    });
    // fromTo (not from): a StrictMode-killed first run leaves opacity at 0, and a re-run
    // `from()` would then record 0 as its destination — content stuck invisible.
    tl.to(cur, { yPercent: -100, duration: 0.65, ease: EASE.strongInOut, delay: 0.05 })
      .fromTo(el, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: EASE.out }, "-=0.3");
    ScrollTrigger.refresh();

    return () => {
      tl.kill();
      gsap.set(cur, { display: "none" });
      gsap.set(el, { clearProps: "transform,opacity" });
    };
  }, []);

  return (
    <>
      <div
        ref={curtain}
        aria-hidden
        className="fixed inset-0 z-[150] hidden place-items-center"
        style={{ background: "var(--dark-blue)", color: "var(--light-blue)" }}
      >
        <span className="f-exat" style={{ fontSize: "var(--h60)" }}>
          BDQ<span style={{ color: "var(--green)" }}>.</span>
        </span>
      </div>
      <div ref={content}>{children}</div>
    </>
  );
}
