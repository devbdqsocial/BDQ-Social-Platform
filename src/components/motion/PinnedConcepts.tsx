"use client";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const STEPS: { word: string; body: string; band: string }[] = [
  { word: "Arrive", body: "Gates open in the late afternoon. Golden hour, easy energy, the night ahead of you.", band: "bdq-night" },
  { word: "Wander", body: "Handpicked brands, a proper food court, and corners made for photos.", band: "bdq-fire" },
  { word: "Linger", body: "Acoustic sets at sundown build into a warm, high-energy night. Stay a while.", band: "bdq-grove" },
];

// conceptos: a pinned section that crossfades through steps (and recolours) as you scroll.
// Desktop only (ScrollTrigger pin); mobile/reduced-motion = stacked colour panels, native scroll.
export function PinnedConcepts() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const st = stage.current;
    if (!el || !st) return;
    if (window.matchMedia("(max-width: 950px), (prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>(".concept-panel", st);
      gsap.set(panels.slice(1), { opacity: 0 });
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => "+=" + window.innerHeight * panels.length,
          pin: st,
          scrub: 1,
          snap: 1 / (panels.length - 1),
        },
      });
      // Sequential fade (out, then in) — simultaneous crossfade leaves both texts legible
      // mid-scrub and they collide.
      panels.forEach((p, i) => {
        if (i === 0) return;
        tl.to(panels[i - 1], { opacity: 0, duration: 0.45 }).to(p, { opacity: 1, duration: 0.45 }, ">");
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="concept-stage-root">
      <div ref={stage} className="concept-stage">
        {STEPS.map((s) => (
          <div key={s.word} className={`concept-panel ${s.band} paint`}>
            <div className="wrapper">
              <h2 className="f-exat f-h235">{s.word}</h2>
              <p className="f-paragraph mx-auto mt-[var(--space-2xl)] max-w-[34ch] opacity-80">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
