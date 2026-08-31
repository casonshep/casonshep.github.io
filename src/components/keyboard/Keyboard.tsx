"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

export interface KeyConfig {
  id: string;
  label: string;
  shiftLabel?: string;
  width?: number;
  muted?: boolean;
  align?: "left" | "center";
  small?: boolean;
}

type KeyRow = KeyConfig[];
type SoundCategory = "normal" | "spacebar" | "modifier";
type KeyTrigger = { press: () => void; release: () => void };

export interface KeyboardController {
  /** Visually press (and sound) the key for a character, auto-releasing it. */
  typeChar: (char: string) => void;
  /**
   * Resume the audio context. Must be called from a user-gesture handler for
   * browsers to allow sound.
   */
  unlockAudio: () => void;
}

export const ROWS: KeyRow[] = [
  [
    { id: "esc", label: "Esc", small: true, align: "left" },
    { id: "1", label: "1", shiftLabel: "!" },
    { id: "2", label: "2", shiftLabel: "@" },
    { id: "3", label: "3", shiftLabel: "#" },
    { id: "4", label: "4", shiftLabel: "$" },
    { id: "5", label: "5", shiftLabel: "%" },
    { id: "6", label: "6", shiftLabel: "^" },
    { id: "7", label: "7", shiftLabel: "&" },
    { id: "8", label: "8", shiftLabel: "*" },
    { id: "9", label: "9", shiftLabel: "(" },
    { id: "0", label: "0", shiftLabel: ")" },
    { id: "minus", label: "-", shiftLabel: "_" },
    { id: "equal", label: "=", shiftLabel: "+" },
    {
      id: "backspace",
      label: "Backspace",
      width: 2,
      small: true,
      align: "left",
    },
  ],
  [
    { id: "tab", label: "Tab", width: 1.5, align: "left", small: true },
    { id: "q", label: "Q" },
    { id: "w", label: "W" },
    { id: "e", label: "E" },
    { id: "r", label: "R" },
    { id: "t", label: "T" },
    { id: "y", label: "Y" },
    { id: "u", label: "U" },
    { id: "i", label: "I" },
    { id: "o", label: "O" },
    { id: "p", label: "P" },
    { id: "lbracket", label: "[", shiftLabel: "{" },
    { id: "rbracket", label: "]", shiftLabel: "}" },
    { id: "backslash", label: "\\", shiftLabel: "|", width: 1.5 },
  ],
  [
    { id: "caps", label: "CapsLock", width: 1.75, align: "left", small: true },
    { id: "a", label: "A" },
    { id: "s", label: "S" },
    { id: "d", label: "D" },
    { id: "f", label: "F" },
    { id: "g", label: "G" },
    { id: "h", label: "H" },
    { id: "j", label: "J" },
    { id: "k", label: "K" },
    { id: "l", label: "L" },
    { id: "semicolon", label: ";", shiftLabel: ":" },
    { id: "quote", label: "'", shiftLabel: '"' },
    { id: "enter", label: "Enter", width: 2.25, align: "left", small: true },
  ],
  [
    { id: "lshift", label: "Shift", width: 2.25, align: "left", small: true },
    { id: "z", label: "Z" },
    { id: "x", label: "X" },
    { id: "c", label: "C" },
    { id: "v", label: "V" },
    { id: "b", label: "B" },
    { id: "n", label: "N" },
    { id: "m", label: "M" },
    { id: "comma", label: ",", shiftLabel: "<" },
    { id: "period", label: ".", shiftLabel: ">" },
    { id: "slash", label: "/", shiftLabel: "?" },
    { id: "rshift", label: "Shift", width: 2.75, align: "left", small: true },
  ],
  [
    {
      id: "lctrl",
      label: "Ctrl",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
    {
      id: "lwin",
      label: "Win",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
    {
      id: "lalt",
      label: "Alt",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
    { id: "space", label: "", width: 6.25 },
    {
      id: "ralt",
      label: "Alt",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
    {
      id: "rwin",
      label: "Win",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
    {
      id: "fn",
      label: "Fn",
      width: 1.25,
      small: true,
      muted: true,
      align: "left",
    },
  ],
];

const PAN_STRENGTH = 0.3;
export const ROW_UNITS = 15;

export const KEY_PAN: Record<string, number> = (() => {
  const pans: Record<string, number> = {};
  for (const row of ROWS) {
    let cursor = 0;
    for (const key of row) {
      const width = key.width ?? 1;
      const center = cursor + width / 2;
      pans[key.id] = ((center / ROW_UNITS) * 2 - 1) * PAN_STRENGTH;
      cursor += width;
    }
  }
  return pans;
})();

export const ALL_KEYS_BY_ID: Record<string, KeyConfig> = (() => {
  const map: Record<string, KeyConfig> = {};
  for (const row of ROWS) {
    for (const key of row) {
      map[key.id] = key;
    }
  }
  return map;
})();

// Character → key (plus whether Shift is held), derived from the key legends.
const CHAR_TO_KEY: Record<string, { id: string; shift?: boolean }> = (() => {
  const map: Record<string, { id: string; shift?: boolean }> = {};
  for (const row of ROWS) {
    for (const key of row) {
      if (key.id === "space") {
        map[" "] = { id: key.id };
        continue;
      }
      if (key.label.length !== 1) continue;
      const lower = key.label.toLowerCase();
      map[lower] = { id: key.id };
      if (key.label !== lower) map[key.label] = { id: key.id, shift: true };
      if (key.shiftLabel) map[key.shiftLabel] = { id: key.id, shift: true };
    }
  }
  return map;
})();

const MODIFIER_KEY_IDS = new Set([
  "esc",
  "tab",
  "caps",
  "enter",
  "backspace",
  "lshift",
  "rshift",
  "lctrl",
  "lwin",
  "lalt",
  "ralt",
  "rwin",
  "fn",
]);

export function getSoundCategory(id: string): SoundCategory {
  if (id === "space") return "spacebar";
  if (MODIFIER_KEY_IDS.has(id)) return "modifier";
  return "normal";
}

function shiftLightness(hex: string, amount: number, alpha = 1): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const adj = amount * 2.2;
  const rr = clamp(r + adj);
  const gg = clamp(g + adj);
  const bb = clamp(b + adj);
  return alpha >= 1
    ? `rgb(${rr}, ${gg}, ${bb})`
    : `rgba(${rr}, ${gg}, ${bb}, ${alpha})`;
}

function hashKeyId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

interface KeyVariance {
  hueShift: number;
  lightnessShift: number;
  specularShiftX: number;
  specularShiftY: number;
  wearAngle: number;
  wearAmount: number;
  dust: boolean;
  dustX: number;
  dustY: number;
  microTilt: number;
  rimBias: number;
}

function getKeyVariance(id: string, small?: boolean): KeyVariance {
  const a = hashKeyId(id);
  const b = hashKeyId(id + "_b");
  const c = hashKeyId(id + "_c");
  const d = hashKeyId(id + "_d");
  const e = hashKeyId(id + "_e");
  return {
    hueShift: (a - 0.5) * 3,
    lightnessShift: (b - 0.5) * 4,
    specularShiftX: (c - 0.5) * 16,
    specularShiftY: (a * c - 0.5) * 12,
    wearAngle: b * 360,
    wearAmount: small ? 0.08 + c * 0.06 : 0.1 + d * 0.1,
    dust: false,
    dustX: 15 + c * 70,
    dustY: 15 + a * 70,
    microTilt: (e - 0.5) * 0.32,
    rimBias: 0.85 + e * 0.25,
  };
}

const CODE_TO_KEY_ID: Record<string, string> = {
  Escape: "esc",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Digit0: "0",
  Minus: "minus",
  Equal: "equal",
  Backspace: "backspace",
  Tab: "tab",
  KeyQ: "q",
  KeyW: "w",
  KeyE: "e",
  KeyR: "r",
  KeyT: "t",
  KeyY: "y",
  KeyU: "u",
  KeyI: "i",
  KeyO: "o",
  KeyP: "p",
  BracketLeft: "lbracket",
  BracketRight: "rbracket",
  Backslash: "backslash",
  CapsLock: "caps",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
  KeyF: "f",
  KeyG: "g",
  KeyH: "h",
  KeyJ: "j",
  KeyK: "k",
  KeyL: "l",
  Semicolon: "semicolon",
  Quote: "quote",
  Enter: "enter",
  ShiftLeft: "lshift",
  KeyZ: "z",
  KeyX: "x",
  KeyC: "c",
  KeyV: "v",
  KeyB: "b",
  KeyN: "n",
  KeyM: "m",
  Comma: "comma",
  Period: "period",
  Slash: "slash",
  ShiftRight: "rshift",
  ControlLeft: "lctrl",
  MetaLeft: "lwin",
  AltLeft: "lalt",
  Space: "space",
  AltRight: "ralt",
  MetaRight: "rwin",
};

const svgDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const WOOD_GRAIN_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='460' height='460'>
  <filter id='g'>
    <feTurbulence type='fractalNoise' baseFrequency='0.14 0.0032' numOctaves='6' seed='23' stitchTiles='stitch' result='n'/>
    <feColorMatrix in='n' type='matrix' values='0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 0 0.065  0 0 0 1.0 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#g)'/>
</svg>`);

const WOOD_GRAIN_FINE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>
  <filter id='gf'>
    <feTurbulence type='fractalNoise' baseFrequency='0.28 0.01' numOctaves='4' seed='71' stitchTiles='stitch' result='n'/>
    <feColorMatrix in='n' type='matrix' values='0 0 0 0 0.35  0 0 0 0 0.21  0 0 0 0 0.1  0 0 0 0.55 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#gf)'/>
</svg>`);

const WOOD_TONE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='520' height='520'>
  <filter id='t'>
    <feTurbulence type='fractalNoise' baseFrequency='0.0045' numOctaves='2' seed='11' result='n'/>
    <feColorMatrix in='n' type='matrix' values='0 0 0 0 0.22  0 0 0 0 0.115  0 0 0 0 0.045  0 0 0 0.5 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#t)'/>
</svg>`);

const PBT_NOISE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#n)'/>
</svg>`);

const END_GRAIN_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
  <filter id='e'>
    <feTurbulence type='turbulence' baseFrequency='0.24' numOctaves='3' seed='2' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0.12  0 0 0 0 0.07  0 0 0 0 0.026  0 0 0 0.55 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#e)'/>
</svg>`);

const WOOD_PORE_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>
  <filter id='p'>
    <feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' seed='31' result='t'/>
    <feColorMatrix in='t' type='matrix' values='0 0 0 0 0.05  0 0 0 0 0.025  0 0 0 0 0.008  0 0 0 0.075 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#p)'/>
</svg>`);

const WOOD_MICROSCRATCH_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='620' height='420'>
  <defs>
    <filter id='s'>
      <feTurbulence type='fractalNoise' baseFrequency='0.012 0.09' numOctaves='2' seed='58' result='n'/>
      <feColorMatrix in='n' type='matrix' values='0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  0 0 0 0.035 0'/>
    </filter>
  </defs>
  <rect width='100%' height='100%' filter='url(#s)'/>
</svg>`);

const WOOD_DENT_URI = svgDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' width='700' height='500'>
  <defs>
    <radialGradient id='d1' cx='50%' cy='40%' r='60%'>
      <stop offset='0%' stop-color='#000' stop-opacity='0.13'/>
      <stop offset='55%' stop-color='#000' stop-opacity='0.04'/>
      <stop offset='100%' stop-color='#000' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='d2' cx='50%' cy='40%' r='60%'>
      <stop offset='0%' stop-color='#fff' stop-opacity='0.18'/>
      <stop offset='100%' stop-color='#fff' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <ellipse cx='118' cy='72' rx='4.5' ry='2.1' fill='url(#d1)'/>
  <ellipse cx='120' cy='70' rx='1.6' ry='0.7' fill='url(#d2)'/>
  <ellipse cx='562' cy='410' rx='5.5' ry='2.5' fill='url(#d1)' transform='rotate(18 562 410)'/>
  <ellipse cx='564' cy='407' rx='1.9' ry='0.8' fill='url(#d2)' transform='rotate(18 564 407)'/>
  <ellipse cx='612' cy='58' rx='3.2' ry='1.4' fill='url(#d1)'/>
  <ellipse cx='34' cy='330' rx='2.7' ry='1.2' fill='url(#d1)'/>
</svg>`);

