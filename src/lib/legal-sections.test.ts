import { describe, expect, it } from "vitest";
import { bodyBlocks, linkSegments, pdfParagraphs } from "./legal-sections";

describe("bodyBlocks", () => {
  it("splits paragraphs on blank lines and joins wrapped lines", () => {
    expect(bodyBlocks("One line\nsame para.\n\nSecond para.")).toEqual([
      { kind: "p", text: "One line same para." },
      { kind: "p", text: "Second para." },
    ]);
  });

  it("groups '- ' lines into ul blocks", () => {
    expect(bodyBlocks("Intro:\n\n- a\n- b")).toEqual([
      { kind: "p", text: "Intro:" },
      { kind: "ul", items: ["a", "b"] },
    ]);
  });

  it("groups '1. ' lines into ol blocks", () => {
    expect(bodyBlocks("1. first\n2. second\n10. tenth")).toEqual([{ kind: "ol", items: ["first", "second", "tenth"] }]);
  });

  it("flushes between ul and ol runs", () => {
    expect(bodyBlocks("- a\n1. b\n- c")).toEqual([
      { kind: "ul", items: ["a"] },
      { kind: "ol", items: ["b"] },
      { kind: "ul", items: ["c"] },
    ]);
  });
});

describe("linkSegments", () => {
  it("parses links, bold, and plain runs", () => {
    expect(linkSegments("See [Terms](/terms) — **final**.")).toEqual([
      { text: "See " },
      { text: "Terms", href: "/terms" },
      { text: " — " },
      { text: "final", bold: true },
      { text: "." },
    ]);
  });

  it("parses *italic* without eating **bold** pairs", () => {
    expect(linkSegments("**bold** and *italic* text")).toEqual([
      { text: "bold", bold: true },
      { text: " and " },
      { text: "italic", italic: true },
      { text: " text" },
    ]);
  });

  it("supports mailto/tel/https hrefs", () => {
    expect(linkSegments("[e](mailto:a@b.c) [t](tel:+911234) [w](https://x.y)")).toEqual([
      { text: "e", href: "mailto:a@b.c" },
      { text: " " },
      { text: "t", href: "tel:+911234" },
      { text: " " },
      { text: "w", href: "https://x.y" },
    ]);
  });
});

describe("pdfParagraphs", () => {
  it("numbers ol items, bullets ul items, strips link/emphasis syntax", () => {
    expect(pdfParagraphs("See [Terms](/terms).\n\n- **a**\n\n1. *b*\n2. c")).toEqual(["See Terms.", "• a", "1. b", "2. c"]);
  });
});
