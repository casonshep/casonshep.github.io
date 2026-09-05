"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { LogLine } from "./chatLog";
import { MAX_MESSAGE } from "./usePresence";

// The chat console, bottom left: everything said in front of you, oldest at
// the top, with the line you are typing at the bottom of it. It replaced a
// composer that appeared in the middle of the screen and a bubble that
// vanished after seven seconds — the bubbles are still there over the
// sprites, but this is where a conversation accumulates.
//
// Presentational: the draft, the sending and the log all belong to
// PresenceBar, which owns the presence connection they go through.

const STYLE = `
.chat-console {
  position: fixed;
  left: clamp(1rem, 2.5vw, 2rem);
  z-index: 12;
  width: min(24rem, 82vw);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
}
.chat-log {
  /* Grows upward from the input: an empty log takes no room at all, and
     past the cap it scrolls. No justify-content here — flex-end plus
     overflow makes the top of the scrollback unreachable. */
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: min(34vh, 18rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 0.2rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}
.chat-line {
  /* Flex children shrink by default: without this the lines squash to fit
     the cap instead of overflowing it, and nothing ever scrolls. */
  flex: 0 0 auto;
  font-size: 0.72rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.86);
  overflow-wrap: anywhere;
  text-shadow: 0 0 5px #05050a, 0 0 10px #05050a;
}
.chat-who {
  color: rgba(255, 255, 255, 0.42);
  margin-right: 0.45em;
}
.chat-line-mine .chat-who { color: rgba(255, 255, 255, 0.7); }
.chat-line-emote { color: rgba(255, 255, 255, 0.55); font-style: italic; }
.chat-line-system { color: rgba(160, 200, 255, 0.72); }

/* No chrome at all: the prompt sits in the room like the log above it
   rather than floating over it in a pill. Legibility comes from the same
   dark ring the log lines use, since the ASCII ground runs underneath. */
.chat-input-row {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  padding: 0.15rem 0.2rem;
}
.chat-input {
  flex: 1 1 auto;
  min-width: 0;
  background: none;
  border: 0;
  outline: none;
  color: rgba(255, 255, 255, 0.92);
  font-family: inherit;
  font-size: 0.78rem;
  text-shadow: 0 0 5px #05050a, 0 0 10px #05050a;
}
.chat-input::placeholder { color: rgba(255, 255, 255, 0.26); }
.chat-caret {
  flex: 0 0 auto;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.28);
  text-shadow: 0 0 5px #05050a, 0 0 10px #05050a;
  transition: color 140ms ease-out;
}
/* The only focus affordance left, now that there is no border to light. */
.chat-input-row:focus-within .chat-caret { color: rgba(255, 255, 255, 0.75); }
`;

export default function ChatConsole({
  lines,
  draft,
  setDraft,
  onSend,
  inputRef,
  /** Distance from the bottom of the viewport, as CSS — clear of the
   *  sprites walking along the floor. */
  bottom,
}: {
  lines: LogLine[];
  draft: string;
  setDraft: (draft: string) => void;
  onSend: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  bottom: string;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  // Follow the tail only when already at it: yanking someone back down
  // while they are reading further up is worse than missing a line.
  const pinned = useRef(true);

  useEffect(() => {
    const el = logRef.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="chat-console" style={{ bottom }}>
      <style>{STYLE}</style>
      {lines.length > 0 && (
        <div
          ref={logRef}
          className="chat-log"
          role="log"
          aria-label="Chat history"
          onScroll={(e) => {
            const el = e.currentTarget;
            pinned.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 24;
          }}
        >
          {lines.map((line) => (
            <div
              key={line.id}
              className={`chat-line chat-line-${line.kind}${
                line.mine ? " chat-line-mine" : ""
              }`}
            >
              {line.kind === "say" && <span className="chat-who">{line.who}</span>}
              {line.kind === "emote" ? `${line.who} ${line.text}` : line.text}
            </div>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <span className="chat-caret" aria-hidden>
          &gt;
        </span>
        <input
          ref={inputRef}
          className="chat-input"
          data-key-echo
          value={draft}
          maxLength={MAX_MESSAGE}
          placeholder="say something, or /help"
          aria-label="Say something"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSend();
            }
            if (e.key === "Escape") e.currentTarget.blur();
          }}
        />
      </div>
    </div>
  );
}
