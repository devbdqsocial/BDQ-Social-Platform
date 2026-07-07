import * as React from "react";

/**
 * BDQ form primitives for the vendor portal — bordered inputs + solid buttons
 * (owner-approved Refined-BDQ override of design.md §3.2's underline style;
 * classes live in globals.css under `.bdq .bdq-input` / `.bdq .bdq-btn`).
 */

const FIELD = "f-paragraph bdq-input";

export function BdqField({
  label,
  error,
  children,
}: {
  label: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-[var(--space-sm)]">
      <span className="f-paragraph-small block font-bold">{label}</span>
      {children}
      {error && (
        <span className="f-paragraph-small block" style={{ color: "var(--red)" }}>
          {error}
        </span>
      )}
    </label>
  );
}

export function BdqInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD} ${className ?? ""}`} />;
}

export function BdqTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${FIELD} resize-none ${className ?? ""}`} />;
}

export function BdqSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD} ${className ?? ""}`} />;
}

/** Solid submit button; `accent={false}` renders the ghost (outline) variant for secondary actions. */
export function BdqSubmit({
  children,
  accent = true,
  lg = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { accent?: boolean; lg?: boolean }) {
  return (
    <button type="submit" {...props} className={`bdq-btn${accent ? "" : " bdq-btn--ghost"}${lg ? " px-[var(--space-2xl)]" : ""}`}>
      {children}
    </button>
  );
}
