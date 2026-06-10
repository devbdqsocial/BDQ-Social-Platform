"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

// Magnetic hover: the wrapped element drifts toward the pointer and springs back on leave.
// No-op under reduced-motion. Wrap a button/link for the RPA "Let's talk" feel.
export function Magnetic({
  children,
  className,
  strength = 0.4,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    gsap.to(el, {
      x: (e.clientX - (r.left + r.width / 2)) * strength,
      y: (e.clientY - (r.top + r.height / 2)) * strength,
      duration: 0.4,
      ease: "power3.out",
    });
  };
  const onLeave = () => {
    if (!ref.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  };

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("inline-block", className)}
    >
      {children}
    </span>
  );
}
