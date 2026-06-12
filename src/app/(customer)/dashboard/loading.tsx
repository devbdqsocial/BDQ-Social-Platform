export default function DashboardLoading() {
  return (
    <section className="paint py-[var(--space-5xl)]" aria-busy="true" aria-label="Loading your tickets">
      <div className="wrapper max-w-[62rem]">
        <div className="h-[1em] w-[8ch] animate-pulse rounded bg-current opacity-10" />
        <div className="mt-[var(--space-sm)] h-[3em] w-[6ch] animate-pulse rounded bg-current opacity-10" />
        <div className="mt-[var(--space-3xl)] grid gap-[var(--space-lg)]">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-[var(--radius-lg)] bg-current opacity-10" />
          ))}
        </div>
      </div>
    </section>
  );
}
