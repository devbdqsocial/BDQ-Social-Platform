"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

// Window-level Lenis smooth scroll, synced to GSAP's ticker + ScrollTrigger.
// Effect-only (renders nothing). Disabled under reduced-motion and on the canvas map routes,
// where native scroll/interaction must stay untouched.
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    // BDQ: native scroll on mobile (<=950) and under reduced-motion; Lenis on desktop only.
    if (window.matchMedia("(max-width: 950px), (prefers-reduced-motion: reduce)").matches) return;
    if (/map/i.test(pathname)) return; // Konva stall map: leave native scroll alone.

    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [pathname]);

  return null;
}
