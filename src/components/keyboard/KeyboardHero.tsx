"use client";

import { useEffect, useRef, useState } from "react";
import { type KeyboardController } from "./Keyboard";
import GlassKeyboard from "./GlassKeyboard";
import VideoBackdrop from "./VideoBackdrop";
import TerminalSection from "./TerminalSection";
import { BACKDROP, INTRO } from "./visualConfig";
import { links } from "@/lib/links";

const SENTENCE = INTRO.sentence;

// Delay between the keyboard "typing" each character, in ms.
function delayAfter(char: string): number {
  if (char === ".") return 380 + Math.random() * 120;
  if (char === ",") return 240 + Math.random() * 80;
  if (char === " ") return 90 + Math.random() * 60;
  return 55 + Math.random() * 95;
}

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
  // The intro starts on the visitor's first interaction: browsers only allow
  // audio after a user gesture, so gating on one lets the typing be heard.
  const [started, setStarted] = useState(false);
  // The typed-text element, measured by the 3D scene to back it with glass.
  const [pillEl, setPillEl] = useState<HTMLElement | null>(null);
  const pillPlaceholderRef = useRef<HTMLDivElement>(null);

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
    if (started) return;
    const start = () => {
      controllerRef.current?.unlockAudio();
      setStarted(true);
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [started]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Skip the animation entirely: jump straight to the final content.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSentence(SENTENCE);
      setNavTexts(links.map((l) => l.label.toLowerCase()));
      setPhase("done");
      return;
    }

    if (!started) return;

    let cancelled = false;
    const timeouts: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timeouts.push(window.setTimeout(resolve, ms));
      });

    (async () => {
      await wait(350);
      if (cancelled) return;
      setPhase("sentence");
      for (const char of SENTENCE) {
        if (cancelled) return;
        controllerRef.current?.typeChar(char);
        setSentence((t) => t + char);
        await wait(delayAfter(char));
      }
      await wait(650);
      if (cancelled) return;
      setPhase("nav");
      for (let i = 0; i < links.length; i++) {
        const label = links[i].label.toLowerCase();
        for (const char of label) {
          if (cancelled) return;
          controllerRef.current?.typeChar(char);
          setNavTexts((prev) => {
            const next = [...prev];
            next[i] = next[i] + char;
            return next;
          });
          await wait(delayAfter(char));
        }
        await wait(400);
      }
      if (cancelled) return;
      setPhase("done");
    })();

    return () => {
      cancelled = true;
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [started]);

  return (
    <div
      className="relative w-full overflow-x-hidden bg-black"
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
        style={{
          background:
            "radial-gradient(80% 70% at 50% 55%, rgba(0,0,0,0.38), rgba(0,0,0,0.14) 60%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Landing section: the keyboard scene fills the first viewport. */}
      <section className="relative flex h-dvh w-full flex-col">
      <nav
        className="relative z-30 flex w-full items-center justify-end"
        style={{
          padding: "clamp(1rem, 2.5vw, 1.5rem) clamp(1.25rem, 4vw, 2.5rem)",
          gap: "clamp(1.25rem, 3vw, 2.25rem)",
          fontSize: "clamp(0.78rem, 1.2vw, 0.9rem)",
          letterSpacing: "0.02em",
          minHeight: "3.25rem",
          textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.8)",
        }}
      >
        {links.map((link, i) =>
          navTexts[i] ? (
            navTexts[i].length === link.label.length ? (
              <a
                key={link.label}
                href={link.href}
                aria-label={link.description}
                className="kb-nav-link"
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
                style={{ color: "rgba(255,255,255,0.62)" }}
              >
                {navTexts[i]}
              </span>
            )
          ) : null,
        )}
      </nav>

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
                {phase === "waiting" ? (
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>
                    press any key
                  </span>
                ) : (
                  sentence
                )}
                {(phase === "waiting" || phase === "sentence") && (
                  <span className="kb-cursor" />
                )}
              </>
            );
            const pillStyle = {
              // Above the fullscreen 3D canvas (z-5) so the text isn't
              // painted underneath the glass slab.
              position: "relative",
              zIndex: 6,
              minHeight: "2.6em",
              padding: "0.35em 0.9em",
              fontSize: "clamp(1rem, 2.4vw, 1.45rem)",
              lineHeight: 1.5,
              color: "#f0f0f2",
              textAlign: "center",
              textWrap: "balance",
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
                  }}
                >
                  {pillText}
                </p>
              </>
            );
          })()}
          <GlassKeyboard
            textPillEl={pillEl}
            onController={(controller) => {
              controllerRef.current = controller;
            }}
          />
        </div>
      </main>
      </section>

      {/* Scroll runway for the extended video span (BACKDROP.videoScreens):
          more of the clip's portrait frame is revealed here before the
          terminal section fades in. */}
      {BACKDROP.videoScreens > 1 && (
        <div
          aria-hidden
          style={{ height: `calc(${BACKDROP.videoScreens - 1} * 100dvh)` }}
        />
      )}

      <TerminalSection />
    </div>
  );
}
