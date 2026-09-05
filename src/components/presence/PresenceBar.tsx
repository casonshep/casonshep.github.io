"use client";

import { useEffect, useRef, useState } from "react";
import { ROSTER, avatarById, spriteUrl } from "./roster";
import { MAX_MESSAGE, MAX_NAME, isConfigured, type Presence } from "./usePresence";

// One Pokémon per open window of the site, wandering along the bottom of
// the page, captioned with its owner's name and whatever they last said.
//
// Presence is owned by Site, not by this component: the plate's glow is
// coloured to whichever sprite you picked, so the choice has two consumers.
// Every sprite <img> loads crossOrigin so that the copy in the browser
// cache is CORS-clean — spriteHue reads these same URLs into a canvas, and
// a no-cors cache hit would taint it.
//
// The walk is simulated per client rather than broadcast: positions are
// cosmetic, and sending them would mean a stream of realtime messages for
// something no viewer can tell is unsynchronised. Everyone sees the same
// *cast*, each in their own arrangement.

const WALK = {
  /** Sprite box, px. The Gen-V sprites are ~64px, so past that they blur. */
  size: 56,
  /** Room under the sprite for its name label, px. */
  label: 16,
  /** Distance from the bottom edge. */
  bottom: "clamp(0.75rem, 2vh, 1.5rem)",
  /** Walking speed, px per second. [10 … 60] — 24 is an amble. */
  speed: 24,
  /** How long a sprite stands still between strolls, ms. */
  minPause: 900,
  maxPause: 6000,
  /** Length of one stroll, px. Absolute rather than a share of the width:
   *  as a fraction, a wide monitor turned every stroll into a 20-second
   *  march and the sprites never stood still. Clamped to the strip. */
  minStroll: 40,
  maxStroll: 240,
} as const;

const SLOT_H = WALK.size + WALK.label;

const STYLE = `
.presence-field {
  position: fixed;
  left: 0;
  right: 0;
  bottom: ${WALK.bottom};
  height: ${SLOT_H}px;
  z-index: 10;
  pointer-events: none;
}
.presence-slot {
  position: absolute;
  left: 0;
  bottom: 0;
  width: ${WALK.size}px;
  height: ${SLOT_H}px;
  /* Positioned by the walk loop via transform; will-change keeps it on its
     own layer so 60fps of movement never touches layout. */
  will-change: transform;
}
/* The facing flip lives on the sprite, never the slot — mirroring the slot
   would mirror the name and the speech bubble with it. */
.presence-sprite {
  position: absolute;
  left: 0;
  bottom: ${WALK.label}px;
  width: ${WALK.size}px;
  height: ${WALK.size}px;
  display: grid;
  place-items: center;
}
.presence-sprite img {
  max-width: 100%;
  max-height: 100%;
  image-rendering: pixelated;
  transform: scaleX(var(--flip, 1));
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.8));
}
.presence-name {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
  font-size: 0.62rem;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.5);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.presence-you .presence-name { color: rgba(255, 255, 255, 0.85); }

.presence-bubble {
  position: absolute;
  bottom: ${SLOT_H + 8}px;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(16rem, 62vw);
  width: max-content;
  padding: 0.35rem 0.6rem;
  border-radius: 10px;
  background: rgba(238, 240, 246, 0.95);
  color: #14151a;
  font-size: 0.72rem;
  line-height: 1.35;
  text-align: center;
  overflow-wrap: anywhere;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
}
.presence-bubble::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(238, 240, 246, 0.95);
}

/* Yours is the only clickable one. */
.presence-me { pointer-events: auto; cursor: pointer; background: none; border: 0; padding: 0; }
.presence-me:focus-visible { outline: 2px solid rgba(255,255,255,0.6); border-radius: 8px; }

.presence-composer {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(${WALK.bottom} + ${SLOT_H}px + 3.2rem);
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: min(26rem, 88vw);
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: rgba(14, 14, 18, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
}
.presence-input {
  flex: 1 1 auto;
  min-width: 0;
  background: none;
  border: 0;
  outline: none;
  color: rgba(255, 255, 255, 0.92);
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
  font-size: 0.8rem;
}
.presence-input::placeholder { color: rgba(255, 255, 255, 0.3); }
.presence-hint {
  flex: 0 0 auto;
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.28);
}

.presence-panel {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(${WALK.bottom} + ${SLOT_H}px + 1.4rem);
  z-index: 11;
  width: min(92vw, 26rem);
  max-height: min(64vh, 24rem);
  overflow-y: auto;
  padding: 0.75rem;
  border-radius: 14px;
  background: rgba(14, 14, 18, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}
.presence-namerow {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0 0.15rem 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 0.6rem;
}
.presence-namerow input {
  flex: 1 1 auto;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.35rem 0.55rem;
  color: rgba(255, 255, 255, 0.92);
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
  font-size: 0.78rem;
  outline: none;
}
.presence-namerow input:focus { border-color: rgba(255, 255, 255, 0.3); }
.presence-grid {
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

.presence-hud {
  position: fixed;
  right: clamp(1rem, 2.5vw, 2rem);
  bottom: ${WALK.bottom};
  z-index: 9;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}
.presence-hud button {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: color 140ms ease-out;
}
.presence-hud button:hover, .presence-hud button:focus-visible {
  color: rgba(255, 255, 255, 0.95);
  outline: none;
}
`;

