"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardController } from "../keyboard/Keyboard";
import DarkRoom from "./DarkRoom";
import PresenceBar from "../presence/PresenceBar";
import { usePresence } from "../presence/usePresence";
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

  // Your sprite's dominant hue, read off its pixels once per avatar.
  const { avatarId } = presence;
  useEffect(() => {
    if (!avatarId) return;
    let alive = true;
    spriteHue(spriteUrl(avatarId)).then((hue) => {
      if (alive) setTint(hue);
    });
    return () => {
      alive = false;
    };
  }, [avatarId]);

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
