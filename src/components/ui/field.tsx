import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Labelled form field: a label wrapping the control (implicit association → accessible without
 * wiring ids), plus an optional helper hint. Pair with Input/Textarea/Select.
 */
function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  /** Validation message — when set, replaces the hint and renders in the destructive colour. */
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

export { Field };
