// Central GSAP entry: registers ScrollTrigger once and re-exports for client motion components.
// NOTE: only SSR-safe modules are imported at top level here. The bonus plugins (SplitText,
// MorphSVGPlugin, etc.) touch `document` at module-load and would crash server rendering of any
// client component that imports this file — so they're added lazily inside their own client
// components if/when needed, never here.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Module is cached, so this registers exactly once. registerPlugin is idempotent regardless.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false, force3D: true });

  // Reduced-motion gate (design-system §2.3, build-plan R2.3): the CSS block in globals.css
  // covers CSS animations only — GSAP tweens must be gated in JS. Collapsing every timeline
  // to near-zero duration keeps end-states correct (content visible, pins released) without
  // per-component branching. Live preference changes apply on next navigation.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.globalTimeline.timeScale(1000);
    gsap.defaults({ duration: 0.001 });
  }
}

/** True when the user asked for reduced motion — for components that branch behavior. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger };
