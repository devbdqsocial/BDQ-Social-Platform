"use client";

import { cn } from "@/lib/utils";

// Seamless infinite marquee. Renders the content twice; the CSS `.marquee-track` translates
// -50% so the loop is seamless. Pauses on hover; stops under reduced-motion (see globals.css).
export function Marquee({
  children,
  speed = 40,
  className,
}: {
  children: React.ReactNode;
  /** seconds for one full loop; larger = slower */
  speed?: number;
  className?: string;
}) {
  return (
    <div className={cn("marquee", className)}>
      <div
        className="marquee-track"
        style={{ ["--marquee-duration" as string]: `${speed}s` }}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
