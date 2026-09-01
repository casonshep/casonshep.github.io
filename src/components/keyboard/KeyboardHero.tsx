"use client";

import { useEffect, useRef, useState } from "react";
import { type KeyboardController } from "./Keyboard";
import GlassKeyboard from "./GlassKeyboard";
import VideoBackdrop from "./VideoBackdrop";
import { ASSEMBLY, BACKDROP, INTRO } from "./visualConfig";
import { links } from "@/lib/links";

const SENTENCE = INTRO.sentence;

// Everything the keyboard types, in order — the sentence, then each link
// label. Scroll progress maps onto this stream one character at a time.
const TYPE_STREAM =
  SENTENCE + links.map((l) => l.label.toLowerCase()).join("");

const HERO_STYLE_TAG = `
@keyframes kb-cursor-blink {
  0%, 55% { opacity: 1; }
  56%, 100% { opacity: 0; }
}
.kb-cursor {
  display: inline-block;
  width: 0.55em;
  height: 1.05em;
  margin-left: 0.1em;
  vertical-align: text-bottom;
  background: #e8e8ec;
  animation: kb-cursor-blink 1.1s step-end infinite;
}
.kb-nav-link {
  color: rgba(255,255,255,0.62);
  text-decoration: none;
  transition: color 140ms ease-out;
}
.kb-nav-link:hover, .kb-nav-link:focus-visible {
  color: rgba(255,255,255,0.95);
}
.kb-style-btn {
  background: none;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 4px;
  color: rgba(255,255,255,0.45);
  font: inherit;
  padding: 3px 8px;
  cursor: pointer;
  transition: color 140ms ease-out, border-color 140ms ease-out;
}
.kb-style-btn:hover { color: rgba(255,255,255,0.85); }
.kb-style-btn[data-active="true"] {
  color: rgba(255,255,255,0.92);
  border-color: rgba(255,255,255,0.5);
}
`;

