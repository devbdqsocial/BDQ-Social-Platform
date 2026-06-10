"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type RevealProps = React.ComponentProps<"div"> & {
  /** translateY start offset in px */
  y?: number;
  delay?: number;
  /** stagger the element's direct children instead of the element itself */
  stagger?: boolean;
  /** "fade" (default) rise+fade; "clip" wipes open top-to-bottom (for masked imagery) */
  effect?: "fade" | "clip";
};

// Scroll-reveal wrapper using GSAP ScrollTrigger. Content is visible without JS (SSR/SEO);
// the effect animates it in. Falls back to fully-visible under reduced-motion.
export function Reveal({ children, className, y = 24, delay = 0, stagger = false, effect = "fade", ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = stagger ? (Array.from(el.children) as Element[]) : el;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(targets, { opacity: 1, y: 0, clipPath: "none" });
      return;
    }
    const ctx = gsap.context(() => {
      const trigger = { trigger: el, start: "top 85%", once: true };
      if (effect === "clip") {
        gsap.from(targets, {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: 1.1,
          ease: "power3.inOut",
          delay,
          stagger: stagger ? 0.12 : 0,
          scrollTrigger: trigger,
        });
      } else {
        gsap.from(targets, {
          opacity: 0,
          y,
          duration: 0.8,
          ease: "power3.out",
          delay,
          stagger: stagger ? 0.08 : 0,
          scrollTrigger: trigger,
        });
      }
    }, el);
    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, [y, delay, stagger, effect]);

  return (
    <div ref={ref} className={cn(className)} {...rest}>
      {children}
    </div>
  );
}
