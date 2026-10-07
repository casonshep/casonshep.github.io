"use client";

import { RigidBody } from "@react-three/rapier";
import { WORLD } from "./worldConfig";

/** The floor. Stub: a flat slab with a fixed collider. */
export default function Ground() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[WORLD.groundSize, 1, WORLD.groundSize]} />
        <meshStandardMaterial color="#9ed98a" />
      </mesh>
    </RigidBody>
  );
}
