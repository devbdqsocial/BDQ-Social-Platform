import * as React from "react";
import { cn } from "@/lib/utils";

/** Friendly placeholder for empty lists: icon + title + line + optional action. */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="mb-1 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      )}
      <p className="font-display text-lg font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export { EmptyState };
