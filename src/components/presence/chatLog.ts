"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EMOTES, isEmote } from "./commands";
import { parseName, type Peer } from "./usePresence";

// The scrollback behind the chat console. Presence carries only what each
// visitor is saying *right now* — a message clears itself after seven
// seconds so the bubble vanishes everywhere at once — so anything older has
// to be kept here, by each client, as it goes past.
//
// That means the log starts empty on every load and holds only what this
// tab actually witnessed. Real history (what was said before you arrived,
// or before you reloaded) would need a table to write messages to; presence
// alone has no memory.

/** Lines kept before the oldest are dropped. */
export const MAX_LOG = 200;

export type LogLine = {
  id: number;
  /** say: something a visitor typed. emote: an action, narrated.
   *  system: a reply from a command, seen only by whoever ran it. */
  kind: "say" | "emote" | "system";
  who: string;
  text: string;
  mine: boolean;
};

export function useChatLog(peers: Peer[], me: string) {
  const [lines, setLines] = useState<LogLine[]>([]);
  /** The message already logged for each peer, so a presence resync — which
   *  re-delivers the whole roster, unchanged messages included — doesn't
   *  log the same line twice. Cleared when their message expires, so saying
   *  the same thing twice still gives two lines. */
  const logged = useRef(new Map<string, string>());
  const nextId = useRef(0);

  const push = useCallback((line: Omit<LogLine, "id">) => {
    setLines((prev) => [...prev, { ...line, id: nextId.current++ }].slice(-MAX_LOG));
  }, []);

  /** A line for this visitor only — command replies, mostly. */
  const print = useCallback(
    (...text: string[]) => {
      for (const t of text) push({ kind: "system", who: "", text: t, mine: true });
    },
    [push],
  );

  useEffect(() => {
    const live = new Set<string>();
    for (const peer of peers) {
      live.add(peer.key);
      const message = peer.message;
      if (!message) {
        logged.current.delete(peer.key);
        continue;
      }
      if (logged.current.get(peer.key) === message) continue;
      logged.current.set(peer.key, message);
      const who = parseName(peer.name).display || "someone";
      const mine = peer.key === me;
      if (isEmote(message)) push({ kind: "emote", who, text: EMOTES[message].verb, mine });
      else push({ kind: "say", who, text: message, mine });
    }
    // Whoever has left can say something new if they come back.
    for (const key of logged.current.keys())
      if (!live.has(key)) logged.current.delete(key);
  }, [peers, me, push]);

  return { lines, print };
}
