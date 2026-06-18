import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbLd } from "@/lib/seo/jsonld";

/**
 * Public breadcrumb trail — renders the visible RPA-styled nav AND the matching BreadcrumbList
 * JSON-LD from one source (Google wants the visible trail to mirror the schema). Used on
 * article-style pages (content hubs); cinematic hero detail pages emit breadcrumbLd directly
 * to avoid intruding on the full-bleed hero.
 */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="wrapper pt-[var(--space-xl)]">
      <JsonLd data={breadcrumbLd(items)} />
      <ol className="kicker flex flex-wrap items-center gap-[var(--space-sm)] opacity-70">
        {items.map((it, i) => (
          <li key={it.path} className="flex items-center gap-[var(--space-sm)]">
            {i < items.length - 1 ? (
              <Link href={it.path} data-cursor className="link-underline">{it.name}</Link>
            ) : (
              <span aria-current="page">{it.name}</span>
            )}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
