import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Labelled form field: a label wrapping the control (implicit association → accessible without
 * wiring ids), plus an optional helper hint. Pair with Input/Textarea/Select.
 *
 * `required` only renders the visual asterisk — it does not propagate `required`/`aria-required`
 * onto `children`. Set the native `required` attribute on the inner control too; the two are
 * independent by design (Field is a pure label wrapper, it doesn't inspect/clone children).
 */
function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  /** Validation message — when set, replaces the hint and renders in the destructive colour. */
  error?: string | null;
  /** Shows a red asterisk after the label. Purely visual — pair with `required` on the control. */
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}
      </span>
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
