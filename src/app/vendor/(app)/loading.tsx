/** Vendor-zone loading skeleton — mirrors the page shell (header + stacked cards), left-aligned. */
export default function Loading() {
  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-2xl)]" aria-busy="true" aria-label="Loading">
      <div>
        <div className="skeleton h-4 w-28" />
        <div className="skeleton mt-[var(--space-md)] h-12 w-2/3 max-w-md" />
        <div className="skeleton mt-[var(--space-md)] h-4 w-1/2 max-w-sm" />
      </div>
      <div className="space-y-[var(--space-md)]">
        <div className="skeleton h-36 rounded-[var(--radius-lg)]" />
        <div className="skeleton h-36 rounded-[var(--radius-lg)]" />
        <div className="skeleton h-16 rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}