/** One sprite's stroll along the bottom edge. */
type Walker = {
  /** Current and destination x, px from the left edge. */
  x: number;
  targetX: number;
  /** 1 = walking right. The sprites are drawn facing left, so this flips. */
  facing: 1 | -1;
  /** Standing still until this timestamp. */
  waitUntil: number;
  /** Your own sprite holds still while hovered, so it can be clicked. */
  held: boolean;
};

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** Somewhere else along the strip, far enough to be worth walking to. */
function pickTarget(from: number, usable: number) {
  const dist = Math.min(rand(WALK.minStroll, WALK.maxStroll), usable);
  const right = from + dist <= usable && (from - dist < 0 || Math.random() < 0.5);
  return Math.max(0, Math.min(usable, from + (right ? dist : -dist)));
}

/** True when the key event came from somewhere the user is typing. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  const tag = el?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || !!el?.isContentEditable;
}

export default function PresenceBar({ presence }: { presence: Presence }) {
  const { peers, me, avatarId, setAvatarId, name, setName, say, connected } =
    presence;
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const walkers = useRef(new Map<string, Walker>());
  const peersRef = useRef(peers);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  // The walk loop. It writes transforms straight to the DOM: re-rendering
  // React 60 times a second to move a sprite would be absurd.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const usable = Math.max(0, window.innerWidth - WALK.size);

      for (const peer of peersRef.current) {
        const el = nodes.current.get(peer.key);
        if (!el) continue;
        let w = walkers.current.get(peer.key);
        if (!w) {
          // New arrival: drop in somewhere random and stand a moment.
          w = {
            x: rand(0, usable),
            targetX: 0,
            facing: 1,
            waitUntil: now + rand(WALK.minPause, WALK.maxPause),
            held: false,
          };
          w.targetX = w.x;
          walkers.current.set(peer.key, w);
        }

        // Stand still while saying something, so the bubble is readable.
        const talking = Boolean(peer.message);
        if (!reduced && !w.held && !talking) {
          if (now >= w.waitUntil) {
            const dx = w.targetX - w.x;
            if (Math.abs(dx) < 1) {
              // Arrived: rest here, then pick somewhere new to amble to.
              w.x = w.targetX;
              w.waitUntil = now + rand(WALK.minPause, WALK.maxPause);
              w.targetX = pickTarget(w.x, usable);
            } else {
              w.facing = dx < 0 ? -1 : 1;
              w.x += Math.sign(dx) * Math.min(Math.abs(dx), WALK.speed * dt);
            }
          }
          // A window resize can strand a sprite past the new right edge.
          w.x = Math.max(0, Math.min(usable, w.x));
          w.targetX = Math.max(0, Math.min(usable, w.targetX));
        }

        el.style.transform = `translate3d(${w.x.toFixed(1)}px,0,0)`;
        el.style.setProperty("--flip", w.facing > 0 ? "-1" : "1");
      }

      // Forget anyone who has left, so the map doesn't grow all session.
      if (walkers.current.size > peersRef.current.length) {
        const live = new Set(peersRef.current.map((p) => p.key));
        for (const key of walkers.current.keys())
          if (!live.has(key)) walkers.current.delete(key);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Enter anywhere opens the composer; Escape closes whatever is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setComposing(false);
        setOpen(false);
        return;
      }
      if (e.key !== "Enter" || e.repeat || isTyping(e.target)) return;
      e.preventDefault();
      setComposing(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (composing) inputRef.current?.focus();
  }, [composing]);

  // Click-away closes the identity panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Nothing to draw until the stored choice has been read.
  if (!avatarId) return null;

  const others = peers.length - 1;
  const hold = (key: string, held: boolean) => {
    const w = walkers.current.get(key);
    if (w) w.held = held;
  };
  const send = () => {
    say(draft);
    setDraft("");
    setComposing(false);
  };

  return (
    <div ref={rootRef}>
      <style>{STYLE}</style>

      {composing && (
        <div className="presence-composer">
          <input
            ref={inputRef}
            className="presence-input"
            value={draft}
            maxLength={MAX_MESSAGE}
            placeholder="say something…"
            aria-label="Say something"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            onBlur={() => !draft && setComposing(false)}
          />
          <span className="presence-hint">⏎ send · esc</span>
        </div>
      )}

      {open && (
        <div className="presence-panel" aria-label="Your avatar and name">
          <div className="presence-namerow">
            <input
              value={name}
              maxLength={MAX_NAME}
              placeholder="your name"
              aria-label="Your display name"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setOpen(false);
              }}
            />
          </div>
          <div className="presence-grid">
            {ROSTER.map((a) => (
              <button
                key={a.id}
                type="button"
                className="presence-option"
                aria-pressed={a.id === avatarId}
                onClick={() => setAvatarId(a.id)}
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
        </div>
      )}

      <div className="presence-hud">
        <button type="button" onClick={() => setOpen((v) => !v)}>
          {name || "set name"}
        </button>
        <span>⏎ to chat</span>
        {connected && others > 0 && (
          <span>
            {others} other{others === 1 ? "" : "s"} here
          </span>
        )}
      </div>

      <div className="presence-field">
        {peers.map((p) => {
          const a = avatarById(p.avatarId);
          const mine = p.key === me;
          const ref = (el: HTMLElement | null) => {
            if (el) nodes.current.set(p.key, el);
            else nodes.current.delete(p.key);
          };
          const inner = (
            <>
              {p.message && <span className="presence-bubble">{p.message}</span>}
              <span className="presence-sprite">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={spriteUrl(p.avatarId)} alt={a.name} crossOrigin="anonymous" />
              </span>
              {p.name && <span className="presence-name">{p.name}</span>}
            </>
          );
          return mine ? (
            <button
              key={p.key}
              ref={ref}
              type="button"
              className="presence-slot presence-me presence-you"
              aria-label={`You are ${p.name || a.name} — change name or avatar`}
              aria-expanded={open}
              // Stand still while pointed at, or it walks out from under
              // the cursor before it can be clicked.
              onPointerEnter={() => hold(p.key, true)}
              onPointerLeave={() => hold(p.key, false)}
              onFocus={() => hold(p.key, true)}
              onBlur={() => hold(p.key, false)}
              onClick={() => setOpen((v) => !v)}
            >
              {inner}
            </button>
          ) : (
            <span key={p.key} ref={ref} className="presence-slot" title={p.name || a.name}>
              {inner}
            </span>
          );
        })}
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
