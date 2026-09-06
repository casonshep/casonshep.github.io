// The art page's content and its knobs, in one file — same split the room
// uses (navContent.ts / visualConfig.ts): this module says *what* hangs on
// the wall, the components below only know how to draw it.
//
// To add a piece: drop the file in `public/artwork/` and add a line to PIECES.
// Nothing else needs touching. Keep the images reasonably large (the ASCII
// pass downsamples them, but the resolved view is shown full-bleed).

export type Piece = {
  /** Path under `public/`. */
  src: string;
  title: string;
  /** Year, medium — drawn as one dim line under the title. */
  meta: string;
  /** Alt text. Falls back to the title. */
  alt?: string;
  /** Pixel size. Optional, but with it the slot holds its shape while the
   *  file is still loading instead of snapping open. */
  width?: number;
  height?: number;
};

export const PIECES: readonly Piece[] = [
  {
    src: "/artwork/01-fold.png",
    title: "fold",
    meta: "2026 · placeholder",
    width: 900,
    height: 1200,
  },
  {
    src: "/artwork/02-tide.png",
    title: "tide",
    meta: "2026 · placeholder",
    width: 1200,
    height: 900,
  },
  {
    src: "/artwork/03-stone.png",
    title: "stone",
    meta: "2026 · placeholder",
    width: 900,
    height: 900,
  },
  {
    src: "/artwork/04-static.png",
    title: "static",
    meta: "2026 · placeholder",
    width: 1000,
    height: 1250,
  },
  {
    src: "/artwork/05-arch.png",
    title: "arch",
    meta: "2026 · placeholder",
    width: 1250,
    height: 1000,
  },
  {
    src: "/artwork/06-drift.png",
    title: "drift",
    meta: "2026 · placeholder",
    width: 900,
    height: 1200,
  },
];

/** Every knob for how the wall looks. Edit and save; dev hot-reloads. */
export const ART = {
  /** Glyph columns each plate is drawn in. This is the resolution of the
   *  ASCII pass — the font size follows from the tile's width, so a plate
   *  looks the same on a phone and a 5K display. [30 … 120] — low reads as
   *  a sketch, high starts to read as the photograph itself. */
  cols: 72,

  /** Darkest → lightest. The first character is what an unlit pixel gets,
   *  so it must be a space or the plate turns into a solid block. */
  ramp: " .,:-~=+*o#%@",

  /** Line box as a multiple of the font size, and the monospace advance as
   *  a share of it. Together these decide how many rows a plate gets, and
   *  therefore whether the ASCII is stretched or squashed. Leave these
   *  unless the glyphs look tall or wide. */
  lineHeight: 1,
  advance: 0.6,

  /** Ink of the glyphs. */
  ink: "rgba(255,255,255,0.72)",

  /** The resolve: how long a plate takes to cross from glyphs to pixels.
   *  [80 … 600] */
  resolveMs: 260,
  /** Share of that spent staggering row by row: 0 = every row at once,
   *  0.9 = the last row barely starts before the first is done. Each row's
   *  own fade is what's left over, so keep this under 1. [0 … 0.9] */
  stagger: 0.75,

  /** Contrast applied to the sampled luminance before it picks a glyph.
   *  Photographs tend to sit in the middle of the ramp and read as mush;
   *  this pushes them apart. 1 = the image as-is. [0.6 … 2.5] */
  contrast: 1.35,
} as const;