const AUDIO_SAMPLE = "data:@file/ogg;base64,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";
interface ThockEngine {
  ctx: AudioContext;
  dry: GainNode;
  wet: GainNode;
  supportsPanning: boolean;
  buffer: AudioBuffer | null;
}

let thockEngine: ThockEngine | null = null;
let thockEnginePromise: Promise<ThockEngine | null> | null = null;

function buildCaseImpulse(ctx: AudioContext): AudioBuffer {
  const duration = 0.2;
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const decay = Math.pow(1 - t, 2.8);
      const raw = (Math.random() * 2 - 1) * decay;
      lp += (raw - lp) * 0.3;
      data[i] = lp;
    }
  }
  return buffer;
}

// Synthesized mechanical-keyboard click, layered like the real thing:
// a sharp band-limited switch snap (~1.5ms), a secondary micro-click as the
// cap settles, a damped mid-range "clack" of cap-on-plate, and a short quiet
// low knock. Channels are decorrelated for a natural stereo image. Used when
// the embedded sample can't be decoded.
function buildThockSample(ctx: AudioContext): AudioBuffer {
  const duration = 0.1;
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    const clackFreq = 1050 + Math.random() * 180;
    let lp = 0;
    let hpMem = 0;
    let knockPhase = 0;
    let clackPhase = Math.random() * Math.PI * 2;
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      // Switch snap: bright band-passed noise, very fast decay.
      const white = Math.random() * 2 - 1;
      lp += (white - lp) * 0.55;
      const banded = lp - hpMem;
      hpMem += (lp - hpMem) * 0.08;
      const click = banded * Math.exp(-t / 0.0013) * 1.6;
      // Secondary micro-click ~6ms later (cap settling).
      const t2 = t - 0.006;
      const click2 = t2 > 0 ? banded * Math.exp(-t2 / 0.0016) * 0.5 : 0;
      // Cap-on-plate clack: damped mid-range ring.
      clackPhase += (2 * Math.PI * clackFreq) / ctx.sampleRate;
      const clack = Math.sin(clackPhase) * Math.exp(-t / 0.007) * 0.5;
      // Short, quiet low knock (kept well below the click).
      const freq = 95 + 90 * Math.exp(-t / 0.012);
      knockPhase += (2 * Math.PI * freq) / ctx.sampleRate;
      const knock = Math.sin(knockPhase) * Math.exp(-t / 0.016) * 0.45;
      data[i] = (click + click2 + clack + knock) * 0.7;
    }
  }
  return buffer;
}

