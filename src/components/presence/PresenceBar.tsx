"use client";

import { useEffect, useRef, useState } from "react";
import {
  isKeySoundMuted,
  setKeySoundMuted,
} from "../keyboard/Keyboard";
import AsciiFloor from "./AsciiFloor";
import ChatConsole from "./ChatConsole";
import { useChatLog } from "./chatLog";
import { EMOTES, isEmote, runCommand } from "./commands";
import { MAX_DEX } from "./pokedex";
import { PICKER, avatarById, spriteUrl } from "./roster";
import {
  MAX_NAME,
  isConfigured,
  parseName,
  type Presence,
} from "./usePresence";

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
  /** Distance from the bottom edge. Everything else along the bottom —
   *  composer, panel, HUD, and the ASCII ground — is placed off this, and
   *  the gap it leaves is what the ground is drawn into. */
  bottom: "clamp(1rem, 2.8vh, 1.8rem)",
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
  /* A ring rather than a drop shadow: the name sits in the same band as the
     ground's top rows, and small dim mono over small dim mono is mush. */
  text-shadow: 0 0 3px #05050a, 0 0 6px #05050a, 0 1px 2px rgba(0, 0, 0, 0.95);
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
/* Emotes ride in on the message field, so they animate the sprite wrapper
   rather than the <img> — the facing flip lives on the image, and one
   transform would overwrite the other. */
@keyframes emote-dance {
  0%, 100% { transform: translateY(0) rotate(-7deg); }
  50% { transform: translateY(-9px) rotate(7deg); }
}
.emote-dance { animation: emote-dance 460ms ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .emote-dance { animation: none; }
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

.presence-panel {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(${WALK.bottom} + ${SLOT_H}px + 1.4rem);
  /* Above the chat console: on a narrow viewport the two overlap, and the
     picker is the transient one. */
  z-index: 13;
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
/* Ten in the grid, the other thousand by name. Without this line the
   picker looks like the whole roster. */
.presence-more {
  margin: 0.7rem 0.15rem 0;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
}
.presence-more code {
  font-family: inherit;
  color: rgba(255, 255, 255, 0.7);
}

.presence-hud {
  position: fixed;
  right: clamp(1rem, 2.5vw, 2rem);
  /* Cleared of the ASCII ground: its lowest line sits just above the
     walking line rather than in the texture. */
  bottom: calc(${WALK.bottom} + ${WALK.label}px + 0.4rem);
  z-index: 9;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.42);
  /* Its lower lines sit in the same band as the ASCII ground, so they get
     a ring — wider than the sprite names', since the ground is at its
     densest by the time it reaches this corner. */
  text-shadow: 0 0 4px #05050a, 0 0 9px #05050a, 0 0 14px #05050a;
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
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const walkers = useRef(new Map<string, Walker>());
  const peersRef = useRef(peers);
  const { lines, print } = useChatLog(peers, me);

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

  // Enter anywhere puts the cursor in the console; Escape backs out of
  // whatever is open. The input is always on screen now, so this is about
  // focus rather than about summoning it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // `isTyping` reads the event target, which is enough for a real
      // browser; guard on focus as well so a "/" that arrives while the
      // console already has the caret can't clobber what is being typed.
      if (e.repeat || isTyping(e.target)) return;
      if (document.activeElement === inputRef.current) return;
      // "/" lands in the console already holding the slash, so a command
      // can be typed in one go. preventDefault stops the browser's
      // quick-find swallowing it on the way.
      if (e.key === "/") {
        e.preventDefault();
        setDraft("/");
        inputRef.current?.focus();
        return;
      }
      if (e.key !== "Enter") return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    const text = draft.trim();
    if (!text) return;
    if (text.startsWith("/")) {
      const result = runCommand(text, {
        name,
        setName,
        setAvatarId,
        say,
        print,
        muted: isKeySoundMuted(),
        setMuted: setKeySoundMuted,
      });
      if (result.hint) print(result.hint);
      // A typo keeps the composer open with the text still in it — closing
      // would put the correction two keystrokes further away, and render
      // the hint into a composer that had just unmounted.
      if (result.kind === "unknown") return;
      setDraft("");
      return;
    }
    say(text);
    setDraft("");
  };

  return (
    <div ref={rootRef}>
      <style>{STYLE}</style>

      <ChatConsole
        lines={lines}
        draft={draft}
        setDraft={setDraft}
        onSend={send}
        inputRef={inputRef}
        bottom={`calc(${WALK.bottom} + ${SLOT_H}px + 2.2rem)`}
      />

      {open && (
        <div className="presence-panel" aria-label="Your avatar and name">
          <div className="presence-namerow">
            <input
              data-key-echo
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
            {PICKER.map((a) => (
              <button
                key={a.id}
                type="button"
                className="presence-option"
                aria-pressed={a.id === avatarId}
                onClick={() => setAvatarId(a.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={spriteUrl(a.id, parseName(name).shiny)}
                  alt=""
                  loading="lazy"
                  crossOrigin="anonymous"
                />
                {a.name}
              </button>
            ))}
          </div>
          <p className="presence-more">
            or type <code>/gengar</code> in the console — any of the {MAX_DEX}
          </p>
        </div>
      )}

      <div className="presence-hud">
        <button type="button" onClick={() => setOpen((v) => !v)}>
          {parseName(name).display || "set name"}
        </button>
        {connected && others > 0 && (
          <span>
            {others} other{others === 1 ? "" : "s"} here
          </span>
        )}
      </div>

      <AsciiFloor bottom={WALK.bottom} feet={WALK.label} />

      <div className="presence-field">
        {peers.map((p) => {
          const a = avatarById(p.avatarId);
          const mine = p.key === me;
          // The shiny flag and the drawn name both come out of the typed
          // name, so peers need no extra field to render it correctly.
          const { display, shiny } = parseName(p.name);
          const ref = (el: HTMLElement | null) => {
            if (el) nodes.current.set(p.key, el);
            else nodes.current.delete(p.key);
          };
          // An emote arrives as the message itself, so it animates the
          // sprite instead of being read out in a bubble.
          const emote = isEmote(p.message) ? EMOTES[p.message].className : null;
          const inner = (
            <>
              {p.message && !emote && (
                <span className="presence-bubble">{p.message}</span>
              )}
              <span className={emote ? `presence-sprite ${emote}` : "presence-sprite"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={spriteUrl(p.avatarId, shiny)}
                  alt={shiny ? `Shiny ${a.name}` : a.name}
                  crossOrigin="anonymous"
                />
              </span>
              {display && <span className="presence-name">{display}</span>}
            </>
          );
          return mine ? (
            <button
              key={p.key}
              ref={ref}
              type="button"
              className="presence-slot presence-me presence-you"
              aria-label={`You are ${display || a.name} — change name or avatar`}
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
            <span key={p.key} ref={ref} className="presence-slot" title={display || a.name}>
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
