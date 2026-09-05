"use client";

import { useEffect, useMemo, useState } from "react";

// The ground the sprites walk on: a few rows of ASCII texture whose top
// line is exactly the line the sprites' feet rest on. Rows below that one
// are *nearer the viewer*, so each is drawn larger and sparser than the one
// above it — cheap perspective, no projection maths.
//
// It is decoration: aria-hidden, pointer-events off (it spans the full
// width, and would otherwise swallow the HUD button and your own sprite),
// and clipped to its own box so a row can never grow the page sideways.

/** Nearest the walking line first. `density` is the share of cells that get
 *  a glyph rather than a space; the rest of the row is ground you can't
 *  make out. */
const ROWS = [
  // Nearly solid, and mostly underscores: the top row is the edge the feet
  // stand on, and a sparse one reads as static rather than as ground.
  { glyphs: "_____..,'", density: 1, size: 8, opacity: 0.42 },
  { glyphs: "..,'`~-_", density: 0.75, size: 9.5, opacity: 0.3 },
  { glyphs: '.,~-_"', density: 0.55, size: 11.5, opacity: 0.2 },
  { glyphs: ".,~-", density: 0.38, size: 14, opacity: 0.13 },
  { glyphs: ".,-", density: 0.24, size: 17, opacity: 0.08 },
] as const;

/** Monospace advance as a share of the font size — near enough for every
 *  mono face we fall back to, and only used to count columns. */
const ADVANCE = 0.6;

/** Small deterministic PRNG (mulberry32), so a re-render at the same width
 *  redraws the same ground instead of reshuffling it under the sprites. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scatter(width: number, row: (typeof ROWS)[number], seed: number) {
  const rnd = makeRng(seed);
  const cols = Math.ceil(width / (row.size * ADVANCE)) + 2;
  let out = "";
  for (let i = 0; i < cols; i++) {
    out +=
      rnd() < row.density
        ? row.glyphs[Math.floor(rnd() * row.glyphs.length)]
        : " ";
  }
  return out;
}

export default function AsciiFloor({
  /** Distance from the viewport bottom to the sprite strip, as CSS. */
  bottom,
  /** Height of the name label under each sprite: the feet sit this far up
   *  from the bottom of the strip, and that is where the ground starts. */
  feet,
}: {
  bottom: string;
  feet: number;
}) {
  // Rendered client-side only: the column count comes from the viewport, so
  // there is nothing for the server to draw that the client wouldn't redo.
  // Bucketed to 24px so dragging a window edge doesn't reshuffle the ground
  // on every frame.
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const measure = () => setWidth(Math.ceil(window.innerWidth / 24) * 24);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const rows = useMemo(
    () => (width ? ROWS.map((r, i) => scatter(width, r, 0x5eed + i * 977)) : []),
    [width],
  );

  if (!rows.length) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        // Top edge lands on the feet line; whatever hangs below the
        // viewport is simply ground that ran off the screen.
        height: `calc(${bottom} + ${feet}px)`,
        overflow: "hidden",
        zIndex: 8,
        pointerEvents: "none",
        fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, monospace",
        whiteSpace: "pre",
        color: "rgba(226, 232, 255, 1)",
        // One ellipse anchored at the top centre does both fades at once:
        // out to the dark at the sides, and away toward the viewer.
        WebkitMaskImage:
          "radial-gradient(120% 130% at 50% 0%, #000 25%, transparent 100%)",
        maskImage:
          "radial-gradient(120% 130% at 50% 0%, #000 25%, transparent 100%)",
      }}
    >
      {rows.map((text, i) => (
        <div
          key={i}
          style={{
            fontSize: `${ROWS[i].size}px`,
            lineHeight: i === 0 ? 0.9 : 1,
            opacity: ROWS[i].opacity,
          }}
        >
          {text}
        </div>
      ))}
    </div>
  );
}
