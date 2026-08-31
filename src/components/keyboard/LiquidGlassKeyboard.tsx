"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import GlassSurface, { GLASS_SURFACE_CSS } from "./GlassSurface";
import {
  ROWS,
  ROW_UNITS,
  KEY_PAN,
  getSoundCategory,
  getThockEngine,
  playKeySound,
  makeKeyboardController,
  useGlobalKeyInput,
  type KeyboardController,
  type KeyConfig,
} from "./Keyboard";
import { GLASS } from "./visualConfig";

// Alternate glass keyboard: DOM elements with the SVG displacement-filter
// "liquid glass" (GlassSurface) instead of the 3D transmission material.
// Reuses the shared layout, sound, and input machinery from Keyboard.tsx.

const STYLE = `
${GLASS_SURFACE_CSS}
.lgk-key {
  position: relative;
  flex-basis: 0;
  min-width: 0;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  transform: translateY(0) scale(1);
  transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
  border: none;
  padding: 0;
  background: none;
  cursor: pointer;
  outline: none;
}
.lgk-key[data-pressed="true"] {
  transform: translateY(4px) scale(0.97);
  transition: transform 15ms linear;
}
`;

type LiquidTrigger = { press: () => void; release: () => void };

const LiquidKey = memo(function LiquidKey({
  cfg,
  height,
  register,
}: {
  cfg: KeyConfig;
  height: number;
  register: (id: string, trigger: LiquidTrigger) => () => void;
}) {
  const [pressed, setPressed] = useState(false);

  useEffect(
    () =>
      register(cfg.id, {
        press: () => setPressed(true),
        release: () => setPressed(false),
      }),
    [cfg.id, register],
  );

  const handlePress = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setPressed(true);
      playKeySound(getSoundCategory(cfg.id), !!cfg.muted, KEY_PAN[cfg.id] ?? 0);
    },
    [cfg.id, cfg.muted],
  );
  const handleRelease = useCallback(() => setPressed(false), []);

  const labelPx = cfg.small ? height * 0.28 : height * 0.38;

  return (
    <button
      type="button"
      aria-label={cfg.label || "Space"}
      data-pressed={pressed}
      className="lgk-key"
      style={{ flexGrow: cfg.width ?? 1, height }}
      onPointerDown={handlePress}
      onPointerUp={handleRelease}
      onPointerCancel={handleRelease}
      onPointerLeave={handleRelease}
    >
      <GlassSurface
        width="100%"
        height="100%"
        borderRadius={height * GLASS.keyRadiusFactor}
      >
        {cfg.shiftLabel && (
          <span
            style={{
              position: "absolute",
              top: height * 0.1,
              left: height * 0.16,
              fontSize: height * 0.22,
              fontWeight: 500,
              lineHeight: 1,
              color: GLASS.legend.soft,
            }}
          >
            {cfg.shiftLabel}
          </span>
        )}
        {cfg.label && (
          <span
            style={{
              position: "absolute",
              fontWeight: cfg.small ? 600 : 700,
              fontSize: labelPx,
              lineHeight: 1,
              color: GLASS.legend.ink,
              textShadow: "0 1px 3px rgba(0,0,0,0.55)",
              whiteSpace: "nowrap",
              ...(cfg.align === "left"
                ? { left: height * 0.22, bottom: height * 0.18 }
                : {
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -46%)",
                  }),
            }}
          >
            {cfg.label}
          </span>
        )}
      </GlassSurface>
    </button>
  );
});

export default function LiquidGlassKeyboard({
  onController,
}: {
  onController?: (controller: KeyboardController) => void;
}) {
  const triggers = useRef<Map<string, LiquidTrigger>>(new Map());
  const register = useCallback((id: string, trigger: LiquidTrigger) => {
    triggers.current.set(id, trigger);
    return () => {
      if (triggers.current.get(id) === trigger) triggers.current.delete(id);
    };
  }, []);
  const pressKey = useCallback(
    (id: string) => triggers.current.get(id)?.press(),
    [],
  );
  const releaseKey = useCallback(
    (id: string) => triggers.current.get(id)?.release(),
    [],
  );

  useEffect(() => {
    onController?.(makeKeyboardController(pressKey, releaseKey));
  }, [onController, pressKey, releaseKey]);
  useEffect(() => {
    void getThockEngine();
  }, []);
  useGlobalKeyInput(pressKey, releaseKey);

  const boardRef = useRef<HTMLDivElement>(null);
  const [unit, setUnit] = useState(48);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const update = () => setUnit(el.offsetWidth / ROW_UNITS);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rowH = unit * 0.84;
  const gap = Math.max(2, unit * GLASS.keyGapFactor * 0.75);

  return (
    <div ref={boardRef} style={{ width: "100%" }}>
      <style>{STYLE}</style>
      <GlassSurface
        width="100%"
        height="auto"
        borderRadius={rowH * 0.3}
        style={{ padding: gap * 1.5 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          {ROWS.map((row, i) => (
            <div key={i} style={{ display: "flex", gap }}>
              {row.map((cfg) => (
                <LiquidKey
                  key={cfg.id}
                  cfg={cfg}
                  height={rowH}
                  register={register}
                />
              ))}
            </div>
          ))}
        </div>
      </GlassSurface>
    </div>
  );
}
