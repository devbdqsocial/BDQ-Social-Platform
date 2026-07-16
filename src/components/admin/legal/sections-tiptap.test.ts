import { describe, expect, it } from "vitest";
import type { DocSection } from "@/lib/legal-sections";
import { sectionsToTiptapDoc, tiptapDocToSections } from "./sections-tiptap";

const roundTrip = (sections: DocSection[]) => tiptapDocToSections(sectionsToTiptapDoc(sections));

describe("sections ⇄ tiptap round-trip", () => {
  it("is the identity on seeded-style content", () => {
    const sections: DocSection[] = [
      { heading: "", body: "Intro paragraph with a {{legal.brand}} token.\n\nSecond intro paragraph." },
      {
        heading: "1. Tickets & entry",
        body: "- A ticket is a **limited** licence.\n- See the [Refund Policy](/refunds) and [mail](mailto:a@b.c) and [call](tel:+911234) and [site](https://x.y).",
      },
      { heading: "2. Numbered", body: "Some *italic* lead-in.\n\n1. first\n2. second" },
    ];
    expect(roundTrip(sections)).toEqual(sections);
  });

  it("returns [] for an empty document", () => {
    expect(roundTrip([])).toEqual([]);
    expect(tiptapDocToSections({ type: "doc", content: [{ type: "paragraph" }] })).toEqual([]);
  });

  it("keeps a heading-only section (invalid, blocks save) and drops fully empty ones", () => {
    expect(tiptapDocToSections({ type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Only heading" }] }] })).toEqual([
      { heading: "Only heading", body: "" },
    ]);
  });

  it("collapses bold+italic to bold and drops marks inside links (deterministic losses)", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "both", marks: [{ type: "bold" }, { type: "italic" }] },
            { type: "text", text: " and " },
            { type: "text", text: "styled link", marks: [{ type: "link", attrs: { href: "/terms" } }, { type: "bold" }] },
          ],
        },
      ],
    };
    expect(tiptapDocToSections(doc)).toEqual([{ heading: "", body: "**both** and [styled link](/terms)" }]);
  });

  it("merges fragmented text nodes with identical marks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bo", marks: [{ type: "bold" }] },
            { type: "text", text: "ld", marks: [{ type: "bold" }] },
            { type: "text", text: " plain" },
          ],
        },
      ],
    };
    expect(tiptapDocToSections(doc)).toEqual([{ heading: "", body: "**bold** plain" }]);
  });

  it("flattens nested lists", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "parent" }] },
                { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "child" }] }] }] },
              ],
            },
          ],
        },
      ],
    };
    expect(tiptapDocToSections(doc)).toEqual([{ heading: "", body: "- parent\n- child" }]);
  });
});
