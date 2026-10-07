"use client";

import { Joystick, VirtualButton } from "ecctrl/input";
import { JUMP_BUTTON } from "./Player";
import { useIsTouch } from "./useIsTouch";

// ecctrl's DOM joystick (bottom left) and jump button (bottom right), for
// touch devices only. They write to ecctrl's input stores; Player reads
// those every frame. Above the overlay layer so a thumb always lands here.

const Z = "20";
const EDGE = "max(1.25rem, env(safe-area-inset-bottom))";

export default function TouchControls() {
  const touch = useIsTouch();
  if (!touch) return null;
  return (
    <>
      <Joystick
        joystickWrapperStyle={{ left: "0.5rem", bottom: EDGE, zIndex: Z }}
      />
      <VirtualButton
        id={JUMP_BUTTON}
        label="JUMP"
        buttonWrapperStyle={{
          right: "2rem",
          bottom: `calc(${EDGE} + 2.5rem)`,
          width: "76px",
          height: "76px",
          zIndex: Z,
        }}
        buttonCapStyle={{ width: "58px", height: "58px", color: "#5b6b7a" }}
      />
    </>
  );
}
