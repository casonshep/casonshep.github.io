"use client";

import Link from "next/link";
import { useState } from "react";
import { useStandingSection } from "./useStandingSection";

// The HTML over the landscape: a way out, a way to read it as text, how to
// move, and a reader panel for whichever block the player is standing on.
//
// The layer is pointer-transparent — only its own controls take the mouse —
// and it never takes focus: nothing here autofocuses or listens for keys,
// so WASD always reaches the player.
//
// The panel is the RoomPanel idiom (mono, dark glass, thin rules), which
// reads just as well over a bright sky as over the dark room.

const STYLE = `
.land-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
}
.land-glass {
  pointer-events: auto;
  border-radius: 10px;
  background: rgba(14, 14, 18, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.land-head {
  position: absolute;
  top: clamp(0.75rem, 2vh, 1.25rem);
  left: clamp(0.75rem, 2vw, 1.5rem);
  display: flex;
  gap: 1rem;
  padding: 0.45rem 0.8rem;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
}
.land-head a {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 140ms ease-out;
}
.land-head a:hover, .land-head a:focus-visible {
  color: rgba(255, 255, 255, 0.98);
  outline: none;
}

.land-hint {
  position: absolute;
  bottom: clamp(0.75rem, 2vh, 1.25rem);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.4rem 0.8rem;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.7);
  pointer-events: none;
}
.land-hint-touch { display: none; }
@media (pointer: coarse) {
  .land-hint-keys { display: none; }
  .land-hint-touch { display: inline; }
  /* The joystick and jump button own the bottom corners; stay above them. */
  .land-hint { bottom: auto; top: clamp(3.4rem, 8vh, 4.2rem); }
}

.land-panel {
  position: absolute;
  top: clamp(0.75rem, 2vh, 1.25rem);
  right: clamp(0.75rem, 2vw, 1.5rem);
  width: min(24rem, 40vw);
  max-height: min(60vh, 30rem);
  overflow-y: auto;
  padding: 1.1rem 1.25rem 1.25rem;
  border-radius: 14px;
  background: rgba(14, 14, 18, 0.86);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  opacity: 0;
  transform: translateY(-0.6rem);
  visibility: hidden;
  /* Hidden only once faded, so a closed panel's links can't be tabbed to. */
  transition: opacity 200ms ease-out, transform 200ms ease-out,
              visibility 0s linear 200ms;
}
.land-panel.open {
  opacity: 1;
  transform: none;
  visibility: visible;
  transition-delay: 0s;
}
@media (max-width: 640px) {
  .land-panel {
    top: clamp(3.4rem, 8vh, 4.2rem);
    left: 50%;
    right: auto;
    width: min(34rem, 92vw);
    max-height: 40vh;
    transform: translate(-50%, -0.6rem);
  }
  .land-panel.open { transform: translate(-50%, 0); }
}
@media (max-width: 640px) and (pointer: coarse) {
  .land-panel { top: clamp(5.6rem, 13vh, 6.6rem); }
}
@media (prefers-reduced-motion: reduce) {
  .land-panel, .land-panel.open { transition: none; }
}
.land-panel h2 {
  margin: 0 0 0.7rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.78rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.6);
}
.land-panel p {
  margin: 0 0 0.55rem;
  font-size: 0.8rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.86);
  overflow-wrap: anywhere;
}
.land-panel-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 0.9rem;
  padding-top: 0.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.land-panel-links a {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  transition: color 140ms ease-out;
}
.land-panel-links a:hover, .land-panel-links a:focus-visible {
  color: rgba(255, 255, 255, 0.98);
  outline: none;
}
`;

export default function Overlay() {
  const standing = useStandingSection();

  // Keep showing the last section while the panel fades out, so it doesn't
  // empty mid-transition. (State adjusted during render, React's pattern for
  // remembering a previous prop.)
  const [shown, setShown] = useState(standing);
  if (standing && standing !== shown) setShown(standing);

  return (
    <div className="land-overlay">
      <style>{STYLE}</style>
      <nav className="land-head land-glass" aria-label="Leave the world">
        <Link href="/">
          cason <span aria-hidden>↖</span> room
        </Link>
        <Link href="/3d/text/">text version</Link>
        {/* CC BY needs the model's credit reachable from where it's seen. */}
        <Link href="/3d/text/#credits">credits</Link>
      </nav>

      <p className="land-hint land-glass">
        <span className="land-hint-keys">
          wasd / arrows · move &nbsp; shift · run &nbsp; space · jump
        </span>
        <span className="land-hint-touch">
          joystick · move &nbsp; button · jump
        </span>
      </p>

      {shown && (
        <section
          className={`land-panel land-glass${standing ? " open" : ""}`}
          aria-label={shown.title}
          aria-hidden={!standing}
        >
          <h2>{shown.title}</h2>
          {shown.lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          {shown.links && shown.links.length > 0 && (
            <div className="land-panel-links">
              {shown.links.map((l) => {
                const external = l.href.startsWith("http");
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                  >
                    {l.label} <span aria-hidden>↗</span>
                  </a>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
