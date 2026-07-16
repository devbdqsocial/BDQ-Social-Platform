import { bodyBlocks, linkSegments, type DocSection } from "@/lib/legal-sections";

/** Renders (already token-merged) doc sections as semantic h2/p/ul/a/strong — styled by the
 *  surrounding shell (LegalPage prose utilities on public pages, a compact wrapper in admin). */
export function DocSectionsView({ sections }: { sections: DocSection[] }) {
  return (
    <>
      {sections.map((s, i) => (
        <div key={i}>
          {s.heading ? <h2>{s.heading}</h2> : null}
          {bodyBlocks(s.body).map((b, j) => {
            if (b.kind === "p") return <p key={j}>{segments(b.text)}</p>;
            const List = b.kind === "ul" ? "ul" : "ol";
            return (
              <List key={j}>
                {b.items.map((item, k) => (
                  <li key={k}>{segments(item)}</li>
                ))}
              </List>
            );
          })}
        </div>
      ))}
    </>
  );
}

function segments(text: string) {
  return linkSegments(text).map((s, i) =>
    s.href ? (
      <a key={i} href={s.href}>
        {s.text}
      </a>
    ) : s.bold ? (
      <strong key={i}>{s.text}</strong>
    ) : s.italic ? (
      <em key={i}>{s.text}</em>
    ) : (
      <span key={i}>{s.text}</span>
    ),
  );
}
