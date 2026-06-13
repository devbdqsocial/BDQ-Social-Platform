/**
 * RpaPageHeader — the one header stack every customer/vendor (RPA-layer) page opens with
 * (design-system §3.5, design-debt D16). Replaces copy-pasted kicker→title→lede stacks.
 */
export function RpaPageHeader({
  kicker,
  title,
  lede,
  size = "portal",
}: {
  kicker?: string;
  title: string;
  lede?: string;
  /** portal page (f-h76) vs a landing-section heading (f-h133). */
  size?: "portal" | "section";
}) {
  return (
    <header>
      {kicker && <span className="kicker block opacity-70">{kicker}</span>}
      <h1 className={`f-exat ${size === "section" ? "f-h133" : "f-h76"} ${kicker ? "mt-[var(--space-sm)]" : ""}`}>
        {title}
      </h1>
      {lede && <p className="f-paragraph mt-[var(--space-md)] max-w-[52ch] opacity-70">{lede}</p>}
    </header>
  );
}

/**
 * RpaEmpty — the dashed-border empty state (design-system §3.9): headline → reassurance → one
 * action. Copy pattern: state + reassurance + action.
 */
export function RpaEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-[var(--space-2xl)] text-center" style={{ border: "1px dashed var(--color)" }}>
      <p className="f-exat f-h42">{title}</p>
      {body && <p className="f-paragraph-small mt-[var(--space-sm)] opacity-70">{body}</p>}
      {action && <div className="mt-[var(--space-lg)] flex justify-center">{action}</div>}
    </div>
  );
}
