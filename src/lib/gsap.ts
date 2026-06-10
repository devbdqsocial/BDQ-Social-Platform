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
}

export { gsap, ScrollTrigger };
