"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardController } from "../keyboard/Keyboard";
import DarkRoom from "./DarkRoom";
import PresenceBar from "../presence/PresenceBar";
import { parseName, usePresence } from "../presence/usePresence";
import { spriteHue } from "../presence/spriteHue";
import { spriteUrl } from "../presence/roster";
import TypedNav from "./TypedNav";

/** The whole page: the room, the nav that types itself on the keyboard,
 *  and the bar of everyone else who has it open.
 *
 *  Presence lives here because two children need it — the bar draws the
 *  roster, and the room takes its colour from your own pick. */
export default function Site() {
  const controller = useRef<KeyboardController | null>(null);
  const presence = usePresence();
  const [tint, setTint] = useState<number | null>(null);

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
      <TypedNav controller={controller} />
      <PresenceBar presence={presence} />
    </>
  );
}
