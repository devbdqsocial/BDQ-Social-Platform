"use client";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

// RPA custom cursor (#mouse): a yellow dot that follows with lerp 0.2 (mix-blend-mode:difference,
// styled in globals.css), shrinking over interactive targets. Pointer-fine only; off on touch/reduced.
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const xSet = gsap.quickSetter(el, "x", "px");
    const ySet = gsap.quickSetter(el, "y", "px");
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const mouse = { x: pos.x, y: pos.y };
    const speed = 0.2;

    const tick = () => {
      const dt = 1 - Math.pow(1 - speed, gsap.ticker.deltaRatio());
      pos.x += (mouse.x - pos.x) * dt;
      pos.y += (mouse.y - pos.y) * dt;
      xSet(pos.x);
      ySet(pos.y);
    };
    gsap.ticker.add(tick);

    // Invisible until the pointer actually moves — otherwise the dot sits mid-viewport on load.
    el.style.opacity = "0";
    let seen = false;
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!seen) {
        seen = true;
        pos.x = e.clientX;
        pos.y = e.clientY;
        el.style.opacity = "1";
      }
    };
    const isTarget = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("a, button, [role='button'], [data-cursor]");
    const onOver = (e: MouseEvent) => {
      if (isTarget(e.target)) el.classList.add("is-hover");
    };
    const onOut = (e: MouseEvent) => {
      if (isTarget(e.target)) el.classList.remove("is-hover");
    };

    document.documentElement.classList.add("cursor-none");
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      gsap.ticker.remove(tick);
      document.documentElement.classList.remove("cursor-none");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);

  return (
    <div id="mouse" ref={ref} aria-hidden>
      <div className="mouse__dot" />
    </div>
  );
}
