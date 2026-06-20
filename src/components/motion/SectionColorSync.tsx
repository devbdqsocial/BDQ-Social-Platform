"use client";
import { useEffect } from "react";

// RPA per-section retint: the fixed header adopts the accent of whichever
// section sits under the top of the viewport. Writes header CSS vars on <html>;
// the header reads them. rAF-throttled, passive.
export function SectionColorSync() {
  useEffect(() => {
    const root = document.documentElement;
    const probeY = 28;
    let raf = 0;

    const update = () => {
      raf = 0;
      const sections = document.querySelectorAll<HTMLElement>(".rpa section, .rpa footer");
      let found: HTMLElement | null = null;
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= probeY && r.bottom > probeY) found = s;
      }
      if (found) {
        const computed = getComputedStyle(found);
        const mode = found.dataset.headerMode;
        const sectionColor = computed.getPropertyValue("--color").trim() || computed.color;
        const sectionBg =
          computed.getPropertyValue("--bgcolor").trim() || computed.backgroundColor;
        const headerColor =
          found.dataset.headerColor ||
          (mode === "light"
            ? "var(--color-cream-50)"
            : mode === "dark"
              ? "var(--dark-blue)"
              : sectionColor);
        const headerBg = found.dataset.headerBg || sectionBg;

        if (headerColor) root.style.setProperty("--header-color", headerColor);
        if (headerBg) root.style.setProperty("--header-bg", headerBg);
        root.style.setProperty(
          "--header-backplate-opacity",
          mode === "light" ? "0.2" : "0",
        );
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
      root.style.removeProperty("--header-bg");
      root.style.removeProperty("--header-backplate-opacity");
    };
  }, []);

  return null;
}
