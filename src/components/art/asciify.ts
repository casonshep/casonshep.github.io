import { ART } from "./pieces";

// Luminance → glyphs. One pass over a downsampled copy of the image, the
// same trick AsciiFloor plays by hand: a grid of monospace cells where the
// character *is* the brightness.

/** Rows of glyphs for `img`, `ART.cols` wide, at the image's aspect. */
export function asciify(img: HTMLImageElement): string[] {
  const cols = ART.cols;
  // A character cell is `advance` wide and `lineHeight` tall in font-size
  // units, so squaring the sample grid to the image means scaling the row
  // count by that ratio — otherwise every plate comes out stretched tall.
  const cellAspect = ART.advance / ART.lineHeight;
  const rows = Math.max(
    1,
    Math.round((cols * cellAspect * img.naturalHeight) / img.naturalWidth),
  );

  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  // Each destination pixel is the average of the source block behind it,
  // which is exactly the "how bright is this cell" question we're asking.
  ctx.drawImage(img, 0, 0, cols, rows);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, cols, rows).data;
  } catch {
    // A cross-origin image taints the canvas. Nothing to draw, so the tile
    // just shows the photograph.
    return [];
  }

  const ramp = ART.ramp;
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      // Rec. 601 luma, near enough and cheap.
      const lum =
        (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      const c = Math.min(1, Math.max(0, (lum - 0.5) * ART.contrast + 0.5));
      line += ramp[Math.min(ramp.length - 1, Math.round(c * (ramp.length - 1)))];
    }
    out.push(line);
  }
  return out;
}
