import type { JSONContent } from "@tiptap/core";
import { bodyBlocks, linkSegments, type DocSection } from "@/lib/legal-sections";

/**
 * Lossless round-trip between the persisted DocSection[] mini-format and a Tiptap document, so the
 * Word-like editor never changes what renderers/PDF/snapshots consume. One section heading = one
 * h2 node; content before the first h2 = the unheaded intro section. Deterministic losses (the
 * mini-format has no representation): bold+italic → bold, marks inside links dropped, nested lists
 * flattened. Literal `*` / `[x](y)` typed by the admin becomes formatting on next load (no
 * escaping — the persisted format must stay renderer-compatible).
 */

function inlineNodes(text: string): JSONContent[] {
  return linkSegments(text)
    .filter((s) => s.text.length > 0)
    .map((s) => {
      const marks: JSONContent["marks"] = [];
      if (s.href) marks.push({ type: "link", attrs: { href: s.href } });
      else if (s.bold) marks.push({ type: "bold" });
      else if (s.italic) marks.push({ type: "italic" });
      return { type: "text", text: s.text, ...(marks.length ? { marks } : {}) };
    });
}

function listNode(kind: "ul" | "ol", items: string[]): JSONContent {
  return {
    type: kind === "ul" ? "bulletList" : "orderedList",
    ...(kind === "ol" ? { attrs: { start: 1 } } : {}),
    content: items.map((item) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: inlineNodes(item) }],
    })),
  };
}

export function sectionsToTiptapDoc(sections: DocSection[]): JSONContent {
  const content: JSONContent[] = [];
  for (const s of sections) {
    if (s.heading) content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: s.heading }] });
    for (const b of bodyBlocks(s.body)) {
      if (b.kind === "p") content.push({ type: "paragraph", content: inlineNodes(b.text) });
      else content.push(listNode(b.kind, b.items));
    }
  }
  if (!content.length) content.push({ type: "paragraph" });
  return { type: "doc", content };
}

// ── tiptap → sections ────────────────────────────────────────────────────────────

type Run = { text: string; href?: string; bold?: boolean; italic?: boolean };

function runsOf(node: JSONContent): Run[] {
  const runs: Run[] = [];
  for (const child of node.content ?? []) {
    if (child.type === "hardBreak") {
      runs.push({ text: " " });
      continue;
    }
    if (child.type !== "text" || !child.text) continue;
    const marks = child.marks ?? [];
    const href = (marks.find((m) => m.type === "link")?.attrs as { href?: string } | undefined)?.href;
    runs.push({
      text: child.text,
      href,
      bold: !href && marks.some((m) => m.type === "bold"),
      italic: !href && marks.some((m) => m.type === "italic"),
    });
  }
  // Merge adjacent runs with identical formatting (typing produces fragmented text nodes).
  const merged: Run[] = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && last.href === r.href && !!last.bold === !!r.bold && !!last.italic === !!r.italic) last.text += r.text;
    else merged.push({ ...r });
  }
  return merged;
}

function runToText(r: Run): string {
  if (r.href) return `[${r.text}](${r.href})`;
  if (r.bold) return `**${r.text}**`; // bold+italic collapses to bold (format has no combined mark)
  if (r.italic) return `*${r.text}*`;
  return r.text;
}

function paragraphText(node: JSONContent): string {
  return runsOf(node).map(runToText).join("").trim();
}

/** Flatten a (possibly nested) list into item strings. */
function listItemTexts(list: JSONContent): string[] {
  const items: string[] = [];
  for (const li of list.content ?? []) {
    const parts: string[] = [];
    const nested: string[] = [];
    for (const child of li.content ?? []) {
      if (child.type === "paragraph") {
        const t = paragraphText(child);
        if (t) parts.push(t);
      } else if (child.type === "bulletList" || child.type === "orderedList") {
        nested.push(...listItemTexts(child));
      }
    }
    if (parts.length) items.push(parts.join(" "));
    items.push(...nested);
  }
  return items;
}

function headingText(node: JSONContent): string {
  return (node.content ?? [])
    .map((c) => (c.type === "text" ? (c.text ?? "") : ""))
    .join("")
    .trim();
}

export function tiptapDocToSections(doc: JSONContent): DocSection[] {
  const sections: DocSection[] = [];
  let heading = "";
  let blocks: string[] = [];
  const flush = () => {
    const body = blocks.join("\n\n").trim();
    if (heading || body) sections.push({ heading, body });
    blocks = [];
  };
  for (const node of doc.content ?? []) {
    if (node.type === "heading") {
      flush();
      heading = headingText(node);
    } else if (node.type === "paragraph") {
      const t = paragraphText(node);
      if (t) blocks.push(t);
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      const items = listItemTexts(node);
      if (items.length) {
        blocks.push(items.map((it, i) => (node.type === "bulletList" ? `- ${it}` : `${i + 1}. ${it}`)).join("\n"));
      }
    }
  }
  flush();
  return sections;
}
