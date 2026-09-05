"use client";

import { useRef } from "react";
import type { KeyboardController } from "../keyboard/Keyboard";
import DarkRoom from "./DarkRoom";
import PresenceBar from "../presence/PresenceBar";
import TypedNav from "./TypedNav";

/** The whole page: the room, the nav that types itself on the keyboard,
 *  and the bar of everyone else who has it open. */
export default function Site() {
  const controller = useRef<KeyboardController | null>(null);
  return (
    <>
      <DarkRoom
        onController={(c) => {
          controller.current = c;
        }}
      />
      <TypedNav controller={controller} />
      <PresenceBar />
    </>
  );
}
