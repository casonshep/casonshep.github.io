"use client";

import { pokemonIdNamed } from "./pokedex";
import { randomDexId } from "./roster";
import { MAX_NAME, SHINY_SUFFIX, parseName } from "./usePresence";

// Slash commands typed into the chat composer. Anything that does not start
// with "/" is just a message; anything that does lands here instead of on
// everyone's screen.
//
// Emotes are the interesting case. Positions are simulated per client and
// never broadcast, so a purely local dance would be a dance only its owner
// could see. Instead an emote *is* the message: `/dance` publishes the
// literal token, every client recognises it and animates that sprite rather
// than drawing a bubble, and the broadcast, the 7-second life and the
// "stand still while saying something" rule all come free.

/** Messages that render as an animation instead of as a speech bubble. The
 *  keys double as the command names; `verb` is how the chat log narrates it
 *  ("cason dances"), since an animation leaves no text behind. */
export const EMOTES = {
  "/dance": { className: "emote-dance", verb: "dances" },
} as const;

export type Emote = keyof typeof EMOTES;

export const isEmote = (message: string | null): message is Emote =>
  !!message && message in EMOTES;

/** What a command can reach. Deliberately narrow: everything here is
 *  already owned by `usePresence` or by the page above it. */
export type CommandContext = {
  name: string;
  setName: (name: string) => void;
  setAvatarId: (id: number) => void;
  say: (text: string) => void;
  /** Write lines into the chat log, seen only by whoever ran the command.
   *  Nothing printed here is broadcast. */
  print: (...lines: string[]) => void;
  /** Global key-sound mute, for `/mute`. */
  muted: boolean;
  setMuted: (muted: boolean) => void;
};

export type Command = {
  name: string;
  help: string;
  /** `arg` is everything after the command word, trimmed — empty for the
   *  commands that take none. Returns a line to show the sender, or nothing
   *  when the effect speaks for itself. Nothing is broadcast unless the
   *  command says so. */
  run: (ctx: CommandContext, arg: string) => string | void;
};

/** Keep the shiny suffix attached across a rename, and stay inside the
 *  length `setName` will truncate to. */
function withShiny(display: string, shiny: boolean) {
  if (!shiny) return display.slice(0, MAX_NAME);
  return `${display.slice(0, MAX_NAME - SHINY_SUFFIX.length)}${SHINY_SUFFIX}`;
}

export const COMMANDS: readonly Command[] = [
  {
    name: "/help",
    help: "this list",
    run: (ctx) => ctx.print(...helpLines()),
  },
  {
    name: "/name",
    help: "call yourself something else — /name ash",
    run: (ctx, arg) => {
      const { display, shiny } = parseName(ctx.name);
      if (!arg) return display ? `you are ${display}` : "usage: /name ash";
      // Report what was actually stored, not what was typed: a long name
      // gets truncated to fit (further still when the shiny suffix has to
      // fit beside it), and a hint that echoed the request back would hide
      // that it had been cut.
      const stored = withShiny(arg, shiny);
      ctx.setName(stored);
      return `now known as ${parseName(stored).display}`;
    },
  },
  {
    name: "/shiny",
    help: "toggle your shiny palette",
    run: (ctx) => {
      const { display, shiny } = parseName(ctx.name);
      if (shiny) {
        ctx.setName(display);
        return;
      }
      // setName truncates at MAX_NAME, and a name long enough to eat the
      // suffix would leave "…/shin" — no longer a match, so the toggle
      // would look like it did nothing at all.
      if (display.length + SHINY_SUFFIX.length > MAX_NAME)
        return `name too long to go shiny — ${MAX_NAME - SHINY_SUFFIX.length} characters max`;
      ctx.setName(withShiny(display, true));
    },
  },
  {
    name: "/random",
    help: "become someone else at random",
    run: (ctx) => ctx.setAvatarId(randomDexId()),
  },
  {
    name: "/dance",
    help: "everyone watches you dance",
    run: (ctx) => ctx.say("/dance"),
  },
  {
    name: "/mute",
    help: "mute (or unmute) the keyboard",
    run: (ctx) => {
      ctx.setMuted(!ctx.muted);
      return ctx.muted ? "keyboard unmuted" : "keyboard muted";
    },
  },
];

/** The command list as `/help` prints it. Generated, so a command added to
 *  the table above documents itself. */
export function helpLines() {
  return [
    ...COMMANDS.map((c) => `${c.name} — ${c.help}`),
    "/<pokémon> — become any of them, e.g. /eevee, /mimikyu",
  ];
}

export type CommandResult =
  /** Handled; `hint` is an optional line for the sender only. */
  | { kind: "ran"; hint?: string }
  /** Not a command at all — say it out loud instead. */
  | { kind: "unknown"; hint: string };

/** Run `text` if it is a command. Callers check `kind` to decide whether to
 *  close the composer (ran) or leave it open with the hint (unknown). */
export function runCommand(text: string, ctx: CommandContext): CommandResult {
  // First word is the command, the rest is its argument — `/name` is the
  // only one that reads it so far.
  const trimmed = text.trim();
  const split = trimmed.indexOf(" ");
  const word = (split === -1 ? trimmed : trimmed.slice(0, split)).toLowerCase();
  const arg = split === -1 ? "" : trimmed.slice(split + 1).trim();

  const command = COMMANDS.find((c) => c.name === word);
  if (command) return { kind: "ran", hint: command.run(ctx, arg) || undefined };

  // `/pikachu` and friends: every name on the dex is its own command, which
  // is why the picker only has to offer ten. The whole line is tried as a
  // fallback so the handful of two-word names — "/mr mime", "/mime jr" —
  // survive being split on their space.
  const dexId =
    pokemonIdNamed(word.slice(1)) ?? pokemonIdNamed(trimmed.slice(1));
  if (dexId) {
    ctx.setAvatarId(dexId);
    return { kind: "ran" };
  }

  return { kind: "unknown", hint: `no such command — try /help` };
}
