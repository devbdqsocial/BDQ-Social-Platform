/**
 * On-map label fitting (pure, DB-free). Decides whether a box's name label fits INSIDE at a
 * readable size or must float ABOVE on a chip, and whether there's room for a W×H size line.
 * All inputs/outputs are in SCREEN pixels (the caller converts world→screen via pxPerFt·scale
 * and back via fontPx/scale). Text width is approximated — no canvas measuring needed.
 */

export const LABEL = {
  nameMax: 12,
  nameMin: 8,
  sizeFont: 8,
  pad: 4,
  /** average glyph width as a fraction of font size (bold sans ≈ 0.55) */
  charRatio: 0.55,
};

export interface LabelFit {
  placement: "inside" | "above";
  nameFontPx: number;
  showSize: boolean;
  sizeFontPx: number;
}

export function fitLabel(boxWpx: number, boxHpx: number, name: string, hasSize: boolean): LabelFit {
  const { nameMax, nameMin, sizeFont, pad, charRatio } = LABEL;
  const len = Math.max(1, name.trim().length);
  // largest font (≤ max) whose text fits the box width and one line fits the height
  const byWidth = (boxWpx - 2 * pad) / (len * charRatio);
  const byHeight = boxHpx - 2 * pad;
  const nameFont = Math.min(nameMax, byWidth, byHeight);

  if (nameFont >= nameMin) {
    const showSize = hasSize && boxHpx >= nameFont + sizeFont + 3 * pad;
    return { placement: "inside", nameFontPx: nameFont, showSize, sizeFontPx: Math.min(sizeFont, nameFont * 0.85) };
  }
  // too small to read inside → float above at the readable minimum
  return { placement: "above", nameFontPx: nameMin, showSize: hasSize, sizeFontPx: sizeFont };
}
