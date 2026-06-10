"use client";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { WordmarkWall } from "./WordmarkWall";

const SERVICES: { n: string; title: string; body: string; gama: string }[] = [
  { n: "01", title: "Shopping", body: "80+ handpicked indie brands — fusion wear, jewellery, home, and thoughtful Diwali gifting you won't find at the mall.", gama: "gama-1 bg-1" },
  { n: "02", title: "Food", body: "A proper food court: the city's best cafés, bakers, and inventive street food. Clean, fresh, genuinely good.", gama: "gama-3 bg-1" },
  { n: "03", title: "Music", body: "Easy acoustic sets at sundown that build into a warm, high-energy night.", gama: "gama-2 surface-2" },
  { n: "04", title: "Photos", body: "Lounges, neon, and little surprises — bring friends and stay a while.", gama: "gama-1 bg-2" },
];

// servicios--anima: pinned horizontal scroll on desktop; degrades to a stacked vertical
// stack of full-height colour slides on mobile / reduced-motion (native scroll).
export function PinnedServices() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const tr = track.current;
    if (!el || !tr) return;
    if (window.matchMedia("(max-width: 950px), (prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const total = SERVICES.length;
      gsap.to(tr, {
        xPercent: (-100 * (total - 1)) / total,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          pin: true,
          scrub: 1,
          snap: { snapTo: 1 / (total - 1), duration: 0.4, ease: "power1.inOut" },
          end: () => "+=" + window.innerWidth * (total - 1),
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="pinned-services relative overflow-hidden">
      <div ref={track} className="pinned-track">
        {SERVICES.map((s) => (
          <div key={s.title} className={`pinned-slide ${s.gama} paint relative overflow-hidden`}>
            <WordmarkWall
              rows={1}
              animated={false}
              rowClassName="f-h235"
              className="pointer-events-none absolute inset-x-0 -bottom-[0.18em] opacity-[0.06]"
            />
            <div className="wrapper relative grid items-center gap-[var(--space-3xl)] lg:grid-cols-[1.3fr_1fr]">
              <div>
                <span className="kicker opacity-60">{s.n} / 04</span>
                <h2 className="f-exat mt-[var(--space-sm)]" style={{ fontSize: "var(--h235)", lineHeight: 0.95 }}>
                  {s.title}
                </h2>
                <p className="f-paragraph mt-[var(--space-lg)] max-w-[40ch] opacity-80">{s.body}</p>
              </div>
              {/* colour-block mask with the slide number — image slot until real photography lands */}
              <div className="svg svg--form6 hidden w-[78%] justify-self-end lg:block">
                <div className="svg__bg" />
                <span
                  className="svg__text f-exat grid place-items-center"
                  style={{ fontSize: "var(--h133)", color: "var(--bgcolor)" }}
                >
                  {s.n}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
