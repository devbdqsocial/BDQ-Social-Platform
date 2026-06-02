import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Design tokens" };

const semantic = [
  ["background", "bg-background text-foreground border border-border"],
  ["card", "bg-card text-card-foreground"],
  ["primary (clay)", "bg-primary text-primary-foreground"],
  ["secondary (pine)", "bg-secondary text-secondary-foreground"],
  ["accent (gold)", "bg-accent text-accent-foreground"],
  ["muted", "bg-muted text-muted-foreground"],
  ["destructive", "bg-destructive text-destructive-foreground"],
  ["success", "bg-[var(--success)] text-white"],
  ["warning", "bg-[var(--warning)] text-black"],
  ["info", "bg-[var(--info)] text-white"],
];

const stalls = [
  ["available", "bg-stall-available"],
  ["held", "bg-stall-held"],
  ["pending", "bg-stall-pending"],
  ["booked", "bg-stall-booked"],
  ["blocked", "bg-stall-blocked"],
];

export default function TokensPage() {
  return (
    <main className="mx-auto max-w-[1000px] px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Design tokens</h1>
        <ThemeToggle />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Semantic</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {semantic.map(([name, cls]) => (
          <div key={name} className={`rounded-lg p-5 text-sm ${cls}`}>{name}</div>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Map stall status</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stalls.map(([name, cls]) => (
          <div key={name} className={`rounded-lg p-5 text-center text-sm text-white ${cls}`}>{name}</div>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Typography</h2>
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="font-display text-4xl font-semibold">Fraunces display</p>
        <p className="mt-2 text-base">Inter body — the quick brown fox jumps over the lazy dog.</p>
      </div>
    </main>
  );
}
