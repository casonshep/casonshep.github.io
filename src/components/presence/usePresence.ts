"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { randomAvatarId } from "./roster";

// Who else has this page open. Supabase Realtime "presence": every client
// joins one channel and tracks a small payload; the server keeps the roster
// and pushes a sync whenever anyone joins or leaves. No table, no writes.

export const PRESENCE = {
  /** Channel name. Everyone on this name sees each other, so it doubles as
   *  the room: change it and you get a separate lobby. */
  room: "cason-site-presence",
  /** localStorage key for the avatar choice (per browser, per person). */
  storageKey: "presence.avatar",
  /** sessionStorage key for this tab's identity — see `tabId` below. */
  tabKey: "presence.tab",
} as const;

/** One visitor's tracked payload. */
export type Peer = {
  /** Presence key: unique per tab, so two windows are two Pokémon. */
  key: string;
  avatarId: number;
  /** ms since epoch, so the bar can order by arrival instead of by hash. */
  joinedAt: number;
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
    realtime: { params: { eventsPerSecond: 4 } },
  });
  return client;
}

/** This tab's presence key. sessionStorage (not localStorage) is the point:
 *  it survives a reload but is unique per tab, which is what makes "every
 *  open window adds a Pokémon" true. */
function tabId() {
  try {
    const found = sessionStorage.getItem(PRESENCE.tabKey);
    if (found) return found;
    const made = crypto.randomUUID();
    sessionStorage.setItem(PRESENCE.tabKey, made);
    return made;
  } catch {
    // Private mode or blocked storage: a fresh id each load is fine.
    return crypto.randomUUID();
  }
}

/** The stored choice, or a random one — which is then written back, so a
 *  visitor who never opens the picker still keeps the same Pokémon across
 *  reloads instead of being reshuffled every visit. */
function readAvatar() {
  try {
    const raw = localStorage.getItem(PRESENCE.storageKey);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n)) return n;
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
  } | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const avatarId = session?.avatarId ?? null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({ avatarId: readAvatar(), joinedAt: Date.now() });
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
      }>();
      const next: Peer[] = [];
      for (const [key, metas] of Object.entries(state)) {
        const meta = metas[0];
        if (!meta) continue;
        next.push({ key, avatarId: meta.avatarId, joinedAt: meta.joinedAt });
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

  // Republish when the choice changes, without re-subscribing.
  useEffect(() => {
    if (session) channelRef.current?.track(session);
  }, [session]);

  const setAvatarId = useCallback((id: number) => {
    setSession((s) => (s ? { ...s, avatarId: id } : s));
    try {
      localStorage.setItem(PRESENCE.storageKey, String(id));
    } catch {
      // Not being able to remember the choice is not worth failing over.
    }
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
    connected,
  };
}
