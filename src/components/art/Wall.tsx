"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AsciiPlate from "./AsciiPlate";
import { PIECES } from "./pieces";

// The wall: every piece as an ASCII plate, and the lightbox one opens into.
//
// The page owns its own scroller because globals.css pins html/body to the
// viewport for the room — the same reason RoomPanel scrolls inside itself.
// The lightbox sits *beside* that scroller, not inside it: a wheel over a
// descendant would scroll the wall underneath, and body has nowhere to go.

const STYLE = `
.wall-scroll {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
}
.wall-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: clamp(1rem, 2.5vh, 1.75rem) clamp(1rem, 3vw, 2.5rem);
  font-size: clamp(0.8rem, 1.1vw, 0.95rem);
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.62);
}
.wall-head a {
  color: inherit;
  text-decoration: none;
  transition: color 140ms ease-out;
}
.wall-head a:hover, .wall-head a:focus-visible {
  color: rgba(255, 255, 255, 0.95);
  outline: none;
}
.wall-count { color: rgba(255, 255, 255, 0.35); }

.wall {
  padding: clamp(0.5rem, 2vh, 1.5rem) clamp(1rem, 3vw, 2.5rem)
           clamp(3rem, 12vh, 7rem);
  columns: 3;
  column-gap: clamp(1rem, 2.5vw, 2.25rem);
}
@media (max-width: 900px) { .wall { columns: 2; } }
@media (max-width: 560px) { .wall { columns: 1; } }

.plate {
  break-inside: avoid;
  margin: 0 0 clamp(1.75rem, 4vh, 3rem);
}
.plate-frame {
  /* The glyph size is a share of this box's width, which is what keeps a
     plate the same drawing at every column count. */
  container-type: inline-size;
  display: block;
  position: relative;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
  line-height: 0;
}
.plate-frame:focus-visible { outline: 1px solid rgba(255,255,255,0.5); outline-offset: 4px; }
.plate-photo {
  display: block;
  width: 100%;
  height: auto;
}
.plate-ascii {
  position: absolute;
  inset: 0;
  white-space: pre;
  user-select: none;
  background: #000;
  overflow: hidden;
  transition-property: opacity;
  transition-timing-function: ease-out;
}
.plate-ascii > div { transition-property: opacity; transition-timing-function: ease-out; }
.plate-caption {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.7rem;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.6);
}
.plate-meta { color: rgba(255, 255, 255, 0.3); }

@keyframes wall-lightbox-in { from { opacity: 0; } to { opacity: 1; } }
.wall-lightbox {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
  padding: clamp(1.5rem, 5vh, 3.5rem) clamp(1rem, 4vw, 3rem);
  background: rgba(0, 0, 0, 0.94);
  backdrop-filter: blur(6px);
  cursor: zoom-out;
  animation: wall-lightbox-in 160ms ease-out;
}
.wall-lightbox:focus { outline: none; }
.wall-lightbox img {
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
}
.wall-lightbox figcaption {
  display: flex;
  gap: 1rem;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.6);
}
.wall-hint {
  position: fixed;
  bottom: clamp(1rem, 3vh, 2rem);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.25);
}
@media (prefers-reduced-motion: reduce) {
  .plate-ascii, .plate-ascii > div { transition-duration: 1ms; }
  .wall-lightbox { animation: none; }
}
`;

export default function Wall() {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLElement>(null);
  const step = useCallback(
    (d: number) =>
      setOpen((i) =>
        i === null ? i : (i + d + PIECES.length) % PIECES.length,
      ),
    [],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  // Move focus into the dialog while it is up, and hand it back to the
  // plate that opened it. Stepping with the arrows keeps `open` non-null,
  // so this only runs on open and close, not per piece.
  const isOpen = open !== null;
  useEffect(() => {
    if (!isOpen) return;
    const from = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => from?.focus();
  }, [isOpen]);

  return (
    <>
      <div className="wall-scroll">
        <style>{STYLE}</style>
        <header className="wall-head">
          <Link href="/">cason ↖ room</Link>
          <span className="wall-count">
            art · {String(PIECES.length).padStart(2, "0")} pieces
          </span>
        </header>
        <div className="wall">
          {PIECES.map((p, i) => (
            <AsciiPlate
              key={p.src}
              piece={p}
              index={i}
              onOpen={() => setOpen(i)}
            />
          ))}
        </div>
      </div>
      {open !== null && (
        <Lightbox index={open} ref={dialog} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function Lightbox({
  index,
  ref,
  onClose,
}: {
  index: number;
  ref: React.Ref<HTMLElement>;
  onClose: () => void;
}) {
  const piece = PIECES[index];
  return (
    <figure
      ref={ref}
      className="wall-lightbox"
      role="dialog"
      aria-modal
      aria-label={piece.title}
      tabIndex={-1}
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={piece.src} alt={piece.alt ?? piece.title} />
      <figcaption>
        <span>
          {String(index + 1).padStart(2, "0")} · {piece.title}
        </span>
        <span className="plate-meta">{piece.meta}</span>
      </figcaption>
      <span className="wall-hint">← → to move · esc to close</span>
    </figure>
  );
}
