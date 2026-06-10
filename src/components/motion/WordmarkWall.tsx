/**
 * Signature wordmark wall (RPA "wall"): rows of repeated brand marks in Exat,
 * odd rows drifting the opposite way. Pure CSS marquee — server-safe, no JS.
 * Colour comes from `currentColor`; size/opacity from `rowClassName`/`className`.
 */
export function WordmarkWall({
  rows = 4,
  word = "BDQ",
  animated = true,
  duration = 30,
  className = "",
  rowClassName = "f-h76",
}: {
  rows?: number;
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
        <div key={r} className={animated ? "marquee" : "overflow-hidden"}>
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
            <span className={`f-exat t-upper whitespace-nowrap ${rowClassName}`} style={{ lineHeight: 1 }}>{run}&nbsp;</span>
            <span className={`f-exat t-upper whitespace-nowrap ${rowClassName}`} style={{ lineHeight: 1 }}>{run}&nbsp;</span>
          </div>
        </div>
      ))}
    </div>
  );
}
