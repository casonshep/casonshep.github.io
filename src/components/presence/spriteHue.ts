// The dominant hue of a sprite, read off its pixels. Used to tint the room
// behind the keyboard to whichever Pokémon you picked.

/** Hue is an angle, so it has to be averaged as one: a plain RGB mean over
 *  Umbreon (black + yellow) or Gengar (purple + near-black) trends grey.
 *  Each pixel contributes a unit vector at its own hue, weighted by how
 *  colourful and how opaque it is; the resultant angle is the answer. */
function dominantHue(data: Uint8ClampedArray): number | null {
  let x = 0;
  let y = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 32) continue; // transparent background of the sprite
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d < 0.04) continue; // greys carry no hue to average
    let h: number;
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= Math.PI / 3;
    // Saturation × alpha: a vivid opaque pixel should outvote a washed one.
    const w = (d / max) * (a / 255);
    x += Math.cos(h) * w;
    y += Math.sin(h) * w;
    total += w;
  }
  if (total < 1) return null; // essentially colourless
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

const cache = new Map<string, Promise<number | null>>();

/** Dominant hue in degrees, or null if the sprite has no usable colour.
 *  Memoised per URL — the picker would otherwise redecode on every open. */
export function spriteHue(url: string): Promise<number | null> {
  const hit = cache.get(url);
  if (hit) return hit;

  const job = new Promise<number | null>((resolve) => {
    const img = new Image();
    // Must be set before `src`, or the request goes out in no-cors mode and
    // the canvas ends up tainted.
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        // An animated GIF draws its first frame, which is what we want.
        const w = Math.min(img.naturalWidth || 64, 96);
        const h = Math.min(img.naturalHeight || 64, 96);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(dominantHue(ctx.getImageData(0, 0, w, h).data));
      } catch {
        // Tainted canvas (a cached non-CORS copy of the same URL) — the
        // room simply stays untinted.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

  cache.set(url, job);
  return job;
}
