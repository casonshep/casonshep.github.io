"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { isRosterId, randomAvatarId } from "./roster";

// Who else has this page open. Supabase Realtime "presence": every client
// joins one channel and tracks a small payload; the server keeps the roster
// and pushes a sync whenever anyone joins or leaves. No table, no writes.

export const PRESENCE = {
  /** Channel name. Everyone on this name sees each other, so it doubles as
   *  the room: change it and you get a separate lobby. */
  room: "cason-site-presence",
  /** localStorage key for the avatar choice (per browser, per person). */
  storageKey: "presence.avatar",
  /** localStorage key for the display name. */
  nameKey: "presence.name",
} as const;

/** How long a chat bubble stays up, ms. The sender clears its own message
 *  when this elapses, so the bubble disappears everywhere at once and no
 *  receiver has to reason about another machine's clock. */
export const MESSAGE_TTL = 7000;
/** Longest message accepted, characters. */
export const MAX_MESSAGE = 140;
/** Longest name as typed, characters. Roomy enough that the shiny suffix
 *  below still leaves a usable name. */
export const MAX_NAME = 24;

/** Type your name with this on the end and your sprite turns shiny. The
 *  suffix rides along inside `name` rather than as its own presence field:
 *  every client parses the same string, so there is nothing extra to keep
 *  in sync, and the suffix itself is stripped before the name is drawn. */
export const SHINY_SUFFIX = "/shiny";

export type ParsedName = { display: string; shiny: boolean };

export function parseName(raw: string): ParsedName {
  const name = (raw ?? "").trim();
  if (name.toLowerCase().endsWith(SHINY_SUFFIX))
    return { display: name.slice(0, -SHINY_SUFFIX.length).trim(), shiny: true };
  return { display: name, shiny: false };
}

