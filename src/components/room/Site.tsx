"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardController } from "../keyboard/Keyboard";
import DarkRoom from "./DarkRoom";
import PresenceBar from "../presence/PresenceBar";
import { parseName, usePresence } from "../presence/usePresence";
import { spriteHue } from "../presence/spriteHue";
import { spriteUrl } from "../presence/roster";
import RoomPanel from "./RoomPanel";
import TypedNav from "./TypedNav";

/** The whole page: the room, the nav that types itself on the keyboard,
 *  and the bar of everyone else who has it open.
 *
 *  Presence lives here because two children need it — the bar draws the
 *  roster, and the room takes its colour from your own pick. The open panel
 *  lives here for the same reason: the nav raises it, and so does /help. */
export default function Site() {
  const controller = useRef<KeyboardController | null>(null);
  const presence = usePresence();
  const [tint, setTint] = useState<number | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  // The nav buttons and the panel share one wrapper so a click on the open
  // item counts as *inside*: closing on pointerdown and reopening on the
  // click that follows would only flicker.
  const navRoot = useRef<HTMLDivElement>(null);

  const closePanel = useCallback(() => setPanel(null), []);
  const togglePanel = useCallback(
    (id: string) => setPanel((cur) => (cur === id ? null : id)),
    [],
  );

  useEffect(() => {
    if (!panel) return;
    const onDown = (e: PointerEvent) => {
      if (!navRoot.current?.contains(e.target as Node)) setPanel(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [panel]);

  // Your sprite's dominant hue, read off its pixels once per avatar — the
  // shiny palette when you are shiny, so the room matches what is drawn.
  const { avatarId } = presence;
  const shiny = parseName(presence.name).shiny;
  useEffect(() => {
    if (!avatarId) return;
    let alive = true;
    spriteHue(spriteUrl(avatarId, shiny)).then((hue) => {
      if (alive) setTint(hue);
    });
    return () => {
      alive = false;
    };
  }, [avatarId, shiny]);

  return (
    <>
      <DarkRoom
        tint={tint}
        onController={(c) => {
          controller.current = c;
        }}
      />
      <div ref={navRoot}>
        <TypedNav controller={controller} open={panel} onSelect={togglePanel} />
        <RoomPanel id={panel} onClose={closePanel} />
      </div>
      <PresenceBar presence={presence} />
    </>
  );
}
