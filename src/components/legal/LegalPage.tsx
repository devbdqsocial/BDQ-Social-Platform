/** Shared shell for policy/legal pages, RPA `mod-text--content` style: big Exat title + centred
 *  Inter body. Descendant utilities style the semantic HTML each page provides (no typography plugin). */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <section className="paint py-[var(--space-5xl)]">
      <div className="wrapper">
        <span className="f-paragraph-small f-bold t-upper opacity-70" style={{ letterSpacing: "0.16em" }}>Legal</span>
        <h1 className="f-exat mt-[var(--space-sm)] f-h76">{title}</h1>
        <p className="f-paragraph-small mt-[var(--space-md)] opacity-75">Last updated: {updated}</p>
        <div
          className="mx-auto mt-[var(--space-3xl)] max-w-[var(--w-prose)] [&_a]:underline [&_h2]:mb-[var(--space-md)] [&_h2]:mt-[var(--space-2xl)] [&_h2]:[font-family:var(--f-exat)] [&_h2]:[font-size:var(--h42)] [&_h2]:[line-height:1.1] [&_li]:mb-[var(--space-xs)] [&_li]:opacity-80 [&_p]:mb-[var(--space-lg)] [&_p]:opacity-80 [&_p]:[font-size:var(--paragraph)] [&_p]:[line-height:1.5] [&_strong]:font-bold [&_ul]:mb-[var(--space-lg)] [&_ul]:list-disc [&_ul]:pl-[var(--space-lg)]"
        >
          {children}
        </div>
      </div>
    </section>
  );
}
