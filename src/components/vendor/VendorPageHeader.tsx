import * as React from "react";

/** Shared vendor page header: kicker + Exat title, optional description and right-aligned action
 * (wraps below the title on small screens). Left-aligned — never centered. */
export function VendorPageHeader({
  kicker,
  title,
  description,
  action,
  className,
}: {
  kicker: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex flex-wrap items-start justify-between gap-[var(--space-lg)] ${className ?? ""}`}>
      <div className="min-w-0">
        <p className="kicker opacity-60">{kicker}</p>
        <h1 className="f-exat f-h60 mt-1">{title}</h1>
        {description && (
          <p className="f-paragraph-small mt-[var(--space-sm)] max-w-[46rem] opacity-75 text-pretty">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
