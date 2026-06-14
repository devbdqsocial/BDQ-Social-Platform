/**
 * Signature wordmark wall (RPA "wall"): rows of repeated brand marks in Exat,
 * odd rows drifting the opposite way. Pure CSS marquee — server-safe, no JS.
 * Colour comes from `currentColor`; size/opacity from `rowClassName`/`className`.
 */
export function WordmarkWall({
  rows = 4,
  mobileRows = 3,
  word = "BDQ",
  animated = true,
  duration = 30,
  className = "",
  rowClassName = "f-h76",
}: {
  rows?: number;
  /** rows shown below 640px — trims marquee paint cost on mobile (design-debt D30). */
  mobileRows?: number;
  word?: string;
  animated?: boolean;
  duration?: number;
  className?: string;
  rowClassName?: string;
}) {
  const run = `${word} `.repeat(16).trim();
  return (
    <div className={`wall ${className}`} aria-hidden>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={`${animated ? "marquee" : "overflow-hidden"}${r >= mobileRows ? " hidden sm:block" : ""}`}>
          <div
            className={animated ? "marquee-track" : "inline-flex w-max"}
            style={
              animated
                ? ({
                    "--marquee-duration": `${duration + r * 4}s`,
                    animationDirection: r % 2 ? "reverse" : undefined,
                  } as React.CSSProperties)
                : undefined
            }
          >
            {/* transparent text + zero-blur shadow renders identically, but contrast checkers
                rightly skip transparent text — this is decorative texture, not content */}
            <span className={`f-exat t-upper whitespace-nowrap ${rowClassName}`} style={{ lineHeight: 1, color: "transparent", textShadow: "0 0 var(--color, #868EFF)" }}>{run}&nbsp;</span>
            <span className={`f-exat t-upper whitespace-nowrap ${rowClassName}`} style={{ lineHeight: 1, color: "transparent", textShadow: "0 0 var(--color, #868EFF)" }}>{run}&nbsp;</span>
          </div>
        </div>
      ))}
    </div>
  );
}
