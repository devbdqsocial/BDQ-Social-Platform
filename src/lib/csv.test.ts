import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes a header + rows", () => {
    const csv = toCsv([{ a: 1, b: "x" }], [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
    ]);
    expect(csv).toBe("A,B\r\n1,x");
  });

  it("escapes quotes, commas, and newlines", () => {
    const csv = toCsv([{ name: 'He said, "hi"\nbye' }], [{ key: "name", label: "Name" }]);
    expect(csv).toBe('Name\r\n"He said, ""hi""\nbye"');
  });

  it("supports computed columns and null", () => {
    const csv = toCsv([{ n: 5, x: null }], [
      { key: "double", label: "Double", get: (r) => (r.n as number) * 2 },
      { key: "x", label: "X" },
    ]);
    expect(csv).toBe("Double,X\r\n10,");
  });

  it("neutralises formula injection (leading = + - @)", () => {
    const rows = [{ v: "=cmd|'/c calc'!A1" }, { v: "+1" }, { v: "-2+3" }, { v: "@SUM(A1)" }];
    const csv = toCsv(rows, [{ key: "v", label: "V" }]);
    // each dangerous cell is prefixed with an apostrophe; the @ row also gets quoted (contains none) → just prefixed
    expect(csv).toBe("V\r\n'=cmd|'/c calc'!A1\r\n'+1\r\n'-2+3\r\n'@SUM(A1)");
  });

  it("leaves safe values untouched", () => {
    expect(toCsv([{ v: "Acme Co" }], [{ key: "v", label: "V" }])).toBe("V\r\nAcme Co");
  });
});
