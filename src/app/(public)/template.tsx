"use client";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

// Per-navigation entrance: content fades/rises in on each route change (RPA transition feel).
// Re-mounts on navigation. SSR renders fully visible; reduced-motion skips the animation.
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.from(el, {
      opacity: 0,
      y: 14,
      duration: 0.5,
      ease: "power2.out",
      onComplete: () => {
        gsap.set(el, { clearProps: "transform" });
        ScrollTrigger.refresh();
      },
    });
    // Recalculate ScrollTrigger positions once the new page is in place.
    ScrollTrigger.refresh();
    return () => {
      tween.kill();
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
