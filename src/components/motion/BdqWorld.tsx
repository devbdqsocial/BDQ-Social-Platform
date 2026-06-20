import { cn } from "@/lib/utils";

// "Living BDQ world": CSS/SVG hero atmosphere — a breathing glow plus drifting lantern/firefly
// motes. Pure CSS (styled in globals.css `.bdq-world`); no bitmap, no JS, no network cost.
// Decorative only — aria-hidden, and fully static under prefers-reduced-motion.
// `tint` overrides --world-tint (e.g. "var(--gold-soft)"); defaults to currentColor.
export function BdqWorld({ className, tint }: { className?: string; tint?: string }) {
  return (
    <div
      aria-hidden
      className={cn("bdq-world", className)}
      style={tint ? ({ "--world-tint": tint } as React.CSSProperties) : undefined}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="bdq-world__mote" />
      ))}
    </div>
  );
}
