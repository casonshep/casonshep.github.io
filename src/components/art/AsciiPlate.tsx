"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { asciify } from "./asciify";
import { ART, type Piece } from "./pieces";

// One piece on the wall. It hangs as an ASCII rendering of itself and
// resolves into the photograph when the pointer lands on it — row by row,
// so it reads as the image coming into focus rather than a crossfade.
//
// The glyph grid is a fixed number of columns (ART.cols) and the font size
// is derived from the tile's own width in `cqw`, so a plate is the same
// drawing at any size — no resize listener, no re-sampling.

export default function AsciiPlate({
  piece,
  /** Index in the wall, drawn as the piece's number. */
  index,
  onOpen,
}: {
  piece: Piece;
  index: number;
  onOpen: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  // null until the image has been sampled; [] if sampling failed. The photo
  // stays hidden until then — on a slow connection it would otherwise be
  // the first thing on screen, and the glyphs would arrive *over* it.
  const [rows, setRows] = useState<string[] | null>(null);
  const [resolved, setResolved] = useState(false);

  // Sample once the pixels exist. `complete` covers the cached case, where
  // the load event has already been and gone before this effect ran.
  const sample = useCallback(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setRows(asciify(img));
  }, []);
  useEffect(sample, [sample]);
  // If the file never loads there is nothing to sample; let the broken
  // image show rather than an empty black slot.
  const fail = useCallback(() => setRows([]), []);

  // Without a hovering pointer there is no way to ask for the photograph
  // short of tapping — which opens it — so on touch a plate resolves when
  // it is most of the way into view, and goes back to glyphs as it leaves.
  useEffect(() => {
    if (window.matchMedia("(hover: hover)").matches) return;
    const el = imgRef.current?.parentElement;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setResolved(e.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const span = ART.resolveMs * ART.stagger;
  const last = Math.max(1, (rows?.length ?? 1) - 1);

  return (
    <figure className="plate">
      <button
        type="button"
        className="plate-frame"
        onMouseEnter={() => setResolved(true)}
        onMouseLeave={() => setResolved(false)}
        onFocus={() => setResolved(true)}
        onBlur={() => setResolved(false)}
        onClick={onOpen}
        aria-label={`Open ${piece.title}`}
      >
        {/* Sampled for its pixels, so it has to be a real <img> we hold a
            ref to; the export ships images unoptimized anyway. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={piece.src}
          alt={piece.alt ?? piece.title}
          width={piece.width}
          height={piece.height}
          loading="lazy"
          decoding="async"
          onLoad={sample}
          onError={fail}
          className="plate-photo"
          style={{ visibility: rows === null ? "hidden" : "visible" }}
        />
        {rows && rows.length > 0 && (
          <div
            className="plate-ascii"
            aria-hidden
            style={{
              // The layer carries the black that hides the photograph, so
              // it has to fade as a whole — the rows below only stagger
              // *within* it. Fading the rows alone leaves the backing in
              // place and the plate never resolves.
              opacity: resolved ? 0 : 1,
              transitionDuration: `${ART.resolveMs}ms`,
              // 100cqw of tile split into `cols` cells, each `advance` wide.
              fontSize: `calc(100cqw / ${ART.cols * ART.advance})`,
              lineHeight: ART.lineHeight,
              color: ART.ink,
            }}
          >
            {rows.map((line, i) => (
              <div
                key={i}
                style={{
                  opacity: resolved ? 0 : 1,
                  transitionDuration: `${ART.resolveMs - span}ms`,
                  // Top-down going in, bottom-up coming back, so the two
                  // directions don't look like the same animation twice.
                  transitionDelay: `${((resolved ? i : last - i) / last) * span}ms`,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        )}
      </button>
      <figcaption className="plate-caption">
        <span>
          {String(index + 1).padStart(2, "0")} · {piece.title}
        </span>
        <span className="plate-meta">{piece.meta}</span>
      </figcaption>
    </figure>
  );
}
