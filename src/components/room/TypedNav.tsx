"use client";

import { useEffect, useState } from "react";
import type { KeyboardController } from "../keyboard/Keyboard";
import { ROOM } from "../keyboard/visualConfig";

// Top-right nav, typed in on load. Each character presses its key on the 3D
// keyboard (via the controller); the item being typed carries a blinking
// cursor, and becomes a link once complete.

const STYLE = `
@keyframes nav-cursor-blink {
  0%, 55% { opacity: 1; }
  56%, 100% { opacity: 0; }
}
.nav-cursor {
  display: inline-block;
  width: 0.55em;
  height: 1.05em;
  margin-left: 0.12em;
  vertical-align: text-bottom;
  background: rgba(232, 232, 236, 0.9);
  animation: nav-cursor-blink 1.1s step-end infinite;
}
.nav-link {
  color: rgba(255, 255, 255, 0.62);
  text-decoration: none;
  transition: color 140ms ease-out;
}
.nav-link:hover, .nav-link:focus-visible {
  color: rgba(255, 255, 255, 0.95);
}
`;

const ITEMS = ROOM.nav.items;
// One flat stream of characters; -1 marks the pause between items.
const STREAM: { item: number; char: string }[] = [];
ITEMS.forEach((it, i) => {
  for (const ch of it.label) STREAM.push({ item: i, char: ch });
});

export default function TypedNav({
  controller,
}: {
  controller: React.RefObject<KeyboardController | null>;
}) {
  const [typed, setTyped] = useState<string[]>(() => ITEMS.map(() => ""));
  // Index into STREAM of the character being typed next; STREAM.length = done.
  const [cursor, setCursor] = useState(-1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTyped(ITEMS.map((it) => it.label));
      setCursor(STREAM.length);
      return;
    }
    const N = ROOM.nav;
    let i = 0;
    let timer = 0;
    const step = () => {
      if (i >= STREAM.length) {
        setCursor(STREAM.length);
        return;
      }
      const { item, char } = STREAM[i];
      controller.current?.typeChar(char);
      setTyped((prev) => {
        const next = prev.slice();
        next[item] = ITEMS[item].label.slice(0, next[item].length + 1);
        return next;
      });
      setCursor(i);
      i++;
      const endOfItem = i < STREAM.length && STREAM[i].item !== item;
      const delay = N.charMs + Math.random() * N.jitterMs + (endOfItem ? N.gapMs : 0);
      timer = window.setTimeout(step, delay);
    };
    timer = window.setTimeout(() => {
      setCursor(0);
      step();
    }, N.startDelayMs);
    return () => window.clearTimeout(timer);
  }, [controller]);

  const activeItem =
    cursor >= 0 && cursor < STREAM.length ? STREAM[cursor].item : -1;
  const started = cursor >= 0;

  return (
    <nav
      aria-label="Site"
      style={{
        position: "fixed",
        top: "clamp(1rem, 2.5vh, 1.75rem)",
        right: "clamp(1rem, 2.5vw, 2rem)",
        zIndex: 10,
        display: "flex",
        gap: "clamp(1rem, 2.2vw, 1.75rem)",
        fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, monospace",
        fontSize: ROOM.nav.fontSize,
        letterSpacing: "0.02em",
        textShadow: "0 1px 3px rgba(0,0,0,0.9)",
        whiteSpace: "nowrap",
      }}
    >
      <style>{STYLE}</style>
      {ITEMS.map((it, i) => {
        const text = typed[i];
        const complete = text.length === it.label.length && activeItem !== i;
        const showCursor = started && activeItem === i;
        if (!text && !showCursor) return null;
        return complete ? (
          <a key={it.label} href={it.href} className="nav-link">
            {text}
          </a>
        ) : (
          <span key={it.label} style={{ color: "rgba(255,255,255,0.62)" }}>
            {text}
            {showCursor && <span className="nav-cursor" aria-hidden />}
          </span>
        );
      })}
    </nav>
  );
}