/** One visitor's tracked payload. */
export type Peer = {
  /** Presence key: unique per tab, so two windows are two Pokémon. */
  key: string;
  avatarId: number;
  /** ms since epoch, so the bar can order by arrival instead of by hash. */
  joinedAt: number;
  /** Chosen display name, or "" if they never set one. */
  name: string;
  /** What they last said, while it is still on screen. */
  message: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Configured only when both build-time vars are present. Without them the
 *  bar still works — you just see yourself. */
export const isConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
function getClient() {
  if (!isConfigured) return null;
  // One client for the tab; createClient opens a socket, so don't make it
  // per-render.
  client ??= createClient(url!, anonKey!, {
    auth: { persistSession: false },
  });
  return client;
}

/** This tab's presence key: minted per page load and never persisted.
 *
 *  It lived in sessionStorage first, so a reload kept the same key — but
 *  duplicating a tab copies sessionStorage, and the copy then shared the
 *  original's key and collapsed into a single sprite. Nothing visible is
 *  tied to this id (the avatar and name come from localStorage), so an
 *  in-memory value costs nothing and makes every tab distinct however it
 *  was opened. On reload the old entry clears as soon as the socket
 *  closes, so the stale sprite does not linger. */
function tabId() {
  return crypto.randomUUID();
}

/** The stored choice, or a random one — which is then written back, so a
 *  visitor who never opens the picker still keeps the same Pokémon across
 *  reloads instead of being reshuffled every visit. */
function readName() {
  try {
    return (localStorage.getItem(PRESENCE.nameKey) ?? "").slice(0, MAX_NAME);
  } catch {
    return "";
  }
}

function readAvatar() {
  try {
    const raw = localStorage.getItem(PRESENCE.storageKey);
    const n = raw ? Number(raw) : NaN;
    // Re-roll rather than trust the stored id: it may name a Pokémon that
    // has since been curated off the roster.
    if (Number.isFinite(n) && isRosterId(n)) return n;
    const picked = randomAvatarId();
    localStorage.setItem(PRESENCE.storageKey, String(picked));
    return picked;
  } catch {
    // Storage blocked: a fresh pick each load is the best we can do.
    return randomAvatarId();
  }
}

export type Presence = {
  /** Everyone currently here, this tab included, oldest first. */
  peers: Peer[];
  /** This tab's presence key, so the bar can mark which sprite is you. */
  me: string;
  avatarId: number;
  setAvatarId: (id: number) => void;
  /** Your display name, "" until you set one. */
  name: string;
  setName: (name: string) => void;
  /** Say something: shows over your sprite for everyone, then clears. */
  say: (text: string) => void;
  /** False until the channel is live (or forever, if unconfigured). */
  connected: boolean;
};

export function usePresence(): Presence {
  const [me] = useState(() => (typeof window === "undefined" ? "" : tabId()));
  // Established in an effect, not during render: reading storage on the
  // server would break the static export, and a random default would
  // mismatch on hydrate. Null until then, which is the bar's "not ready".
  const [session, setSession] = useState<{
    avatarId: number;
    joinedAt: number;
    name: string;
    message: string | null;
  } | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clearTimer = useRef(0);
  const avatarId = session?.avatarId ?? null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({
      avatarId: readAvatar(),
      joinedAt: Date.now(),
      name: readName(),
      message: null,
    });
    return () => window.clearTimeout(clearTimer.current);
  }, []);

  useEffect(() => {
    if (!session) return;
    const supabase = getClient();
    if (!supabase) return;

    const channel = supabase.channel(PRESENCE.room, {
      config: { presence: { key: me } },
    });
    channelRef.current = channel;

    // presenceState() is keyed by presence key; each entry is an array of
    // metas (one per track() call). We track once, so take the first.
    const sync = () => {
      const state = channel.presenceState<{
        avatarId: number;
        joinedAt: number;
        name?: string;
        message?: string | null;
      }>();
      const next: Peer[] = [];
      for (const [key, metas] of Object.entries(state)) {
        const meta = metas[0];
        if (!meta) continue;
        next.push({
          key,
          avatarId: meta.avatarId,
          joinedAt: meta.joinedAt,
          name: meta.name ?? "",
          message: meta.message ?? null,
        });
      }
      next.sort((a, b) => a.joinedAt - b.joinedAt || a.key.localeCompare(b.key));
      setPeers(next);
    };

    channel.on("presence", { event: "sync" }, sync);
    channel.subscribe((status) => {
      const live = status === "SUBSCRIBED";
      setConnected(live);
      if (live) channel.track(session);
    });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
    // Keyed on whether we have a session at all, not on its contents: an
    // avatar change must not tear the socket down. The effect below pushes
    // the new payload over the live channel instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, session !== null]);

  // Republish when anything about us changes, without re-subscribing.
  // Debounced: `name` updates on every keystroke, and tracking each one
  // would be a realtime message per character — enough to hit the client's
  // event rate limit while someone types their name.
  useEffect(() => {
    if (!session) return;
    const t = window.setTimeout(() => {
      channelRef.current?.track(session);
    }, 200);
    return () => window.clearTimeout(t);
  }, [session]);

  const setAvatarId = useCallback((id: number) => {
    setSession((s) => (s ? { ...s, avatarId: id } : s));
    try {
      localStorage.setItem(PRESENCE.storageKey, String(id));
    } catch {
      // Not being able to remember the choice is not worth failing over.
    }
  }, []);

  const setName = useCallback((raw: string) => {
    const name = raw.trim().slice(0, MAX_NAME);
    setSession((s) => (s ? { ...s, name } : s));
    try {
      localStorage.setItem(PRESENCE.nameKey, name);
    } catch {
      // As above.
    }
  }, []);

  const say = useCallback((raw: string) => {
    const message = raw.trim().slice(0, MAX_MESSAGE);
    if (!message) return;
    setSession((s) => (s ? { ...s, message } : s));
    // We clear our own bubble rather than letting each receiver time it
    // out, so it vanishes for everyone at the same moment.
    window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => {
      setSession((s) => (s ? { ...s, message: null } : s));
    }, MESSAGE_TTL);
  }, []);

  // Unconfigured, or not connected yet: show just this tab, so the bar and
  // the picker are still usable on localhost.
  const resolved =
    peers.length > 0 || !session ? peers : [{ key: me, ...session }];

  return {
    peers: resolved,
    me,
    avatarId: avatarId ?? 0,
    setAvatarId,
    name: session?.name ?? "",
    setName,
    say,
    connected,
  };
}
