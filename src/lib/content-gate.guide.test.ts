import { describe, expect, it } from "vitest";
import { serializeGuide, guideBodiesFromSections, parseGuideSections, GUIDE_HEADINGS } from "./content-gate";

/** The guide editor (R5.4 §6.3) serializes six fixed sections to `guide:<eventId>` JSON; the
 *  customer surface parses it back. Round-trip must trim lines, drop blanks, and hide empty sections. */
describe("guide editor serialize/parse round-trip", () => {
  it("keeps only non-empty sections and cleans body lines", () => {
    const bodies = GUIDE_HEADINGS.map((_, i) =>
      i === 0 ? "Food court near Gate 2\n  Veg + Jain options  \n\n" : i === 5 ? "Q: Parking?\nA: Lot B" : "",
    );

    const sections = parseGuideSections(serializeGuide(bodies));
    expect(sections.map((s) => s.heading)).toEqual(["Food & drink", "FAQ"]);
    expect(sections[0].body).toEqual(["Food court near Gate 2", "Veg + Jain options"]);

    const back = guideBodiesFromSections(sections);
    expect(back[0]).toBe("Food court near Gate 2\nVeg + Jain options");
    expect(back[1]).toBe(""); // untouched section stays empty
    expect(back[5]).toBe("Q: Parking?\nA: Lot B");
  });

  it("serializes to empty when nothing is filled in", () => {
    expect(parseGuideSections(serializeGuide(GUIDE_HEADINGS.map(() => "")))).toEqual([]);
  });
});
