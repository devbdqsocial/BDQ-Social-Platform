import * as React from "react";

/**
 * RPA form primitives for the vendor portal (design-system §3.2): underline inputs on the
 * `.rpa` cream surface, em-scaled type, lavender focus. Shared by the onboarding step forms.
 */

const UNDERLINE = "f-paragraph w-full bg-transparent pb-[var(--space-sm)] outline-none placeholder:opacity-45 disabled:opacity-50";
const UNDERLINE_STYLE: React.CSSProperties = {
  borderBottom: "1px solid color-mix(in srgb, currentColor 35%, transparent)",
  color: "var(--color)",
};

export function RpaField({
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

export function RpaInput({ className, style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${UNDERLINE} ${className ?? ""}`} style={{ ...UNDERLINE_STYLE, ...style }} />;
}

export function RpaTextarea({ className, style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${UNDERLINE} resize-none ${className ?? ""}`} style={{ ...UNDERLINE_STYLE, ...style }} />;
}

export function RpaSelect({ className, style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${UNDERLINE} ${className ?? ""}`} style={{ ...UNDERLINE_STYLE, ...style }} />;
}

/** Angled RPA submit button (`.btn`). Renders the required `.btn__text` span; `lg` for long labels. */
export function RpaSubmit({
  children,
  accent = true,
  lg = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { accent?: boolean; lg?: boolean }) {
  return (
    <button type="submit" data-cursor {...props} className={`btn${lg ? " btn--lg" : ""}${accent ? " btn--accent" : ""}`}>
      <span className="btn__text">{children}</span>
    </button>
  );
}
