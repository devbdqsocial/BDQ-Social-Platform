import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Labelled form field: a label wrapping the control (implicit association → accessible without
 * wiring ids), plus an optional helper hint. Pair with Input/Textarea/Select.
 */
function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export { Field };