export default function KeyboardHero() {
  const controllerRef = useRef<KeyboardController | null>(null);
  const [sentence, setSentence] = useState("");
  const [navTexts, setNavTexts] = useState<string[]>(links.map(() => ""));
  const [phase, setPhase] = useState<"waiting" | "sentence" | "nav" | "done">(
    "waiting",
  );
  // The typed-text element, measured by the 3D scene to back it with glass.
  const [pillEl, setPillEl] = useState<HTMLElement | null>(null);
  const pillPlaceholderRef = useRef<HTMLDivElement>(null);
  const linksPlaceholderRef = useRef<HTMLDivElement>(null);
  const [linksFixedEl, setLinksFixedEl] = useState<HTMLDivElement | null>(null);
  const [linkEls, setLinkEls] = useState<HTMLElement[]>([]);

  // Keep the fixed pill text synced with its placeholder's scroll position.
  // Both the text (fixed DOM) and the glass (fixed canvas) update in rAF,
  // so they never desync during compositor-driven scroll.
  useEffect(() => {
    const pill = pillEl;
    const placeholder = pillPlaceholderRef.current;
    if (!pill || !placeholder) return;
    let raf = 0;
    const sync = () => {
      raf = requestAnimationFrame(sync);
      const r = placeholder.getBoundingClientRect();
      pill.style.left = `${r.left}px`;
      pill.style.top = `${r.top}px`;
      pill.style.width = `${r.width}px`;
    };
    sync();
    return () => cancelAnimationFrame(raf);
  }, [pillEl]);

  useEffect(() => {
    const fixed = linksFixedEl;
    const placeholder = linksPlaceholderRef.current;
    if (!fixed || !placeholder) return;
    let raf = 0;
    const sync = () => {
      raf = requestAnimationFrame(sync);
      const r = placeholder.getBoundingClientRect();
      fixed.style.left = `${r.left}px`;
      fixed.style.top = `${r.top}px`;
      fixed.style.width = `${r.width}px`;
    };
    sync();
    return () => cancelAnimationFrame(raf);
  }, [linksFixedEl]);

  useEffect(() => {
    const container = linksFixedEl;
    if (!container) return;
    const els = Array.from(container.querySelectorAll<HTMLElement>(".kb-link-glass"));
    if (els.length > 0 && (els.length !== linkEls.length || els.some((el, i) => el !== linkEls[i]))) {
      setLinkEls(els);
    }
  });

  // Browsers only allow audio after a user gesture — unlock on the first
  // one so the scroll-typed keys become audible.
  useEffect(() => {
    const unlock = () => controllerRef.current?.unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Typing is scrubbed by scroll, like the assembly: once the keyboard has
  // built (ASSEMBLY.scrollRange of scroll), the next INTRO.scrollRange of
  // scroll types the sentence and links one character at a time — with the
  // matching keys pressing on the 3D keyboard. Scrolling back deletes.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Skip the animation entirely: jump straight to the final content.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSentence(SENTENCE);
      setNavTexts(links.map((l) => l.label.toLowerCase()));
      setPhase("done");
      return;
    }

    let raf = 0;
    let lastCount = -1;

    const apply = (count: number) => {
      setSentence(TYPE_STREAM.slice(0, Math.min(count, SENTENCE.length)));
      let consumed = SENTENCE.length;
      setNavTexts(
        links.map((l) => {
          const label = l.label.toLowerCase();
          const n = Math.max(0, Math.min(label.length, count - consumed));
          consumed += label.length;
          return label.slice(0, n);
        }),
      );
      setPhase(
        count <= 0
          ? "waiting"
          : count < SENTENCE.length
            ? "sentence"
            : count < TYPE_STREAM.length
              ? "nav"
              : "done",
      );
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vh = window.innerHeight;
      const start = vh * (ASSEMBLY.enabled ? ASSEMBLY.scrollRange : 0);
      const span = Math.max(1, vh * INTRO.scrollRange);
      const q = Math.min(1, Math.max(0, (window.scrollY - start) / span));
      const count = Math.round(q * TYPE_STREAM.length);
      if (count === lastCount) return;
      if (lastCount >= 0 && count > lastCount) {
        // Press the newly typed keys on the 3D keyboard.
        for (let i = lastCount; i < count; i++) {
          controllerRef.current?.typeChar(TYPE_STREAM[i]);
        }
      }
      lastCount = count;
      apply(count);
    };
    tick();

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      // overflow-x-clip (not -hidden): hidden would create a scroll
      // container and break the sticky hero below.
      className="relative w-full overflow-x-clip bg-black"
      style={{
        fontFamily:
          "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <style>{HERO_STYLE_TAG}</style>

      <VideoBackdrop />
      {/* Soft vignette so the content stays readable over the video. */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: BACKDROP.vignette }}
      />

      {/* Landing section: pinned while the visitor scrolls through the
          runway — first the keyboard assembles (ASSEMBLY.scrollRange), then
          the sentence and links type out (INTRO.scrollRange). */}
      <div
        className="pointer-events-none"
        style={{
          height: `calc(${
            1 + (ASSEMBLY.enabled ? ASSEMBLY.scrollRange : 0) + INTRO.scrollRange
          } * 100dvh)`,
        }}
      >
      <section className="pointer-events-none sticky top-0 flex h-dvh w-full flex-col">
      <main
        className="relative z-10 flex w-full flex-1 flex-col items-center justify-center"
        style={{
          padding: "0 clamp(0.75rem, 4vw, 2.5rem) clamp(1.5rem, 4vh, 3rem)",
          // Lets clicks reach the 3D glass keyboard's fullscreen canvas
          // (z-5, under this layer); interactive children re-enable events.
          pointerEvents: "none",
        }}
      >
        <div
          className="flex w-full flex-col items-center"
          style={{ maxWidth: "48rem" }}
        >
          {(() => {
            const pillText = (
              <>
                {sentence}
                {phase === "sentence" && <span className="kb-cursor" />}
              </>
            );
            const pillStyle = {
              // Above the fullscreen 3D canvas (z-5) so the text isn't
              // painted underneath the glass slab.
              position: "relative",
              zIndex: 6,
              minHeight: "2.6em",
              padding: "0.35em 0.9em",
              whiteSpace: "nowrap",
              fontSize: INTRO.fontSize,
              lineHeight: 1.5,
              color: "#f0f0f2",
              textAlign: "center",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            } as const;
            return (
              <>
                {/* Invisible placeholder stays in flow for layout. */}
                <div
                  ref={pillPlaceholderRef}
                  aria-hidden
                  style={{
                    ...pillStyle,
                    position: "relative",
                    visibility: "hidden",
                    width: "max-content",
                    marginBottom: "clamp(1.25rem, 4vh, 2.5rem)",
                  }}
                >
                  {pillText}
                </div>
                {/* Visible text is fixed so it lives in the same compositor
                    layer as the glass canvas — no scroll desync. */}
                <p
                  aria-live="polite"
                  ref={setPillEl}
                  style={{
                    ...pillStyle,
                    position: "fixed",
                    margin: 0,
                    // Nothing shows before typing begins: display:none
                    // collapses this to a zero rect, which also scales the
                    // glass slab that tracks it down to nothing.
                    display: phase === "waiting" ? "none" : undefined,
                  }}
                >
                  {pillText}
                </p>
              </>
            );
          })()}
          {(() => {
            const linksStyle = {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "clamp(1.25rem, 3vw, 2.25rem)",
              fontSize: INTRO.linkFontSize,
              letterSpacing: "0.02em",
              textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.8)",
              pointerEvents: "auto" as const,
              position: "relative" as const,
              zIndex: 6,
            };
            const linksContent = links.map((link, i) =>
              navTexts[i] ? (
                navTexts[i].length === link.label.length ? (
                  <a
                    key={link.label}
                    href={link.href}
                    aria-label={link.description}
                    className="kb-nav-link kb-link-glass"
                    style={{ padding: "0.25em 0.6em" }}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      link.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                  >
                    {navTexts[i]}
                  </a>
                ) : (
                  <span
                    key={link.label}
                    className="kb-link-glass"
                    style={{ color: "rgba(255,255,255,0.62)", padding: "0.25em 0.6em" }}
                  >
                    {navTexts[i]}
                  </span>
                )
              ) : null,
            );
            return (
              <>
                <div
                  ref={linksPlaceholderRef}
                  aria-hidden
                  style={{
                    ...linksStyle,
                    visibility: "hidden",
                    marginBottom: "clamp(1.25rem, 4vh, 2.5rem)",
                  }}
                >
                  {linksContent}
                </div>
                <div
                  ref={setLinksFixedEl}
                  style={{
                    ...linksStyle,
                    position: "fixed",
                    margin: 0,
                  }}
                >
                  {linksContent}
                </div>
              </>
            );
          })()}
          <GlassKeyboard
            textPillEl={pillEl}
            linkEls={linkEls}
            onController={(controller) => {
              controllerRef.current = controller;
            }}
          />
        </div>
      </main>
      </section>
      </div>
    </div>
  );
}