function base64ToArrayBuffer(dataUri: string): ArrayBuffer | null {
  try {
    const commaIndex = dataUri.indexOf(",");
    let base64 = commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : dataUri;
    // The embedded sample's base64 is unpadded/truncated; atob() is strict
    // about that, so strip padding and trim to a decodable length.
    base64 = base64.replace(/[^A-Za-z0-9+/]/g, "");
    while (base64.length % 4 === 1) base64 = base64.slice(0, -1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  } catch {
    return null;
  }
}

async function decodeSample(
  ctx: AudioContext,
  dataUri: string,
): Promise<AudioBuffer | null> {
  const arrayBuffer = base64ToArrayBuffer(dataUri);
  if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } catch {
    return null;
  }
}

export function getThockEngine(): Promise<ThockEngine | null> {
  if (thockEngine) return Promise.resolve(thockEngine);
  if (thockEnginePromise) return thockEnginePromise;

  thockEnginePromise = (async () => {
    if (typeof window === "undefined") return null;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.08;

    const master = ctx.createGain();
    master.gain.value = 0.9;
    compressor.connect(master);
    master.connect(ctx.destination);

    const dry = ctx.createGain();
    dry.gain.value = 0.95;
    dry.connect(compressor);

    // Kept low: room reverb softens the transient, and a crisp click wants
    // to stay tight.
    const wet = ctx.createGain();
    wet.gain.value = 0.14;
    const convolver = ctx.createConvolver();
    convolver.normalize = true;
    convolver.buffer = buildCaseImpulse(ctx);
    wet.connect(convolver);
    convolver.connect(compressor);

    const buffer =
      (await decodeSample(ctx, AUDIO_SAMPLE)) ?? buildThockSample(ctx);

    const engine: ThockEngine = {
      ctx,
      dry,
      wet,
      supportsPanning: typeof ctx.createStereoPanner === "function",
      buffer,
    };
    thockEngine = engine;
    return engine;
  })();

  return thockEnginePromise;
}

const CATEGORY_PROFILE: Record<
  SoundCategory,
  { rate: [number, number]; gain: number; filterHz: number | null }
> = {
  normal: { rate: [0.97, 1.04], gain: 0.85, filterHz: null },
  spacebar: { rate: [0.72, 0.78], gain: 1.0, filterHz: 1600 },
  modifier: { rate: [0.86, 0.92], gain: 0.68, filterHz: 3000 },
};

export function playKeySound(
  category: SoundCategory,
  muted: boolean,
  panHint = 0,
) {
  if (typeof window === "undefined") return;
  getThockEngine().then((engine) => {
    if (!engine || !engine.buffer) return;
    const { ctx, dry, wet, supportsPanning, buffer } = engine;
    if (ctx.state === "suspended") void ctx.resume();

    const profile = CATEGORY_PROFILE[category];
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const [minRate, maxRate] = profile.rate;
    src.playbackRate.value = minRate + Math.random() * (maxRate - minRate);

    const gain = ctx.createGain();
    const baseGain = muted ? profile.gain * 0.75 : profile.gain;
    gain.gain.value = baseGain * (0.96 + Math.random() * 0.08);

    const nodes: AudioNode[] = [src, gain];
    src.connect(gain);
    let tail: AudioNode = gain;

    if (profile.filterHz) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = profile.filterHz;
      filter.Q.value = 0.7;
      tail.connect(filter);
      tail = filter;
      nodes.push(filter);
    }

    if (supportsPanning) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(
        -1,
        Math.min(1, panHint + (Math.random() - 0.5) * 0.08),
      );
      tail.connect(panner);
      tail = panner;
      nodes.push(panner);
    }

    tail.connect(dry);
    tail.connect(wet);

    src.onended = () => {
      for (const node of nodes) node.disconnect();
    };
    src.start(now);
  });
}

export type KeyboardVariant = "wood" | "charcoal" | "glass";

interface KeycapTheme {
  wallStops: [string, string, string, string, string];
  wallAlpha: number;
  wallShadow: string;
  base: string;
  topAlpha: number;
  highlight: number;
  topShadow: string;
  topShadowPressed: string;
  legendInk: string;
  legendSoft: string;
  legendShadow: string;
  shiftLegendShadow: string;
}

