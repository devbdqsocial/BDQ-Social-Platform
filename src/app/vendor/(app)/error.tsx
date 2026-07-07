"use client";

export default function VendorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-lg)]">
      <p className="kicker opacity-60">Something broke</p>
      <h1 className="f-exat f-h60">We hit a snag</h1>
      <p className="f-paragraph-small max-w-[46rem] opacity-75 text-pretty">
        That didn&apos;t load — it&apos;s on us, not you. Try again; if it keeps happening, call the team and we&apos;ll sort it.
      </p>
      <button type="button" className="bdq-btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
