"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CameraControls,
  CameraControlsImpl,
  useKeyboardControls,
  type KeyboardControlsEntry,
} from "@react-three/drei";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import { EcctrlAnimationStateController } from "ecctrl/animation";
import { useButtonStore, useJoystickStore } from "ecctrl/input";
import Character, { CHARACTER_MODEL } from "./Character";
import { playerState } from "./playerState";
import { useReducedMotion } from "./useReducedMotion";
import { WORLD } from "./worldConfig";

// The player: an ecctrl floating capsule with the character inside it, a
// third-person camera that follows it, and the bridge from keyboard and
// touch input to the controller. ecctrl 2 reads no input on its own — this
// file feeds it every frame through setMovement().

export type Control = "forward" | "backward" | "leftward" | "rightward" | "jump" | "run";

/** Key bindings; Landscape hands these to drei's KeyboardControls. */
export const CONTROLS: KeyboardControlsEntry<Control>[] = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
];

/** The id TouchControls gives its jump button. */
export const JUMP_BUTTON = "jump";

const GRAVITY = 9.81;

const BODY = {
  capsuleHalfHeight: 0.35,
  capsuleRadius: 0.35,
  /** Ground probe radius (ecctrl's default is capsuleRadius / 2). */
  rayRadius: 0.175,
  /** Gap the spring holds between the probe and the ground. */
  floatHeight: 0.15,
  maxWalkVel: 5,
  maxRunVel: 9,
  /** Launch speed for a peak of WORLD.jumpHeight under 1 g (ecctrl only adds
   *  its extra gravity on the way down); +10% because the float spring
   *  drags on the first few centimetres of the rise. */
  jumpVel: Math.sqrt(2 * GRAVITY * WORLD.jumpHeight) * 1.1,
};

/** Capsule centre → ground under the shapeCast probe at rest:
 *  the probe starts capsuleHalfHeight below the centre and settles
 *  rayRadius + floatHeight above contact, contact being rayRadius further. */
const FOOT_OFFSET = BODY.capsuleHalfHeight + 2 * BODY.rayRadius + BODY.floatHeight;

/** A joystick pushed this far counts as running. */
const JOYSTICK_RUN = 0.9;

/** Below this the player has fallen out of the world; put them back. */
const RESPAWN_Y = -20;

const CAMERA = {
  /** Look-at height above the body centre. */
  lookHeight: 0.6,
  /** Spawn view: above and behind (+Z) the player, looking down at the
   *  page the way you'd look at a screen — about 50° below the horizon. */
  offset: [0, 11, 8] as const,
  minDistance: 3,
  maxDistance: 26,
  minPolarAngle: 0.35,
  /** Just above the horizon, so the camera never looks up from underground. */
  maxPolarAngle: 1.4,
  smoothTime: 0.12,
};

function FollowCamera({ ecctrl }: { ecctrl: React.RefObject<EcctrlHandle | null> }) {
  const controls = useRef<CameraControlsImpl>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    // Drag orbits, wheel and pinch zoom; nothing pans the camera off the player.
    const A = CameraControlsImpl.ACTION;
    c.mouseButtons.right = A.NONE;
    c.mouseButtons.middle = A.DOLLY;
    c.touches.two = A.TOUCH_DOLLY;
    c.touches.three = A.NONE;
    const [x, y, z] = WORLD.spawn;
    const [ox, oy, oz] = CAMERA.offset;
    void c.setLookAt(x + ox, y + oy, z + oz, x, y + CAMERA.lookHeight, z, false);
  }, []);

  useFrame(() => {
    const c = controls.current;
    const body = ecctrl.current?.body;
    if (!c || !body) return;
    const p = body.translation();
    // With reduced motion the camera locks to the player instead of easing after it.
    void c.moveTo(p.x, p.y + CAMERA.lookHeight, p.z, !reduced);
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={CAMERA.minDistance}
      maxDistance={CAMERA.maxDistance}
      minPolarAngle={CAMERA.minPolarAngle}
      maxPolarAngle={CAMERA.maxPolarAngle}
      smoothTime={reduced ? 0 : CAMERA.smoothTime}
      draggingSmoothTime={reduced ? 0 : 0.08}
    />
  );
}

export default function Player() {
  const ecctrl = useRef<EcctrlHandle>(null);
  const [, getKeys] = useKeyboardControls<Control>();

  useEffect(() => {
    return () => {
      playerState.ready = false;
    };
  }, []);

  useFrame(() => {
    const handle = ecctrl.current;
    const body = handle?.body;
    if (!handle || !body) return;

    // Keyboard and touch merge here. Every field is sent every frame —
    // setMovement only writes the fields it's given, so a missing one would
    // never release — and the joystick goes as zeros when idle, which is
    // what hands control back to the keys.
    const keys = getKeys();
    const stick = useJoystickStore.getState().joysticks.default;
    const jumpButton = useButtonStore.getState().buttons[JUMP_BUTTON] ?? false;
    const sx = stick?.x ?? 0;
    const sy = stick?.y ?? 0;
    handle.setMovement({
      forward: keys.forward,
      backward: keys.backward,
      leftward: keys.leftward,
      rightward: keys.rightward,
      jump: keys.jump || jumpButton,
      run: keys.run || Math.hypot(sx, sy) > JOYSTICK_RUN,
      joystick: { x: sx, y: sy },
    });

    const p = body.translation();
    if (p.y < RESPAWN_Y) {
      const [x, y, z] = WORLD.spawn;
      body.setTranslation({ x, y, z }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    playerState.position.set(p.x, p.y, p.z);
    playerState.ready = true;
  });

  return (
    <>
      <FollowCamera ecctrl={ecctrl} />
      {CHARACTER_MODEL && <EcctrlAnimationStateController ecctrl={ecctrl} />}
      <Ecctrl
        ref={ecctrl}
        position={WORLD.spawn}
        capsuleHalfHeight={BODY.capsuleHalfHeight}
        capsuleRadius={BODY.capsuleRadius}
        rayRadius={BODY.rayRadius}
        floatHeight={BODY.floatHeight}
        maxWalkVel={BODY.maxWalkVel}
        maxRunVel={BODY.maxRunVel}
        jumpVel={BODY.jumpVel}
        enableToggleRun={false}
      >
        <group position={[0, -FOOT_OFFSET, 0]}>
          <Character />
        </group>
      </Ecctrl>
    </>
  );
}