const KEYCAP_THEMES: Record<KeyboardVariant, KeycapTheme> = {
  wood: {
    wallStops: ["#f0e4d1", "#e0cead", "#c8b394", "#a68e70", "#8c7458"],
    wallAlpha: 1,
    wallShadow:
      "inset 0 1px 0 rgba(255,255,255,0.4), inset 0.6px 0.4px 0 rgba(255,255,255,0.14), inset 0 -1.5px 2px rgba(15,9,4,0.16), inset 0 0 0 0.5px rgba(15,9,4,0.06)",
    base: "#DFD2C3",
    topAlpha: 1,
    highlight: 0.4,
    topShadow:
      "inset 0 0 0 0.75px rgba(96,70,42,0.28), inset 0 0.6px 0 rgba(255,250,238,0.4), inset 0 -0.8px 1.2px rgba(15,9,4,0.04)",
    topShadowPressed:
      "inset 0 0 0 0.75px rgba(96,70,42,0.34), inset 0 0.5px 0 rgba(255,250,238,0.22), inset 0 1px 2px rgba(15,10,5,0.1)",
    legendInk: "#413e38",
    legendSoft: "#726d64",
    legendShadow:
      "0 0.4px 0 rgba(255,255,255,0.28), 0 0 0.35px rgba(30,24,16,0.35)",
    shiftLegendShadow:
      "0 0.4px 0 rgba(255,255,255,0.32), 0 0 0.3px rgba(35,28,18,0.3)",
  },
  charcoal: {
    wallStops: ["#4a4a52", "#3c3c44", "#2e2e36", "#222228", "#17171c"],
    wallAlpha: 1,
    wallShadow:
      "inset 0 1px 0 rgba(255,255,255,0.14), inset 0.6px 0.4px 0 rgba(255,255,255,0.06), inset 0 -1.5px 2px rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(0,0,0,0.3)",
    base: "#2b2b31",
    topAlpha: 1,
    highlight: 0.11,
    topShadow:
      "inset 0 0 0 0.75px rgba(255,255,255,0.07), inset 0 0.6px 0 rgba(255,255,255,0.12), inset 0 -0.8px 1.2px rgba(0,0,0,0.25)",
    topShadowPressed:
      "inset 0 0 0 0.75px rgba(255,255,255,0.05), inset 0 0.5px 0 rgba(255,255,255,0.07), inset 0 1px 2px rgba(0,0,0,0.45)",
    legendInk: "#e6e6ea",
    legendSoft: "#9a9aa2",
    legendShadow: "0 1px 2px rgba(0,0,0,0.6)",
    shiftLegendShadow: "0 1px 2px rgba(0,0,0,0.5)",
  },
  glass: {
    wallStops: ["#cdd3e0", "#b6bccc", "#9aa0b2", "#7d8396", "#666c7e"],
    wallAlpha: 0.26,
    wallShadow:
      "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1.5px 2px rgba(0,0,0,0.25), inset 0 0 0 0.5px rgba(255,255,255,0.08)",
    base: "#232733",
    topAlpha: 0.45,
    highlight: 0.2,
    topShadow:
      "inset 0 0 0 0.75px rgba(255,255,255,0.16), inset 0 0.6px 0 rgba(255,255,255,0.25), inset 0 -0.8px 1.2px rgba(0,0,0,0.2)",
    topShadowPressed:
      "inset 0 0 0 0.75px rgba(255,255,255,0.1), inset 0 0.5px 0 rgba(255,255,255,0.14), inset 0 1px 2px rgba(0,0,0,0.35)",
    legendInk: "rgba(255,255,255,0.92)",
    legendSoft: "rgba(255,255,255,0.55)",
    legendShadow: "0 1px 3px rgba(0,0,0,0.55)",
    shiftLegendShadow: "0 1px 2px rgba(0,0,0,0.45)",
  },
};

interface CaseTheme {
  wood: boolean;
  background: string;
  boxShadow: string;
  backdropFilter?: string;
  edgeTop: string;
  edgeBottom: string;
  bezelBackground: string;
  bezelShadow: string;
  bezelGlow: string;
}

const CASE_THEMES: Record<KeyboardVariant, CaseTheme> = {
  wood: {
    wood: true,
    background: `
      linear-gradient(180deg, rgba(255,255,255,0.045) 0%, transparent 9%),
      repeating-linear-gradient(180deg, rgba(70,42,16,0.08) 0px, transparent 2px, transparent 6px, rgba(70,42,16,0.055) 8px, transparent 13px),
      linear-gradient(178deg, #ad7440 0%, #9d6636 26%, #895128 55%, #764a24 78%, #63391a 100%)
    `,
    boxShadow:
      "0 0.5px 0 rgba(255,222,185,0.18) inset, 0 -2px 4.5px rgba(35,19,6,0.32) inset, 0.4px 0.4px 0.8px rgba(255,232,200,0.14) inset, 0 3px 6px rgba(15,8,3,0.22), 0 1px 2px rgba(15,8,3,0.2)",
    edgeTop: "rgba(246,223,174,0.22)",
    edgeBottom: "rgba(63,40,17,0.34)",
    bezelBackground:
      "linear-gradient(155deg, #15120e 0%, #0e0c08 50%, #0a0805 100%)",
    bezelShadow:
      "inset 0 2.5px 6px rgba(0,0,0,0.55), inset 0 4px 8px rgba(0,0,0,0.28), inset 0 -1px 0 rgba(255,255,255,0.04), inset 0 0.5px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(0,0,0,0.32), 0 1px 0 rgba(255,236,204,0.1)",
    bezelGlow:
      "radial-gradient(140% 60% at 44% 0%, rgba(180,120,70,0.1), transparent 45%)",
  },
  charcoal: {
    wood: false,
    background:
      "linear-gradient(178deg, #2c2c33 0%, #222228 40%, #17171c 78%, #0e0e12 100%)",
    boxShadow:
      "0 0.5px 0 rgba(255,255,255,0.12) inset, 0 -2px 4.5px rgba(0,0,0,0.5) inset, 0 3px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.45)",
    edgeTop: "rgba(255,255,255,0.09)",
    edgeBottom: "rgba(0,0,0,0.55)",
    bezelBackground:
      "linear-gradient(155deg, #0c0c10 0%, #08080b 50%, #050507 100%)",
    bezelShadow:
      "inset 0 2.5px 6px rgba(0,0,0,0.6), inset 0 4px 8px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(255,255,255,0.03), inset 0 0 0 1px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05)",
    bezelGlow:
      "radial-gradient(140% 60% at 44% 0%, rgba(130,150,210,0.07), transparent 45%)",
  },
  glass: {
    wood: false,
    background:
      "linear-gradient(178deg, rgba(52,58,76,0.42) 0%, rgba(28,31,44,0.5) 55%, rgba(14,16,24,0.58) 100%)",
    boxShadow:
      "0 0.5px 0 rgba(255,255,255,0.22) inset, 0 -2px 4.5px rgba(0,0,0,0.35) inset, 0 4px 14px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.35)",
    backdropFilter: "blur(16px) saturate(1.35)",
    edgeTop: "rgba(255,255,255,0.2)",
    edgeBottom: "rgba(0,0,0,0.4)",
    bezelBackground: "rgba(6,7,11,0.48)",
    bezelShadow:
      "inset 0 2.5px 6px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.08)",
    bezelGlow:
      "radial-gradient(140% 60% at 44% 0%, rgba(140,160,220,0.1), transparent 45%)",
  },
};

type DeviceTier = "mobile" | "tablet" | "desktop";

const MOBILE_BREAKPOINT = "(max-width: 639px)";
const TABLET_BREAKPOINT = "(max-width: 1023px)";

function resolveTier(): DeviceTier {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia(MOBILE_BREAKPOINT).matches) return "mobile";
  if (window.matchMedia(TABLET_BREAKPOINT).matches) return "tablet";
  return "desktop";
}

