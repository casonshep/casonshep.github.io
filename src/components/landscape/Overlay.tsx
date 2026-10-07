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
// Styled as paper to match the page: off-white, ink borders, a hard offset
// shadow, square corners, underlined links.

const STYLE = `
.land-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
  color: #151515;
}
/* Paper, not glass: an off-white box with a 1px ink border and a hard
   offset shadow, square-cornered, like the cards printed on the page. */
.land-glass {
  pointer-events: auto;
  background: #fbfaf7;
  border: 1px solid #151515;
  box-shadow: 3px 3px 0 #151515;
}

.land-head {
  position: absolute;
  top: clamp(0.75rem, 2vh, 1.25rem);
  left: clamp(0.75rem, 2vw, 1.5rem);
  display: flex;
  gap: 1rem;
  padding: 0.4rem 0.7rem;
  font-size: 0.75rem;
}
.land-head a {
  color: #151515;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.land-head a:hover, .land-head a:focus-visible {
  color: #a3231c;
  outline: none;
}

.land-hint {
  position: absolute;
  bottom: clamp(0.75rem, 2vh, 1.25rem);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.35rem 0.7rem;
  font-size: 0.68rem;
  white-space: nowrap;
  color: #444;
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
  padding: 1rem 1.15rem 1.1rem;
  opacity: 0;
  transform: translateY(-0.4rem);
  visibility: hidden;
  /* Hidden only once faded, so a closed panel's links can't be tabbed to. */
  transition: opacity 160ms ease-out, transform 160ms ease-out,
              visibility 0s linear 160ms;
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
    transform: translate(-50%, -0.4rem);
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
  margin: 0 0 0.6rem;
  font-family: "Instrument Serif", Georgia, serif;
  font-size: 1.6rem;
  font-weight: 400;
  line-height: 1.1;
  color: #151515;
}
.land-panel p {
  margin: 0 0 0.55rem;
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #333;
  overflow-wrap: anywhere;
}
.land-panel-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 0.8rem;
  padding-top: 0.7rem;
  border-top: 1px solid #151515;
}
.land-panel-links a {
  font-size: 0.75rem;
  color: #a3231c;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.land-panel-links a:hover, .land-panel-links a:focus-visible {
  color: #151515;
  outline: none;
}
@font-face {
  font-family: "Instrument Serif";
  src: url("/fonts/InstrumentSerif-Regular.ttf") format("truetype");
  font-display: swap;
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
