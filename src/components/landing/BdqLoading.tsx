/**
 * BdqLoading (R6.6) — a premium, on-brand loading skeleton for the customer routes, so navigation
 * never flashes blank. Tints to the surface (`.paint` cream); shimmer is reduced-motion safe. Used by
 * each route's loading.tsx. Mirrors the common page shape (header + content).
 */
function blocks(n: number, cls: string) {
  return Array.from({ length: n }).map((_, i) => <div key={i} className={`skeleton ${cls}`} />);
}

export function BdqLoading({ variant = "grid", count = 6 }: { variant?: "grid" | "wide" | "list" | "detail" | "map"; count?: number }) {
  return (
    <section className="paint py-[var(--space-4xl)]" aria-busy="true" aria-label="Loading">
      <div className="wrapper max-w-[62rem]">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton mt-[var(--space-md)] h-12 w-2/3 max-w-md" />
        <div className="skeleton mt-[var(--space-md)] h-4 w-1/2 max-w-sm" />

        <div className="mt-[var(--space-2xl)]">
          {variant === "grid" && <div className="grid gap-[var(--space-lg)] sm:grid-cols-2 lg:grid-cols-3">{blocks(count, "h-48 rounded-[var(--radius-lg)]")}</div>}
          {variant === "wide" && <div className="grid gap-[var(--space-lg)]">{blocks(count, "h-32 rounded-[var(--radius-lg)]")}</div>}
          {variant === "list" && <div className="space-y-[var(--space-md)]">{blocks(count, "h-16 rounded-[var(--radius-lg)]")}</div>}
          {variant === "detail" && (
            <div className="space-y-[var(--space-lg)]">
              <div className="skeleton h-72 w-full rounded-[var(--radius-lg)]" />
              <div className="skeleton h-40 w-full rounded-[var(--radius-lg)]" />
            </div>
          )}
          {variant === "map" && <div className="skeleton h-[62vh] w-full rounded-[var(--radius-lg)]" />}
        </div>
      </div>
    </section>
  );
}
