// Keyboard data and behaviour shared by the 3D keyboard: the key layout
// and global physical-keyboard handling.

import { useEffect } from "react";

export interface KeyConfig {
  id: string;
  label: string;
  shiftLabel?: string;
  width?: number;
  align?: "left" | "center";
  small?: boolean;
}

type KeyRow = KeyConfig[];

export interface KeyboardController {
  /** Visually press the key for a character, auto-releasing it. */
  typeChar: (char: string) => void;
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
      align: "left",
    },
    {
      id: "lwin",
      label: "Win",
      width: 1.25,
      small: true,
      align: "left",
    },
    {
      id: "lalt",
      label: "Alt",
      width: 1.25,
      small: true,
      align: "left",
    },
    { id: "space", label: "", width: 6.25 },
    {
      id: "ralt",
      label: "Alt",
      width: 1.25,
      small: true,
      align: "left",
    },
    {
      id: "rwin",
      label: "Win",
      width: 1.25,
      small: true,
      align: "left",
    },
    {
      id: "fn",
      label: "Fn",
      width: 1.25,
      small: true,
      align: "left",
    },
  ],
];

export const ROW_UNITS = 15;

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

const PROGRAMMATIC_HOLD_MS = 70;

/** The imperative API a parent uses to drive the keyboard via press/release
 *  callbacks — used by the typed nav. */
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
      window.setTimeout(() => {
        for (const kid of ids) releaseKey(kid);
      }, PROGRAMMATIC_HOLD_MS);
    },
  };
}

/** Type a whole word on the board, one key at a time. Calling `typeChar`
 *  in a loop presses every key in the same tick and releases them together
 *  — a chord, not typing — so the characters have to be spread out. Returns
 *  a cancel function; the caller owns the timers it started. */
export function typeString(
  controller: KeyboardController,
  text: string,
  { charMs = 95, jitterMs = 45 } = {},
) {
  const timers: number[] = [];
  let at = 0;
  for (const char of text) {
    timers.push(window.setTimeout(() => controller.typeChar(char), at));
    at += charMs + Math.random() * jitterMs;
  }
  return () => timers.forEach((t) => window.clearTimeout(t));
}

const MODIFIER_FAMILIES: Array<{ modifier: string; ids: string[] }> = [
  { modifier: "Alt", ids: ["lalt", "ralt"] },
  { modifier: "Control", ids: ["lctrl"] },
  { modifier: "Shift", ids: ["lshift", "rshift"] },
  { modifier: "Meta", ids: ["lwin", "rwin"] },
];

// Global physical-keyboard handling, shared by the DOM and 3D
// keyboards.
export function useGlobalKeyInput(
  pressKey: (id: string) => void,
  releaseKey: (id: string) => void,
) {
  useEffect(() => {
    const held = new Set<string>();

    // Typing normally leaves the board alone — otherwise every keystroke in
    // a form would clatter across the room. A field marked data-key-echo
    // opts back in: the chat composer *wants* the board to type along, which
    // is rather the point of a room built around a keyboard.
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      if (el.closest?.("[data-key-echo]")) return false;
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
