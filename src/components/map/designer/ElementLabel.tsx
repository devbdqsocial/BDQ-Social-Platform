"use client";

import { Group, Rect, Text } from "react-konva";
import { fitLabel, LABEL } from "@/lib/map/label-fit";

/**
 * Auto-fitting map label. Renders the name INSIDE the box when it fits at a readable size (with an
 * optional W×H line when there's vertical room), otherwise floats a small chip ABOVE (or below,
 * near the top edge) so it's always legible and never overlaps or spills. Font is inverse-scaled
 * so on-screen text stays a constant readable size at any zoom.
 */
export function ElementLabel({
  xFt, yFt, widthFt, heightFt, pxPerFt, scale, name, sizeText, fill, worldTopFt,
}: {
  xFt: number; yFt: number; widthFt: number; heightFt: number;
  pxPerFt: number; scale: number;
  name: string; sizeText: string | null; fill: string;
  /** top of the visible world (worldRect.y0) — used to flip the chip below when near the top edge */
  worldTopFt: number;
}) {
  const bwPx = widthFt * pxPerFt * scale;
  const bhPx = heightFt * pxPerFt * scale;
  const fit = fitLabel(bwPx, bhPx, name, !!sizeText);

  const bx = xFt * pxPerFt;
  const by = yFt * pxPerFt;
  const bw = widthFt * pxPerFt;
  const bh = heightFt * pxPerFt;
  // layer-unit font = screen px ÷ scale (the layer is scaled by `scale`)
  const nf = fit.nameFontPx / scale;
  const sf = fit.sizeFontPx / scale;
  const pad = LABEL.pad / scale;

  if (fit.placement === "inside") {
    const totalH = fit.showSize ? nf + sf + pad : nf;
    const top = by + bh / 2 - totalH / 2;
    return (
      <Group listening={false}>
        <Text x={bx} y={top} width={bw} align="center" text={name} fontSize={nf} fill={fill} wrap="none" ellipsis />
        {fit.showSize && sizeText && (
          <Text x={bx} y={top + nf + pad} width={bw} align="center" text={sizeText} fontSize={sf} fill={fill} opacity={0.7} wrap="none" ellipsis />
        )}
      </Group>
    );
  }

  // float above (or below when the box top is near the top of the view)
  const chipText = sizeText ? `${name} · ${sizeText}` : name;
  const chipH = nf + 2 * pad;
  const chipW = (chipText.length * fit.nameFontPx * LABEL.charRatio) / scale + 2 * pad;
  const gap = 3 / scale;
  const flipBelow = yFt * pxPerFt - chipH - gap < worldTopFt * pxPerFt;
  const cx = bx + bw / 2 - chipW / 2;
  const cy = flipBelow ? by + bh + gap : by - gap - chipH;
  return (
    <Group listening={false}>
      <Rect x={cx} y={cy} width={chipW} height={chipH} fill="#FFFFFF" opacity={0.9} stroke="#94A3B8" strokeWidth={0.5 / scale} cornerRadius={2 / scale} />
      <Text x={cx} y={cy + pad} width={chipW} align="center" text={chipText} fontSize={nf} fontStyle="bold" fill="#15120E" wrap="none" />
    </Group>
  );
}
