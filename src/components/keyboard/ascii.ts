// Shared ASCII-art rasterizer: turns whatever is in a small cols×rows
// sampling canvas into a glyph grid on a destination canvas. Used by both
// the video backdrop and the terminal section so they blend seamlessly.

export interface AsciiParams {
  fontPx: number;
  ramp: string;
  /** Canvas filter used when tinting glyphs with the source's colors. */
  tintFilter: string;
  /** Brightness lift: gain > 1 brightens, gamma < 1 lifts shadows. */
  gain: number;
  gamma: number;
  /** Render only rows [startRow, endRow). Omit for all rows. */
  startRow?: number;
  endRow?: number;
}

export function asciiFont(fontPx: number): string {
  return `${fontPx}px ui-monospace, Menlo, monospace`;
}

/** Grid dimensions for a destination of the given size. */
export function measureAsciiGrid(
  ctx: CanvasRenderingContext2D,
  fontPx: number,
  width: number,
  height: number,
): { cols: number; rows: number } {
  ctx.font = asciiFont(fontPx);
  const advance = ctx.measureText("M").width || fontPx * 0.6;
  return {
    cols: Math.max(1, Math.ceil(width / advance)),
    rows: Math.max(1, Math.ceil(height / fontPx)),
  };
}

/**
 * Renders the ASCII frame. `offCtx`'s canvas must already contain the
 * cols×rows source image to sample.
 */
export function asciifyFrame(
  ctx: CanvasRenderingContext2D,
  offCtx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  params: AsciiParams,
): void {
  const { fontPx, ramp, tintFilter, gain, gamma, startRow, endRow } = params;
  const canvas = ctx.canvas;
  const r0 = startRow ?? 0;
  const r1 = endRow ?? rows;
  const img = offCtx.getImageData(0, 0, cols, rows);
  const d = img.data;

  const lift = (v: number) => Math.min(1, Math.pow(v / 255, gamma) * gain);

  ctx.font = asciiFont(fontPx);
  ctx.textBaseline = "top";

  // Only clear the full canvas on the first region (no startRow).
  if (r0 === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Clip to the row range so this pass doesn't overwrite other regions.
  const clipped = r0 > 0 || r1 < rows;
  if (clipped) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, r0 * fontPx, canvas.width, (r1 - r0) * fontPx);
    ctx.clip();
    ctx.clearRect(0, r0 * fontPx, canvas.width, (r1 - r0) * fontPx);
  }

  // Pass 1: white glyphs on transparent, one fillText per row.
  ctx.fillStyle = "#fff";
  const maxIdx = ramp.length - 1;
  for (let y = r0; y < r1; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const lum = lift(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      line += ramp[Math.min(maxIdx, Math.floor(lum * maxIdx + 0.5))];
    }
    ctx.fillText(line, 0, y * fontPx);
  }

  // Pass 2: tint the glyphs with the source's own colors.
  ctx.globalCompositeOperation = "source-in";
  ctx.imageSmoothingEnabled = false;
  ctx.filter = tintFilter;
  if (clipped) {
    ctx.drawImage(
      offCtx.canvas,
      0, r0, cols, r1 - r0,
      0, r0 * fontPx, canvas.width, (r1 - r0) * fontPx,
    );
  } else {
    ctx.drawImage(offCtx.canvas, 0, 0, canvas.width, canvas.height);
  }
  ctx.filter = "none";

  // Pass 3: black behind the glyphs.
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#000";
  if (clipped) {
    ctx.fillRect(0, r0 * fontPx, canvas.width, (r1 - r0) * fontPx);
  } else {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.globalCompositeOperation = "source-over";

  if (clipped) {
    ctx.restore();
  }
}
