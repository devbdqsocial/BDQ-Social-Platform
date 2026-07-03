import { describe, expect, it } from "vitest";
import { fitLabel, LABEL } from "./label-fit";

describe("fitLabel", () => {
  it("big box: name fits inside with a size line", () => {
    const r = fitLabel(160, 100, "STAGE", true);
    expect(r.placement).toBe("inside");
    expect(r.nameFontPx).toBe(LABEL.nameMax);
    expect(r.showSize).toBe(true);
  });

  it("short (1-line) box: name inside, no size line", () => {
    const r = fitLabel(120, 24, "S-1", true); // tall enough for one readable line, not two
    expect(r.placement).toBe("inside");
    expect(r.showSize).toBe(false);
  });

  it("tiny box: name floats above at the readable minimum", () => {
    const r = fitLabel(16, 16, "Scan Point", true);
    expect(r.placement).toBe("above");
    expect(r.nameFontPx).toBe(LABEL.nameMin);
    expect(r.showSize).toBe(true);
  });

  it("long name in a wide flat box shrinks then floats when below the floor", () => {
    // 12 chars need ~ font = (W-8)/(12*0.55); a 60px-wide box → ~7.6px < min → above
    const r = fitLabel(60, 30, "Security Check", true);
    expect(r.placement).toBe("above");
  });

  it("name font never exceeds the max even in a huge box", () => {
    expect(fitLabel(400, 300, "A", false).nameFontPx).toBe(LABEL.nameMax);
  });
});
