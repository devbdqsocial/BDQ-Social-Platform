/**
 * Single source for GSAP motion values, derived from the reference site's animation code.
 * CSS twin: `--ease-bounce` in globals.css (GSAP can't read CSS vars for eases).
 */
export const EASE = {
  out: "power2.out",
  inOut: "power2.inOut",
  strong: "power3.out",
  strongInOut: "power3.inOut",
  max: "power4.out",
  back: "back.out(0.75)",
} as const;

export const DUR = {
  micro: 0.33,
  std: 0.5,
  medium: 0.75,
  slow: 1.2,
} as const;

export const STAGGER = {
  chars: 0.075,
  lines: 0.1,
  items: 0.06,
} as const;

export const ST = {
  start: "top 85%",
  once: "play none none none",
} as const;
