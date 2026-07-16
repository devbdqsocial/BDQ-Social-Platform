/**
 * Shared (client+server safe) primitives for LegalDocument sections. A document's `sections` JSON
 * is DocSection[]; each body uses a tiny plain-text convention: blank line = new paragraph,
 * "- " prefix = bullet item, "1. " prefix = numbered item, [label](/path) = inline link,
 * **bold** / *italic* = emphasis, {{token}} = merge placeholder (resolved server-side in
 * src/server/legal/tokens.ts).
 */

export type DocSection = { heading: string; body: string };

export type DocBlock = { kind: "p"; text: string } | { kind: "ul" | "ol"; items: string[] };

/** Parse a section body into paragraph/list blocks. */
export function bodyBlocks(body: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  let para: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  const pushItem = (kind: "ul" | "ol", item: string) => {
    flushPara();
    if (!list || list.kind !== kind) {
      flushList();
      list = { kind, items: [] };
    }
    list.items.push(item);
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (!line) {
      flushPara();
      flushList();
    } else if (line.startsWith("- ")) {
      pushItem("ul", line.slice(2).trim());
    } else if (ol) {
      pushItem("ol", ol[1].trim());
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

export type TextSegment = { text: string; href?: string; bold?: boolean; italic?: boolean };

const LINK_RE = /\[([^\]]+)\]\((\/[^)\s]*|https?:\/\/[^)\s]+|mailto:[^)\s]+|tel:[^)\s]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const ITALIC_RE = /\*([^*]+)\*/g;

function markSegments(re: RegExp, mark: "bold" | "italic", text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index) });
    segments.push({ text: m[1], [mark]: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

// Bold first so `**x**` pairs are consumed before the single-`*` italic pass sees them.
function inlineSegments(text: string): TextSegment[] {
  return markSegments(BOLD_RE, "bold", text).flatMap((s) => (s.bold ? [s] : markSegments(ITALIC_RE, "italic", s.text)));
}

/** Split text into segments for rendering [label](href) links, **bold** and *italic* runs. */
export function linkSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    if (m.index > last) segments.push(...inlineSegments(text.slice(last, m.index)));
    segments.push({ text: m[1], href: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push(...inlineSegments(text.slice(last)));
  return segments;
}

/** Flatten a section body to plain paragraphs for the contract PDF: list items become "• …" /
 *  "1. …" lines, link syntax collapses to its label. */
export function pdfParagraphs(body: string): string[] {
  const plain = (text: string) =>
    linkSegments(text)
      .map((s) => s.text)
      .join("");
  const out: string[] = [];
  for (const block of bodyBlocks(body)) {
    if (block.kind === "p") out.push(plain(block.text));
    else block.items.forEach((item, i) => out.push(block.kind === "ol" ? `${i + 1}. ${plain(item)}` : `• ${plain(item)}`));
  }
  return out;
}