function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>(resolveTier);

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_BREAKPOINT);
    const tabletQuery = window.matchMedia(TABLET_BREAKPOINT);
    const update = () => setTier(resolveTier());
    update();
    mobileQuery.addEventListener("change", update);
    tabletQuery.addEventListener("change", update);
    return () => {
      mobileQuery.removeEventListener("change", update);
      tabletQuery.removeEventListener("change", update);
    };
  }, []);

  return tier;
}

const RADIUS_TIERS: Record<DeviceTier, { wall: number; top: number }> = {
  desktop: { wall: 8, top: 6.5 },
  tablet: { wall: 7, top: 5.5 },
  mobile: { wall: 5.5, top: 4 },
};

const NOISE_OPACITY_TIERS: Record<DeviceTier, { wall: number; top: number }> = {
  desktop: { wall: 0.05, top: 0.06 },
  tablet: { wall: 0.05, top: 0.06 },
  mobile: { wall: 0.045, top: 0.05 },
};

const NOISE_SIZE_TIERS: Record<DeviceTier, { wall: number; top: number }> = {
  desktop: { wall: 90, top: 40 },
  tablet: { wall: 68, top: 30 },
  mobile: { wall: 48, top: 22 },
};

interface RowSculpt {
  insetTop: number;
  insetSide: number;
  insetBottom: number;
}

const ROW_SCULPT_TIERS: Record<DeviceTier, RowSculpt[]> = {
  desktop: [
    { insetTop: 4, insetSide: 4.5, insetBottom: 11 },
    { insetTop: 4, insetSide: 4.5, insetBottom: 9.5 },
    { insetTop: 4, insetSide: 4.5, insetBottom: 8.5 },
    { insetTop: 4, insetSide: 4.5, insetBottom: 9 },
    { insetTop: 3.5, insetSide: 4, insetBottom: 7 },
  ],
  tablet: [
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 8.8 },
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 7.6 },
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 6.8 },
    { insetTop: 3.2, insetSide: 3.6, insetBottom: 7.2 },
    { insetTop: 2.8, insetSide: 3.2, insetBottom: 5.6 },
  ],
  mobile: [
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 5.8 },
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 5 },
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 4.4 },
    { insetTop: 2.2, insetSide: 2.4, insetBottom: 4.7 },
    { insetTop: 2, insetSide: 2.2, insetBottom: 3.6 },
  ],
};

const LEGEND_SHARED = {
  shiftTopOffset: "13%",
  shiftLeftOffset: "18%",
  primaryBottomOffset: "14.5%",
  primaryLeftOffset: "0.85em",

  opticalCenterShift: "1.4%",
  shiftOpacity: 0.66,
  primaryOpacity: 0.96,
} as const;

const LEGEND_FONT_TIERS: Record<
  DeviceTier,
  { shift: string; normal: string; small: string }
> = {
  desktop: {
    shift: "clamp(0.46rem, 0.74vw, 0.58rem)",
    normal: "clamp(0.74rem, 1.38vw, 0.95rem)",
    small: "clamp(0.56rem, 1.02vw, 0.7rem)",
  },
  tablet: {
    shift: "clamp(0.48rem, 1.12vw, 0.58rem)",
    normal: "clamp(0.7rem, 2.05vw, 0.86rem)",
    small: "clamp(0.55rem, 1.58vw, 0.68rem)",
  },
  mobile: {
    shift: "clamp(0.43rem, 2.05vw, 0.51rem)",
    normal: "clamp(0.62rem, 3.65vw, 0.78rem)",
    small: "clamp(0.51rem, 2.85vw, 0.63rem)",
  },
};

const CONTACT_SHADOW_TIERS: Record<DeviceTier, string> = {
  desktop:
    "0 0.5px 0.5px rgba(12,8,4,0.14), 0 2px 3px rgba(12,8,4,0.1), 0 5px 9px rgba(12,8,4,0.07), 0 10px 16px rgba(12,8,4,0.045)",

  tablet:
    "0 0.4px 0.4px rgba(12,8,4,0.14), 0 1.5px 2.2px rgba(12,8,4,0.1), 0 3.5px 6px rgba(12,8,4,0.07), 0 6.5px 10px rgba(12,8,4,0.04)",
  mobile:
    "0 0.3px 0.3px rgba(12,8,4,0.13), 0 1px 1.6px rgba(12,8,4,0.1), 0 2.2px 4px rgba(12,8,4,0.06)",
};

const KEY_HEIGHT_TIERS: Record<DeviceTier, string> = {
  desktop: "clamp(2.15rem, min(4.15vw, 7.5vh), 2.95rem)",
  tablet: "clamp(1.95rem, min(5.4vw, 7vh), 2.6rem)",
  mobile: "clamp(1.75rem, min(8vw, 6vh), 2.2rem)",
};

const KEY_GAP_TIERS: Record<DeviceTier, string> = {
  desktop: "3px",
  tablet: "2.5px",
  mobile: "2px",
};

const CASE_TIERS: Record<
  DeviceTier,
  {
    caseRadius: string;
    bezelRadius: string;
    casePadding: string;
    bezelPadding: string;
  }
> = {
  desktop: {
    caseRadius: "0.32rem",
    bezelRadius: "0.24rem",
    casePadding: "1.15% 1.3%",
    bezelPadding: "0.28%",
  },
  tablet: {
    caseRadius: "0.3rem",
    bezelRadius: "0.22rem",
    casePadding: "1.3% 1.5%",
    bezelPadding: "0.32%",
  },
  mobile: {
    caseRadius: "0.26rem",
    bezelRadius: "0.2rem",
    casePadding: "1.6% 1.9%",
    bezelPadding: "0.4%",
  },
};

const MOBILE_LABEL_OVERRIDES: Record<string, string> = {
  backspace: "⌫",
  caps: "Caps",
};

const KEY_STYLE_TAG = `
.kb-key {
  --tilt: 0deg;
  will-change: transform;
  contain: layout style paint;
  backface-visibility: hidden;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  transform: translateY(0) scale(1) rotate(var(--tilt));
  transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.kb-key[data-pressed="true"] {
  transform: translateY(4.5px) scale(0.975) rotate(calc(var(--tilt) * 0.3));
  transition: transform 15ms linear;
}
`;

const MIN_VISIBLE_PRESS_MS = 55;

