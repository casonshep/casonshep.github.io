// Keyboard data and behaviour shared by the 3D keyboard: the key layout,
// the "thock" sound engine, and global physical-keyboard handling.

import { useEffect } from "react";

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

const AUDIO_SAMPLE = "data:@file/ogg;base64,T2dnUwACAAAAAAAAAAD8mDZiAAAAAPn8AdgBHgF2b3JiaXMAAAAAAoC7AAAAAAAAgLUBAAAAAAC4AU9nZ1MAAAAAAAAAAAAA/Jg2YgEAAAAkrRTxET////////////////////8HA3ZvcmJpcwwAAABMYXZmNjEuNy4xMDABAAAAHwAAAGVuY29kZXI9TGF2YzYxLjE5LjEwMSBsaWJ2b3JiaXMBBXZvcmJpcyVCQ1YBAEAAACRzGCpGpXMWhBAaQlAZ4xxCzmvsGUJMEYIcMkxbyyVzkCGkoEKIWyiB0JBVAABAAACHQXgUhIpBCCGEJT1YkoMnPQghhIg5eBSEaUEIIYQQQgghhBBCCCGERTlokoMnQQgdhOMwOAyD5Tj4HIRFOVgQgydB6CCED0K4moOsOQghhCQ1SFCDBjnoHITCLCiKgsQwuBaEBDUojILkMMjUgwtCiJqDSTX4GoRnQXgWhGlBCCGEJEFIkIMGQcgYhEZBWJKDBjm4FITLQagahCo5CB+EIDRkFQCQAACgoiiKoigKEBqyCgDIAAAQQFEUx3EcyZEcybEcCwgNWQUAAAEACAAAoEiKpEiO5EiSJFmSJVmSJVmS5omqLMuyLMuyLMsyEBqyCgBIAABQUQxFcRQHCA1ZBQBkAAAIoDiKpViKpWiK54iOCISGrAIAgAAABAAAEDRDUzxHlETPVFXXtm3btm3btm3btm3btm1blmUZCA1ZBQBAAAAQ0mlmqQaIMAMZBkJDVgEACAAAgBGKMMSA0JBVAABAAACAGEoOogmtOd+c46BZDppKsTkdnEi1eZKbirk555xzzsnmnDHOOeecopxZDJoJrTnnnMSgWQqaCa0555wnsXnQmiqtOeeccc7pYJwRxjnnnCateZCajbU555wFrWmOmkuxOeecSLl5UptLtTnnnHPOOeecc84555zqxekcnBPOOeecqL25lpvQxTnnnE/G6d6cEM4555xzzjnnnHPOOeecIDRkFQAABABAEIaNYdwpCNLnaCBGEWIaMulB9+gwCRqDnELq0ehopJQ6CCWVcVJKJwgNWQUAAAIAQAghhRRSSCGFFFJIIYUUYoghhhhyyimnoIJKKqmooowyyyyzzDLLLLPMOuyssw47DDHEEEMrrcRSU2011lhr7jnnmoO0VlprrbVSSimllFIKQkNWAQAgAAAEQgYZZJBRSCGFFGKIKaeccgoqqIDQkFUAACAAgAAAAABP8hzRER3RER3RER3RER3R8RzPESVREiVREi3TMjXTU0VVdWXXlnVZt31b2IVd933d933d+HVhWJZlWZZlWZZlWZZlWZZlWZYgNGQVAAACAAAghBBCSCGFFFJIKcYYc8w56CSUEAgNWQUAAAIACAAAAHAUR3EcyZEcSbIkS9IkzdIsT/M0TxM9URRF0zRV0RVdUTdtUTZl0zVdUzZdVVZtV5ZtW7Z125dl2/d93/d93/d93/d93/d9XQdCQ1YBABIAADqSIymSIimS4ziOJElAaMgqAEAGAEAAAIriKI7jOJIkSZIlaZJneZaomZrpmZ4qqkBoyCoAABAAQAAAAAAAAIqmeIqpeIqoeI7oiJJomZaoqZoryqbsuq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq4LhIasAgAkAAB0JEdyJEdSJEVSJEdygNCQVQCADACAAAAcwzEkRXIsy9I0T/M0TxM90RM901NFV3SB0JBVAAAgAIAAAAAAAAAMybAUy9EcTRIl1VItVVMt1VJF1VNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVN0zRNEwgNWQkAkAEAkBBTLS3GmgmLJGLSaqugYwxS7KWxSCpntbfKMYUYtV4ah5RREHupJGOKQcwtpNApJq3WVEKFFKSYYyoVUg5SIDRkhQAQmgHgcBxAsixAsiwAAAAAAAAAkDQN0DwPsDQPAAAAAAAAACRNAyxPAzTPAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABA0jRA8zxA8zwAAAAAAAAA0DwP8DwR8EQRAAAAAAAAACzPAzTRAzxRBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABA0jRA8zxA8zwAAAAAAAAAsDwP8EQR0DwRAAAAAAAAACzPAzxRBDzRAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAEOAAABBgIRQasiIAiBMAcEgSJAmSBM0DSJYFTYOmwTQBkmVB06BpME0AAAAAAAAAAAAAJE2DpkHTIIoASdOgadA0iCIAAAAAAAAAAAAAkqZB06BpEEWApGnQNGgaRBEAAAAAAAAAAAAAzzQhihBFmCbAM02IIkQRpgkAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAGHAAAAgwoQwUGrIiAIgTAHA4imUBAIDjOJYFAACO41gWAABYliWKAABgWZooAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAYcAAACDChDBQashIAiAIAcCiKZQHHsSzgOJYFJMmyAJYF0DyApgFEEQAIAAAocAAACLBBU2JxgEJDVgIAUQAABsWxLE0TRZKkaZoniiRJ0zxPFGma53meacLzPM80IYqiaJoQRVE0TZimaaoqME1VFQAAUOAAABBgg6bE4gCFhqwEAEICAByKYlma5nmeJ4qmqZokSdM8TxRF0TRNU1VJkqZ5niiKommapqqyLE3zPFEURdNUVVWFpnmeKIqiaaqq6sLzPE8URdE0VdV14XmeJ4qiaJqq6roQRVE0TdNUTVV1XSCKpmmaqqqqrgtETxRNU1Vd13WB54miaaqqq7ouEE3TVFVVdV1ZBpimaaqq68oyQFVV1XVdV5YBqqqqruu6sgxQVdd1XVmWZQCu67qyLMsCAAAOHAAAAoygk4wqi7DRhAsPQKEhKwKAKAAAwBimFFPKMCYhpBAaxiSEFEImJaXSUqogpFJSKRWEVEoqJaOUUmopVRBSKamUCkIqJZVSAADYgQMA2IGFUGjISgAgDwCAMEYpxhhzTiKkFGPOOScRUoox55yTSjHmnHPOSSkZc8w556SUzjnnnHNSSuacc845KaVzzjnnnJRSSuecc05KKSWEzkEnpZTSOeecEwAAVOAAABBgo8jmBCNBhYasBABSAQAMjmNZmuZ5omialiRpmud5niiapiZJmuZ5nieKqsnzPE8URdE0VZXneZ4oiqJpqirXFUXTNE1VVV2yLIqmaZqq6rowTdNUVdd1XZimaaqq67oubFtVVdV1ZRm2raqq6rqyDFzXdWXZloEsu67s2rIAAPAEBwCgAhtWRzgpGgssNGQlAJABAEAYg5BCCCFlEEIKIYSUUggJAAAYcAAACDChDBQashIASAUAAIyx1lprrbXWQGettdZaa62AzFprrbXWWmuttdZaa6211lJrrbXWWmuttdZaa6211lprrbXWWmuttdZaa6211lprrbXWWmstpZRSSimllFJKKaWUUkoppZRSSgUA+lU4APg/2LA6wknRWGChISsBgHAAAMAYpRhzDEIppVQIMeacdFRai7FCiDHnJKTUWmzFc85BKCGV1mIsnnMOQikpxVZjUSmEUlJKLbZYi0qho5JSSq3VWIwxqaTWWoutxmKMSSm01FqLMRYjbE2ptdhqq7EYY2sqLbQYY4zFCF9kbC2m2moNxggjWywt1VprMMYY3VuLpbaaizE++NpSLDHWXAAAd4MDAESCjTOsJJ0VjgYXGrISAAgJACAQUooxxhhzzjnnpFKMOeaccw5CCKFUijHGnHMOQgghlIwx5pxzEEIIIYRSSsaccxBCCCGEkFLqnHMQQgghhBBKKZ1zDkIIIYQQQimlgxBCCCGEEEoopaQUQgghhBBCCKmklEIIIYRSQighlZRSCCGEEEIpJaSUUgohhFJCCKGElFJKKYUQQgillJJSSimlEkoJJYQSUikppRRKCCGUUkpKKaVUSgmhhBJKKSWllFJKIYQQSikFAAAcOAAABBhBJxlVFmGjCRcegEJDVgIAZAAAkKKUUiktRYIipRikGEtGFXNQWoqocgxSzalSziDmJJaIMYSUk1Qy5hRCDELqHHVMKQYtlRhCxhik2HJLoXMOAAAAQQCAgJAAAAMEBTMAwOAA4XMQdAIERxsAgCBEZohEw0JweFAJEBFTAUBigkIuAFRYXKRdXECXAS7o4q4DIQQhCEEsDqCABByccMMTb3jCDU7QKSp1IAAAAAAADADwAACQXAAREdHMYWRobHB0eHyAhIiMkAgAAAAAABcAfAAAJCVAREQ0cxgZGhscHR4fICEiIyQBAIAAAgAAAAAggAAEBAQAAAAAAAIAAAAEBE9nZ1MABIAWAAAAAAAA/Jg2YgIAAADYOe7ODzYz3dLLKCknJy4pMTPW2TTfw+Ng0nwPj4PJrVRCJiQlhcYajKg0TRNtt3uGkKbTabTd1699a236fV6dThNULcM3Bl9kJkzxF0uHpviLpUPbrCQ5I7aq6exg2LRNj25Vk8eETlWPrsb5bEpTUU23+Saz5ah0oDfhKZpZ5eHVDqAFQr4Ih6aZVR5e7ABaIMSVcKhh+pGyWierNdVARrs92cbgLLYpxmLODahYhBQxxloFUTVWxO7gaDdsDjZHwTAxqqkebY9up9u0VSpt002bNhWpGOHn5UvDlatXlm9GhkF6jl9eXphbqQq+Xq/P5dyhVSpt06abarpNt+m6KKC1Ctyp+exB2fvq1SED87II3a/+mZfzBTYEO//ANyMiQBM9/4X0GokqvSy0yk7qEKA1ULbeppruUkWBzL3LIwj4QzINM9O686/b2aF6jhaK0YvCJw6CAlQBfulEepvLmpiaB9JaOi6dSG9z2Sam5kJaS8c5LGbD0QnOyrGqCkBCwjhiI3FhGCpwALGJ4JiwJYlaEUfjwiAIcBDrIBJgoajiDQKQCd6s8JbhHymba5hPgW7qakeV8/1lPDQgBCaybIRWiurrBZ1oVjZtrAwrrKDTq+hNZTh7XU2wVIBYZYE7gyW0YkA44G4R4RduEdMkfcwbQ0TiytC/NvteAaBHsRbcbqMAgd2LqS5c02vy3FtyrdqdVqp6iGxMcUsDTkEWj21U2JUkqa3d1UsDlrhEeulXc1GU+MIYa4kkLpFe+tVcFCW+MMZaIp/MIhVltTYKGXJTsgbLsjyAZeWKVbkAGEGNiFoxVqxVsdjtatiwiKMDDoZWuj3bapSWbqVHJ41WEUpJhMjvESFoRUoryOCSPqgdUm2AnjhFQH4yABPiGm7d5k7PFJVoVMphTZunmoR6yMfVxZamGGURSYmQvzF7Pfrz18/vQUaAjF4krrtCFitjODNajX0BMRx0AXyUXSlni+12dwtUpwPwY8E0tH8HhHTYg92HEgDszinR9nfnlGj76+pERgiIIQQaRa0VrK8WWnQrUQzvANmF6pV81zcI/NIxm/f2l47ZvLerqSfJhCokVtWqUcPKLf32leJinqSGqF8p6VHoWQAM1/Rt/nBN3+Z/AAimbAEw0RqkTqtDSkdJTb98JYgSXvdDuAWThygU3eD9CEU3aL/AA8AKtEjAzEL6erTWKB2GAgmrXlLyKvzUUrnkjAC0ThWhMzKjdaoaOVOWbp0CkZIKpqZosxqSi6vmTDBaV+p6J4XWkGBkxWabrlYAFNcQeaG4avaFo55qhgQpAkCaWC1rFhNI0lB0+0dtwVlFYRi6Iknabk8U3xemi4vvC/OhW1dEYChFAIggaoxIp4lqu922oLrd61cexNvyxuArJQ6uq2mrW0kBHOVX9jju1lF+ZY/jrlbFklgSAJvNwcFwNLj1J0IhL6yur9bXPUrxqnLoX43Bq/i7Tai02vjkxNG3fU1oC+FUS7TxyYmzb2tNBCtqLdG3QkS9FVkR1Zo0yXI2d4TFXKyqAiCqRhQ1qiLWWsUSKkgkNHHxiSQe1yPEORJqSL3FR2pJIXF5MzuyaJmDnwgzUfONAotR/+6ePn4JUNJRYVYQsmTEELgxAFCAa2BBVrQWrbQsvf3jRcwqs68gUaxKMOApeWuSsU9yQv9UlJsuoRiUMnR4sDisu2ysntW0sCYSNmZEi5POB4AulHvuDjsh1hgQl4OBTJ4Tk2uD7b1di7CdBCDs6ajhCnfcDv64dPNeXltBPlrpsBhqCR+XblrLazOItzYrlqEW8SwYMzk6VBJjsaoqAGFMfIQwJr7a+IiRZQ3GDDc0BGgeiAZWbIJEE8QGpR6JjYkG4bIuFljhgmVepqOLVTwvdWJxcXERqhh5dCQe3cSxAkksy3IQygBkoPGSQIJlWZZRtFJ8pWiyACWXXDJdZVpNXq9C3GcBJNtbFmp9SZ6fnvsFi+wJE7qZ7bZYxX/AeDzrCixhEcr96mBpzzY7RavA0qZV2PXKc4aMsgQgLFnylAowUGlbAObKXbd5pgA=";
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

const MODIFIER_FAMILIES: Array<{ modifier: string; ids: string[] }> = [
  { modifier: "Alt", ids: ["lalt", "ralt"] },
  { modifier: "Control", ids: ["lctrl"] },
  { modifier: "Shift", ids: ["lshift", "rshift"] },
  { modifier: "Meta", ids: ["lwin", "rwin"] },
];

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
