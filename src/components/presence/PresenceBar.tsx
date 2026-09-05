"use client";

import { useEffect, useRef, useState } from "react";
import { ROSTER, avatarById, spriteUrl } from "./roster";
import { isConfigured, type Presence } from "./usePresence";

// A strip along the bottom of the screen: one Pokémon per open window of
// the site. Yours is marked and clicking it opens the picker.
//
// Presence is owned by Site, not by this component: the room behind the
// keyboard is tinted to whichever sprite you picked, so the choice has two
// consumers. Every sprite <img> loads crossOrigin so that the copy in the
// browser cache is CORS-clean — spriteHue reads these same URLs into a
// canvas, and a no-cors cache hit would taint it.

const BAR = {
  /** Sprite box, px. The Gen-V sprites are ~64px, so past that they blur. */
  size: 56,
  /** Gap between sprites, px. */
  gap: 4,
  /** Distance from the bottom edge. */
  bottom: "clamp(0.75rem, 2vh, 1.5rem)",
} as const;

const STYLE = `
.presence-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: ${BAR.bottom};
  z-index: 10;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
/* The rail scrolls on its own when a crowd shows up: the page itself has
   overflow:hidden, so it must never be what scrolls. */
.presence-rail {
  pointer-events: auto;
  display: flex;
  align-items: flex-end;
  gap: ${BAR.gap}px;
  max-width: min(100%, 46rem);
  padding: 0.35rem 0.6rem;
  overflow-x: auto;
  scrollbar-width: none;
  border-radius: 999px;
  background: rgba(12, 12, 16, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(8px);
}
.presence-rail::-webkit-scrollbar { display: none; }

.presence-slot {
  position: relative;
  flex: 0 0 auto;
  width: ${BAR.size}px;
  height: ${BAR.size}px;
  display: grid;
  place-items: center;
}
.presence-slot img {
  max-width: 100%;
  max-height: 100%;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.8));
}
/* Yours: a lit floor under the sprite, and it's the only clickable one. */
.presence-me {
  pointer-events: auto;
  cursor: pointer;
  background: none;
  border: 0;
  padding: 0;
}
.presence-me::after {
  content: "";
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: 2px;
  height: 5px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 120, 210, 0.75),
    rgba(255, 120, 210, 0) 70%
  );
}
.presence-me:focus-visible { outline: 2px solid rgba(255,255,255,0.6); border-radius: 8px; }

.presence-picker {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(${BAR.bottom} + ${BAR.size}px + 1.4rem);
  z-index: 11;
  width: min(92vw, 26rem);
  max-height: min(60vh, 22rem);
  overflow-y: auto;
  padding: 0.75rem;
  border-radius: 14px;
  background: rgba(14, 14, 18, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 0.25rem;
}
.presence-option {
  background: none;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 0.3rem 0.15rem 0.2rem;
  cursor: pointer;
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.6rem;
  letter-spacing: 0.02em;
}
.presence-option img { width: 44px; height: 44px; object-fit: contain; image-rendering: pixelated; }
.presence-option:hover, .presence-option:focus-visible {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  outline: none;
}
.presence-option[aria-pressed="true"] {
  border-color: rgba(255, 120, 210, 0.6);
  color: rgba(255, 255, 255, 0.95);
}
.presence-count {
  pointer-events: none;
  position: absolute;
  bottom: calc(100% + 0.4rem);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.35);
}
@media (prefers-reduced-motion: reduce) {
  .presence-slot img { animation: none; }
}
`;

export default function PresenceBar({ presence }: { presence: Presence }) {
  const { peers, me, avatarId, setAvatarId, connected } = presence;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click-away and Escape close the picker.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Nothing to draw until the stored choice has been read.
  if (!avatarId) return null;

  const others = peers.length - 1;

  return (
    <div ref={rootRef}>
      <style>{STYLE}</style>
      {open && (
        <div className="presence-picker" aria-label="Choose your avatar">
          {ROSTER.map((a) => (
            <button
              key={a.id}
              type="button"
              className="presence-option"
              aria-pressed={a.id === avatarId}
              onClick={() => {
                setAvatarId(a.id);
                setOpen(false);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={spriteUrl(a.id)}
                alt=""
                loading="lazy"
                crossOrigin="anonymous"
              />
              {a.name}
            </button>
          ))}
        </div>
      )}
      <div className="presence-bar">
        <div className="presence-rail">
          {connected && others > 0 && (
            <span className="presence-count">
              {others} other{others === 1 ? "" : "s"} here
            </span>
          )}
          {peers.map((p) => {
            const a = avatarById(p.avatarId);
            const mine = p.key === me;
            const sprite = (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={spriteUrl(p.avatarId)} alt={a.name} crossOrigin="anonymous" />
            );
            return mine ? (
              <button
                key={p.key}
                type="button"
                className="presence-slot presence-me"
                aria-label={`You are ${a.name} — change avatar`}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {sprite}
              </button>
            ) : (
              <span key={p.key} className="presence-slot" title={a.name}>
                {sprite}
              </span>
            );
          })}
        </div>
      </div>
      {!isConfigured && (
        <span hidden>
          Presence is offline: set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </span>
      )}
    </div>
  );
}
