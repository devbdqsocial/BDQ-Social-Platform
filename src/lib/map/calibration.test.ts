import { describe, expect, it } from "vitest";
import { computeFtPerPx, imageDimsFt, pixelDistance, toFeet, roundFt } from "./calibration";

describe("calibration math (R2.5.2)", () => {
  it("toFeet converts metres, passes feet through", () => {
    expect(toFeet(10, "FT")).toBe(10);
    expect(toFeet(10, "M")).toBeCloseTo(32.8084, 3);
  });

  it("pixelDistance is euclidean", () => {
    expect(pixelDistance(0, 0, 3, 4)).toBe(5);
    expect(pixelDistance(10, 10, 10, 10)).toBe(0);
  });

  it("computeFtPerPx = knownFt / pixelDist", () => {
    // 100 px apart, known 50 ft → 0.5 ft/px
    expect(computeFtPerPx(0, 0, 100, 0, 50)).toBe(0.5);
    // diagonal: 3-4-5 px, 10 ft → 2 ft/px
    expect(computeFtPerPx(0, 0, 3, 4, 10)).toBe(2);
  });

  it("computeFtPerPx returns 0 (uncalibrated) for coincident points or non-positive distance", () => {
    expect(computeFtPerPx(5, 5, 5, 5, 50)).toBe(0);
    expect(computeFtPerPx(0, 0, 100, 0, 0)).toBe(0);
  });

  it("imageDimsFt scales the whole image to real feet", () => {
    // a 4600×3200 px photo at 0.05 ft/px → 230 × 160 ft (Aarush Lawn)
    expect(imageDimsFt(4600, 3200, 0.05)).toEqual({ widthFt: 230, heightFt: 160 });
  });

  it("a real Aarush calibration round-trips to the known venue size", () => {
    // surveyor marks the 230 ft frontage as 920 px on the photo
    const ftPerPx = computeFtPerPx(40, 1000, 960, 1000, 230);
    expect(ftPerPx).toBeCloseTo(0.25, 5);
    const dims = imageDimsFt(1280, 720, ftPerPx);
    expect(roundFt(dims.widthFt)).toBe(320); // 1280 px × 0.25
    expect(roundFt(dims.heightFt)).toBe(180);
  });
});