function usePressState(): [boolean, () => void, () => void] {
  const [pressed, setPressed] = useState(false);
  const pressedAtRef = useRef(0);
  const releaseTimeoutRef = useRef<number | null>(null);

  const clearPendingRelease = useCallback(() => {
    if (releaseTimeoutRef.current !== null) {
      window.clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
  }, []);

  const press = useCallback(() => {
    clearPendingRelease();
    pressedAtRef.current = performance.now();
    setPressed(true);
  }, [clearPendingRelease]);

  const release = useCallback(() => {
    const elapsed = performance.now() - pressedAtRef.current;
    const remaining = MIN_VISIBLE_PRESS_MS - elapsed;
    if (remaining > 0) {
      clearPendingRelease();
      releaseTimeoutRef.current = window.setTimeout(() => {
        releaseTimeoutRef.current = null;
        setPressed(false);
      }, remaining);
    } else {
      setPressed(false);
    }
  }, [clearPendingRelease]);

  useEffect(() => clearPendingRelease, [clearPendingRelease]);

  return [pressed, press, release];
}

const Key = memo(function Key({
  config,
  rowIndex,
  tier,
  variant,
  registerTrigger,
  onActivate,
  onDeactivate,
}: {
  config: KeyConfig;
  rowIndex: number;
  tier: DeviceTier;
  variant: KeyboardVariant;
  registerTrigger: (id: string, trigger: KeyTrigger) => () => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
}) {
  const {
    id,
    label,
    shiftLabel,
    width = 1,
    align = "center",
    small,
    muted,
  } = config;
  const [pointerPressed, pressPointer, releasePointer] = usePressState();
  const [physicallyPressed, pressPhysical, releasePhysical] = usePressState();
  const sculptRows = ROW_SCULPT_TIERS[tier];
  const sculpt = sculptRows[rowIndex] ?? sculptRows[1];
  const radius = RADIUS_TIERS[tier];
  const noiseOpacity = NOISE_OPACITY_TIERS[tier];
  const noiseSize = NOISE_SIZE_TIERS[tier];
  const legendFont = LEGEND_FONT_TIERS[tier];
  const contactShadow = CONTACT_SHADOW_TIERS[tier];
  const keyHeight = KEY_HEIGHT_TIERS[tier];
  const displayLabel =
    tier === "mobile" ? (MOBILE_LABEL_OVERRIDES[id] ?? label) : label;
  const pressed = pointerPressed || physicallyPressed;
  const variance = useMemo(() => getKeyVariance(id, small), [id, small]);

  const primaryAlign: "left" | "center" = align;

  useEffect(() => {
    return registerTrigger(id, {
      press: pressPhysical,
      release: releasePhysical,
    });
  }, [id, registerTrigger, pressPhysical, releasePhysical]);

  const theme = KEYCAP_THEMES[variant];

  const layers = useMemo(() => {
    const insetTRBL = `${sculpt.insetTop}px ${sculpt.insetSide}px ${sculpt.insetBottom}px ${sculpt.insetSide}px`;
    return {
      insetTRBL,

      wallGradient: `linear-gradient(180deg, ${shiftLightness(
        theme.wallStops[0],
        variance.lightnessShift,
        theme.wallAlpha,
      )} 0%, ${shiftLightness(
        theme.wallStops[1],
        variance.lightnessShift,
        theme.wallAlpha,
      )} 18%, ${shiftLightness(
        theme.wallStops[2],
        variance.lightnessShift,
        theme.wallAlpha,
      )} 46%, ${shiftLightness(
        theme.wallStops[3],
        variance.lightnessShift * 0.7,
        theme.wallAlpha,
      )} 78%, ${shiftLightness(
        theme.wallStops[4],
        variance.lightnessShift * 0.5,
        theme.wallAlpha,
      )} 100%)`,
      wallFilter: `hue-rotate(${variance.hueShift}deg)`,
      wallNoisePosition: `${variance.specularShiftX}px ${variance.specularShiftY}px`,

      wallShadow: theme.wallShadow,

      topGradient: `radial-gradient(115% 125% at ${23 + variance.specularShiftX * 0.4}% 9%, rgba(255,255,255,${
        theme.highlight - variance.wearAmount * 0.06
      }), rgba(255,255,255,0) 44%), radial-gradient(150% 120% at 50% 118%, rgba(15,9,4,${
        0.07 + variance.wearAmount * 0.02
      }), transparent 60%), ${shiftLightness(theme.base, variance.lightnessShift * 0.6, theme.topAlpha)}`,
      topFilter: `hue-rotate(${variance.hueShift * 0.4}deg)`,
      topNoisePosition: `${variance.specularShiftY}px ${variance.specularShiftX}px`,
      topShadow: theme.topShadow,
      topShadowPressed: theme.topShadowPressed,
      rimOpacityUp: 0.55 * variance.rimBias,
      rimOpacityDown: 0.22 * variance.rimBias,
    };
  }, [sculpt, variance, theme]);

  const handlePress = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      pressPointer();
      onActivate(id);
      playKeySound(getSoundCategory(id), !!muted, KEY_PAN[id] ?? 0);
    },
    [id, muted, pressPointer, onActivate],
  );

  const handleRelease = useCallback(() => {
    releasePointer();
    onDeactivate(id);
  }, [releasePointer, onDeactivate, id]);

  return (
    <button
      type="button"
      aria-label={label || "Space"}
      data-pressed={pressed}
      onPointerDown={handlePress}
      onPointerUp={handleRelease}
      onPointerCancel={handleRelease}
      onPointerLeave={handleRelease}
      style={
        {
          flexGrow: width,
          flexBasis: 0,

          minWidth: 0,
          height: keyHeight,
          "--tilt": `${variance.microTilt}deg`,
        } as CSSProperties
      }
      className="kb-key relative select-none outline-none"
    >
      {}
      <span
        className="pointer-events-none absolute"
        style={{
          inset: 0,
          borderRadius: radius.wall,
          boxShadow: pressed
            ? "0 0.5px 1px rgba(15,9,4,0.2), 0 2px 4px rgba(15,9,4,0.12)"
            : contactShadow,
          transition: "box-shadow 140ms ease-out",
          zIndex: 0,
        }}
      />
      {}
      <span
        className="absolute inset-0"
        style={{
          borderRadius: radius.wall,
          background: layers.wallGradient,
          filter: layers.wallFilter,
          boxShadow: layers.wallShadow,
          zIndex: 1,
        }}
      />
      <span
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          borderRadius: radius.wall,
          backgroundImage: `url("${PBT_NOISE_URI}")`,
          backgroundSize: `${noiseSize.wall}px ${noiseSize.wall}px`,
          backgroundPosition: layers.wallNoisePosition,
          opacity: noiseOpacity.wall,
          zIndex: 1,
        }}
      />
      {}
      <span
        className="absolute"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          background: layers.topGradient,
          filter: layers.topFilter,
          boxShadow: pressed ? layers.topShadowPressed : layers.topShadow,
          transition: "box-shadow 140ms ease-out, background 140ms ease-out",
          zIndex: 3,
        }}
      />
      <span
        className="pointer-events-none absolute mix-blend-overlay"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          backgroundImage: `url("${PBT_NOISE_URI}")`,
          backgroundSize: `${noiseSize.top}px ${noiseSize.top}px`,
          backgroundPosition: layers.topNoisePosition,
          opacity: noiseOpacity.top,
          zIndex: 3,
        }}
      />
      {}
      <span
        className="pointer-events-none absolute"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          background:
            "radial-gradient(55% 50% at 26% 18%, rgba(255,252,244,0.28), transparent 70%)",
          opacity: pressed ? 0.4 : 1,
          transition: "opacity 140ms ease-out",
          zIndex: 4,
        }}
      />
      {}
      <span
        className="pointer-events-none absolute"
        style={{
          borderRadius: radius.top,
          inset: layers.insetTRBL,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, transparent 14%), linear-gradient(100deg, rgba(255,255,255,0.09) 0%, transparent 9%)",
          opacity: pressed ? layers.rimOpacityDown : layers.rimOpacityUp,
          transition: "opacity 140ms ease-out",
          zIndex: 4,
        }}
      />
      <span
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 5 }}
      >
        {shiftLabel && (
          <span
            className="absolute font-medium leading-none"
            style={{
              top: `calc(${sculpt.insetTop}px + ${LEGEND_SHARED.shiftTopOffset})`,
              left: LEGEND_SHARED.shiftLeftOffset,
              fontSize: legendFont.shift,
              color: theme.legendSoft,
              opacity: LEGEND_SHARED.shiftOpacity,
              letterSpacing: "0.01em",

              textShadow: theme.shiftLegendShadow,
            }}
          >
            {shiftLabel}
          </span>
        )}
        {label && (
          <span
            className={`absolute leading-none ${
              small ? "font-semibold" : "font-bold"
            } ${primaryAlign === "left" ? "text-left" : "text-center"}`}
            style={{
              bottom: `calc(${sculpt.insetBottom}px + ${LEGEND_SHARED.primaryBottomOffset})`,
              left:
                primaryAlign === "left"
                  ? LEGEND_SHARED.primaryLeftOffset
                  : shiftLabel
                    ? `calc(50% - ${LEGEND_SHARED.opticalCenterShift})`
                    : "50%",
              transform:
                primaryAlign === "left" ? undefined : "translateX(-50%)",
              fontSize: small ? legendFont.small : legendFont.normal,
              color: theme.legendInk,
              opacity: LEGEND_SHARED.primaryOpacity,
              letterSpacing: small ? "0.015em" : "-0.01em",
              textShadow: theme.legendShadow,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "clip",
              maxWidth: "100%",
            }}
          >
            {displayLabel}
          </span>
        )}
      </span>
    </button>
  );
});

