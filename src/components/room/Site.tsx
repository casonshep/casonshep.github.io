"use client";

import { useRef } from "react";
import type { KeyboardController } from "../keyboard/Keyboard";
import DarkRoom from "./DarkRoom";
import TypedNav from "./TypedNav";

/** The whole page: the room, plus the nav that types itself on the keyboard. */
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
    </>
  );
}
