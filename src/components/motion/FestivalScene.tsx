"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * FestivalScene — the hero's RIGHT-SIDE EXPERIENCE. A bold, cinematic night-market panel built in
 * pure CSS/SVG (no bitmap, no WebGL): luminous moon, hanging string lights, glowing lanterns, a
 * venue silhouette with warm stall windows, drifting fireflies and fog. High contrast so the right
 * side carries real visual weight (fixes the left-heavy composition). Decorative — aria-hidden.
 * Pointer-move drives layered parallax via --px/--py (pointer-fine only); reduced-motion = static.
 * `tone`: "night" (navy/lavender, landing) | "gold" (warm dusk, coming-soon).
 */

const BULB_COUNT = 14;
const BULBS = Array.from({ length: BULB_COUNT }, (_, i) => {
  const t = i / (BULB_COUNT - 1);
  return { x: +(t * 100).toFixed(2), y: +(7 + 16 * Math.sin(Math.PI * t)).toFixed(2), c: ["a", "b", "c"][i % 3] };
});

const LANTERNS = [
  { left: "16%", top: "44%", size: 28, rise: "13s", delay: "-2s" },
  { left: "30%", top: "62%", size: 18, rise: "16s", delay: "-6s" },
  { left: "58%", top: "50%", size: 34, rise: "15s", delay: "-1s" },
  { left: "74%", top: "66%", size: 20, rise: "18s", delay: "-9s" },
  { left: "46%", top: "72%", size: 15, rise: "12s", delay: "-4s" },
  { left: "86%", top: "46%", size: 17, rise: "17s", delay: "-3s" },
];

const MOTES = Array.from({ length: 9 }, (_, i) => ({ left: `${(i * 11 + 7) % 96}%`, top: `${(i * 23 + 12) % 84}%`, delay: `-${(i * 0.6).toFixed(1)}s` }));

const WINDOWS = [
  { left: "8%", top: "82%" }, { left: "15%", top: "86%" }, { left: "24%", top: "80%" },
  { left: "38%", top: "84%" }, { left: "52%", top: "81%" }, { left: "63%", top: "85%" },
  { left: "72%", top: "82%" }, { left: "90%", top: "84%" },
];

// Night-market skyline: a row of stall tents/peaks across the base.
const SKYLINE = "M0,40 L0,26 L6,26 L9,20 L12,26 L20,26 L20,17 L28,11 L36,17 L36,26 L46,26 L50,20 L54,26 L64,26 L64,21 L70,15 L76,21 L76,26 L88,26 L92,20 L96,26 L100,26 L100,40 Z";

export function FestivalScene({ tone = "night", className }: { tone?: "night" | "gold"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--px", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
      el.style.setProperty("--py", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
    };
    const onLeave = () => { el.style.setProperty("--px", "0"); el.style.setProperty("--py", "0"); };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, []);

  return (
    <div ref={ref} aria-hidden data-tone={tone} data-cursor="view" className={cn("fest-scene", className)}>
      <div className="fest-stars" />
      <div className="fest-moon" />

      <div className="fest-strings">
        <svg className="fest-wire" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points={BULBS.map((p) => `${p.x},${p.y}`).join(" ")} />
        </svg>
        {BULBS.map((p, i) => (
          <span key={i} className="fest-bulb" data-c={p.c} style={{ left: `${p.x}%`, top: `${p.y}%` }} />
        ))}
      </div>

      <div className="fest-silhouette">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d={SKYLINE} /></svg>
        {WINDOWS.map((w, i) => (<span key={i} className="fest-win" style={{ left: w.left, top: w.top }} />))}
      </div>

      <div className="fest-lanterns">
        {LANTERNS.map((l, i) => (
          <span key={i} className="fest-lantern" style={{ left: l.left, top: l.top, width: l.size, height: l.size, animationDelay: l.delay, "--rise": l.rise } as React.CSSProperties} />
        ))}
      </div>

      <div className="fest-motes">
        {MOTES.map((m, i) => (<span key={i} className="fest-mote" style={{ left: m.left, top: m.top, animationDelay: m.delay }} />))}
      </div>

      <div className="fest-fog" />
    </div>
  );
}