const MODIFIER_FAMILIES: Array<{ modifier: string; ids: string[] }> = [
  { modifier: "Alt", ids: ["lalt", "ralt"] },
  { modifier: "Control", ids: ["lctrl"] },
  { modifier: "Shift", ids: ["lshift", "rshift"] },
  { modifier: "Meta", ids: ["lwin", "rwin"] },
];

// Held slightly longer than MIN_VISIBLE_PRESS_MS so programmatic taps read
// as real presses.
const PROGRAMMATIC_HOLD_MS = 70;

// Builds the imperative API a parent uses to drive any keyboard
// implementation (DOM or 3D) via press/release callbacks.
export function makeKeyboardController(
  pressKey: (id: string) => void,
  releaseKey: (id: string) => void,
): KeyboardController {
  return {
    typeChar: (char: string) => {
      const mapping = CHAR_TO_KEY[char];
      if (!mapping) return;
      const ids = mapping.shift ? ["lshift", mapping.id] : [mapping.id];
      for (const kid of ids) pressKey(kid);
      playKeySound(
        getSoundCategory(mapping.id),
        !!ALL_KEYS_BY_ID[mapping.id]?.muted,
        KEY_PAN[mapping.id] ?? 0,
      );
      window.setTimeout(() => {
        for (const kid of ids) releaseKey(kid);
      }, PROGRAMMATIC_HOLD_MS);
    },
    unlockAudio: () => {
      void getThockEngine().then((engine) => {
        if (engine && engine.ctx.state === "suspended")
          void engine.ctx.resume();
      });
    },
  };
}

// Global physical-keyboard handling (with sound), shared by the DOM and 3D
// keyboards.
export function useGlobalKeyInput(
  pressKey: (id: string) => void,
  releaseKey: (id: string) => void,
) {
  useEffect(() => {
    const held = new Set<string>();

    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };

    const releaseHeldKey = (id: string) => {
      if (!held.has(id)) return;
      held.delete(id);
      releaseKey(id);
    };

    const releaseAllHeld = () => {
      held.forEach((id) => releaseKey(id));
      held.clear();
    };

    const reconcileModifiers = (event: KeyboardEvent) => {
      if (typeof event.getModifierState !== "function") return;
      for (const { modifier, ids } of MODIFIER_FAMILIES) {
        if (!event.getModifierState(modifier)) {
          for (const id of ids) releaseHeldKey(id);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      reconcileModifiers(event);

      if (event.code === "AltLeft" || event.code === "AltRight") {
        event.preventDefault();
      }

      if (event.repeat) return;
      if (isTypingTarget(event.target)) return;

      const id = CODE_TO_KEY_ID[event.code];
      if (!id || held.has(id)) return;

      held.add(id);
      pressKey(id);

      const config = ALL_KEYS_BY_ID[id];
      playKeySound(getSoundCategory(id), !!config?.muted, KEY_PAN[id] ?? 0);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      reconcileModifiers(event);

      const id = CODE_TO_KEY_ID[event.code];
      if (!id) return;
      releaseHeldKey(id);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) releaseAllHeld();
    };

    const handleFocus = () => releaseAllHeld();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseAllHeld);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseAllHeld);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pressKey, releaseKey]);
}

