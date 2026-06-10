"use client";
import { useEffect } from "react";

// RPA per-section retint: the fixed header adopts the accent (`--color`) of whichever
// section sits under the top of the viewport. Writes `--header-color` on <html>; the header
// reads it. rAF-throttled, passive. No-op where there are no `.rpa section`s.
export function SectionColorSync() {
  useEffect(() => {
    const root = document.documentElement;
    const probeY = 28;
    let raf = 0;

    const update = () => {
      raf = 0;
      const sections = document.querySelectorAll<HTMLElement>(".rpa section");
      let found: HTMLElement | null = null;
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= probeY && r.bottom > probeY) found = s;
      }
      if (found) {
        const c = getComputedStyle(found).color;
        if (c) root.style.setProperty("--header-color", c);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.style.removeProperty("--header-color");
    };
  }, []);

  return null;
}
