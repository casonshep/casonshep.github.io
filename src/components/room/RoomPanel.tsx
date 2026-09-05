"use client";

import { useEffect } from "react";
import { panelFor } from "./navContent";

// What the nav actually opens: a pane of dark glass in front of the room.
// Same idiom as the presence panel — mono, blurred backing, thin rule — so
// the page still reads as one surface with the room behind it.
//
// Closing is handled by whoever owns the open state (Site), because the
// click-away has to treat the nav buttons as part of the panel: a
// pointerdown outside would otherwise close it a tick before the nav's own
// click reopened it.

const STYLE = `
@keyframes room-panel-in {
  from { opacity: 0; transform: translate(-50%, 0.6rem); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.room-panel {
  position: fixed;
  left: 50%;
  top: clamp(4.5rem, 12vh, 8rem);
  transform: translateX(-50%);
  z-index: 11;
  width: min(34rem, 88vw);
  max-height: min(60vh, 30rem);
  overflow-y: auto;
  padding: 1.1rem 1.25rem 1.25rem;
  border-radius: 14px;
  background: rgba(14, 14, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
  animation: room-panel-in 220ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .room-panel { animation: none; }
}
.room-panel h2 {
  margin: 0 0 0.7rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.78rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.45);
}
.room-panel p {
  margin: 0 0 0.55rem;
  font-size: 0.8rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.82);
  overflow-wrap: anywhere;
}
.room-panel-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 0.9rem;
  padding-top: 0.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.room-panel-links a {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  transition: color 140ms ease-out;
}
.room-panel-links a:hover, .room-panel-links a:focus-visible {
  color: rgba(255, 255, 255, 0.95);
  outline: none;
}
.room-panel-close {
  position: absolute;
  top: 0.85rem;
  right: 0.9rem;
  background: none;
  border: 0;
  padding: 0.1rem 0.3rem;
  font: inherit;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
}
.room-panel-close:hover, .room-panel-close:focus-visible {
  color: rgba(255, 255, 255, 0.9);
  outline: none;
}
`;

export default function RoomPanel({
  id,
  onClose,
}: {
  /** Which panel is open, or null for none. */
  id: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  const panel = panelFor(id);
  if (!panel) return null;

  return (
    <section className="room-panel" id="room-panel" aria-label={panel.title}>
      <style>{STYLE}</style>
      <button
        type="button"
        className="room-panel-close"
        aria-label="Close"
        onClick={onClose}
      >
        esc
      </button>
      <h2>{panel.title}</h2>
      {panel.lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
      {panel.links && (
        <div className="room-panel-links">
          {panel.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noreferrer" : undefined}
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