export default function Keyboard({
  onController,
  variant = "wood",
}: {
  onController?: (controller: KeyboardController) => void;
  variant?: KeyboardVariant;
}) {
  const rows = useMemo(() => ROWS, []);
  const keyTriggersRef = useRef<Record<string, KeyTrigger>>({});
  const tier = useDeviceTier();
  const caseTier = CASE_TIERS[tier];
  const caseTheme = CASE_THEMES[variant];
  const gap = KEY_GAP_TIERS[tier];

  const registerTrigger = useCallback((id: string, trigger: KeyTrigger) => {
    keyTriggersRef.current[id] = trigger;
    return () => {
      if (keyTriggersRef.current[id] === trigger)
        delete keyTriggersRef.current[id];
    };
  }, []);

  // Key presses need no page-level bookkeeping here; the Key handles its own
  // visual state and sound.
  const noopKeyEvent = useCallback(() => {}, []);

  const pressKey = useCallback((id: string) => {
    keyTriggersRef.current[id]?.press();
  }, []);
  const releaseKey = useCallback((id: string) => {
    keyTriggersRef.current[id]?.release();
  }, []);

  useEffect(() => {
    onController?.(makeKeyboardController(pressKey, releaseKey));
  }, [onController, pressKey, releaseKey]);

  useEffect(() => {
    void getThockEngine();
  }, []);

  useGlobalKeyInput(pressKey, releaseKey);

  return (
    <div style={{ width: "100%" }}>
      <style>{KEY_STYLE_TAG}</style>
      <div
        style={{
          perspective: "1800px",
          width: "100%",
        }}
      >
        <div
          className="relative w-full"
          style={{ transform: "rotateX(7deg)", transformOrigin: "50% 100%" }}
        >
          <div
            className="absolute inset-x-[16%] top-[99%] -z-10 h-1 rounded-full blur-[1.5px]"
            style={{ background: "rgba(15,10,6,0.2)" }}
          />
          <div
            className="absolute -inset-x-2 top-14 bottom-0 -z-10 rounded-[1.5rem] blur-lg"
            style={{
              background:
                "radial-gradient(55% 70% at 50% 82%, rgba(15,10,6,0.06), transparent 72%)",
            }}
          />
          <div
            className="relative rounded-[var(--kb-case-radius)]"
            style={
              {
                padding: caseTier.casePadding,
                background: caseTheme.background,
                boxShadow: caseTheme.boxShadow,
                backdropFilter: caseTheme.backdropFilter,
                WebkitBackdropFilter: caseTheme.backdropFilter,
                "--kb-case-radius": caseTier.caseRadius,
                "--kb-bezel-radius": caseTier.bezelRadius,
              } as CSSProperties
            }
          >
            {caseTheme.wood && (
            <>
            <div
              className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)] mix-blend-multiply"
              style={{
                backgroundImage: `url("${WOOD_TONE_URI}")`,
                backgroundSize: "520px 520px",
                opacity: 0.46,
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)] mix-blend-multiply"
              style={{
                backgroundImage: `url("${WOOD_GRAIN_URI}")`,
                backgroundSize: "460px 460px",
                opacity: 0.5,
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)] mix-blend-multiply"
              style={{
                backgroundImage: `url("${WOOD_GRAIN_FINE_URI}")`,
                backgroundSize: "300px 300px",
                backgroundPosition: "23px 11px",
                opacity: 0.24,
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius) mix-blend-overlay"
              style={{
                background:
                  "repeating-linear-gradient(179deg, rgba(255,228,192,0.065) 0px, transparent 3px, transparent 17px, rgba(45,23,7,0.1) 20px, transparent 29px), repeating-linear-gradient(183deg, rgba(255,228,192,0.032) 0px, transparent 7px, transparent 41px, rgba(45,23,7,0.055) 44px, transparent 59px)",
                opacity: 0.58,
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius) mix-blend-multiply"
              style={{
                backgroundImage: `url("${WOOD_PORE_URI}")`,
                backgroundSize: "130px 130px",
                opacity: 0.34,
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius) mix-blend-screen"
              style={{
                backgroundImage: `url("${WOOD_MICROSCRATCH_URI}")`,
                backgroundSize: "620px 420px",
                opacity: 0.5,
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius)"
              style={{
                backgroundImage: `url("${WOOD_DENT_URI}")`,
                backgroundSize: "100% 100%",
                opacity: 0.28,
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius)"
              style={{
                background:
                  "linear-gradient(112deg, transparent 30%, rgba(255,244,222,0.06) 44%, rgba(255,244,222,0.1) 49%, rgba(255,244,222,0.05) 54%, transparent 68%)",
                mixBlendMode: "screen",
              }}
            />
            <div
              className="pointer-events-none absolute rounded-tl-(--kb-case-radius) mix-blend-multiply"
              style={{
                left: 0,
                top: 0,
                width: "9%",
                height: "18%",
                backgroundImage: `url("${END_GRAIN_URI}")`,
                backgroundSize: "80px 80px",
                opacity: 0.56,
                maskImage:
                  "radial-gradient(ellipse at top left, black, transparent 75%)",
              }}
            />
            <div
              className="pointer-events-none absolute rounded-br-(--kb-case-radius) mix-blend-multiply"
              style={{
                right: 0,
                bottom: 0,
                width: "10%",
                height: "20%",
                backgroundImage: `url("${END_GRAIN_URI}")`,
                backgroundSize: "80px 80px",
                opacity: 0.5,
                maskImage:
                  "radial-gradient(ellipse at bottom right, black, transparent 75%)",
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius)"
              style={{
                background:
                  "radial-gradient(85% 50% at 38% -8%, rgba(255,240,210,0.15), transparent 42%)",
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 rounded-(--kb-case-radius)"
              style={{
                background:
                  "radial-gradient(70% 45% at 82% 108%, rgba(255,225,180,0.05), transparent 46%)",
              }}
            />

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[var(--kb-case-radius)]"
              style={{
                height: "14%",
                background:
                  "linear-gradient(180deg, transparent 0%, rgba(250,248,244,0.05) 100%)",
                mixBlendMode: "screen",
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 rounded-[var(--kb-case-radius)]"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,246,224,0.6), inset 0 -1px 0 rgba(10,6,2,0.55), inset 1px 0 0 rgba(255,246,224,0.26), inset -1px 0 0 rgba(10,6,2,0.36)",
              }}
            />
            </>
            )}
            <div
              className="pointer-events-none absolute inset-[1px] rounded-[calc(var(--kb-case-radius)_-_0.06rem)] border-t border-l"
              style={{ borderColor: caseTheme.edgeTop }}
            />
            <div
              className="pointer-events-none absolute inset-[1px] rounded-[calc(var(--kb-case-radius)_-_0.06rem)] border-b border-r"
              style={{ borderColor: caseTheme.edgeBottom }}
            />
            <div
              className="relative rounded-[var(--kb-bezel-radius)]"
              style={{
                padding: caseTier.bezelPadding,
                background: caseTheme.bezelBackground,
                boxShadow: caseTheme.bezelShadow,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-[var(--kb-bezel-radius)]"
                style={{
                  background: caseTheme.bezelGlow,
                  zIndex: 0,
                }}
              />
              <div className="relative z-10 flex flex-col" style={{ gap }}>
                {rows.map((row, i) => (
                  <div key={i} className="flex" style={{ gap }}>
                    {row.map((key) => (
                      <Key
                        key={key.id}
                        config={key}
                        rowIndex={i}
                        tier={tier}
                        variant={variant}
                        registerTrigger={registerTrigger}
                        onActivate={noopKeyEvent}
                        onDeactivate={noopKeyEvent}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
