"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { WORLD } from "./worldConfig";

/** Wall height: well over anything a jump can reach. */
const HEIGHT = 20;
const THICKNESS = 1;

/** Invisible walls around the play area, so nobody walks off into the fog. */
export default function Bounds() {
  const half = WORLD.groundSize / 2;
  const h = HEIGHT / 2;
  const t = THICKNESS / 2;
  // Each wall is long enough to overlap its neighbours at the corners.
  const len = half + THICKNESS;
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[len, h, t]} position={[0, h, -half - t]} />
      <CuboidCollider args={[len, h, t]} position={[0, h, half + t]} />
      <CuboidCollider args={[t, h, len]} position={[-half - t, h, 0]} />
      <CuboidCollider args={[t, h, len]} position={[half + t, h, 0]} />
    </RigidBody>
  );
}
