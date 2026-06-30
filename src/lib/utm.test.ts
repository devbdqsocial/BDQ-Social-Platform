import { describe, expect, it } from "vitest";
import { utmFromSearch } from "./utm";

describe("utmFromSearch", () => {
  it("normalizes common UTM query parameters", () => {
    expect(utmFromSearch("?utm_source=ig&utm_medium=paid&utm_campaign=launch&utm_term=vip&utm_content=story&ref=vendor")).toEqual({
      source: "ig",
      medium: "paid",
      campaign: "launch",
      term: "vip",
      content: "story",
      ref: "vendor",
    });
  });

  it("drops empty and unsafe values", () => {
    expect(utmFromSearch("?utm_source=%3Cscript%3E&utm_medium=%20")).toEqual({ source: "script" });
  });
});
