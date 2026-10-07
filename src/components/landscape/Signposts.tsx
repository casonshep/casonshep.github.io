"use client";

import { Text } from "@react-three/drei";
import { SECTIONS } from "./sections";
import type { Vec3 } from "./types";
import { WORLD } from "./worldConfig";

// A ring of arrow posts around spawn, one per section, each standing on the
// side of the ring its section lies and pointing out toward it. Plain meshes
// with no RigidBody, so inside <Physics> they get no collider: the player
// walks straight through them.

const POST = {
  /** Distance of each post from spawn, metres. */
  ring: 4,
  /** Pole height and the board's height on it. */
  height: 1.9,
  boardY: 1.55,
  /** Board length, height, thickness; the arrowhead sits past its end. */
  board: [1.5, 0.36, 0.06] as Vec3,
  head: 0.3,
  /** Alternate boards step down this much so neighbours don't touch. */
  stagger: 0.32,
  wood: "#f5ecd7",
  pole: "#8a6a4a",
  ink: "#24324a",
  labelSize: 0.2,
} as const;

function Signpost({ label, color, target, index }: {
  label: string;
  color: string;
  target: Vec3;
  index: number;
}) {
  const dx = target[0] - WORLD.spawn[0];
  const dz = target[2] - WORLD.spawn[2];
  // Board's local +x points at the target.
  const yaw = Math.atan2(-dz, dx);
  const along = Math.hypot(dx, dz) || 1;
  const at: Vec3 = [
    WORLD.spawn[0] + (dx / along) * POST.ring,
    0,
    WORLD.spawn[2] + (dz / along) * POST.ring,
  ];
  const [bw, bh, bt] = POST.board;
  const y = POST.boardY - (index % 2) * POST.stagger;

  return (
    <group position={at} rotation={[0, yaw, 0]}>
      <mesh position={[0, POST.height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, POST.height, 5]} />
        <meshStandardMaterial color={POST.pole} flatShading />
      </mesh>

      {/* Board, offset forward so the pole sits near its tail. */}
      <group position={[bw / 2 - 0.2, y, 0]}>
        <mesh castShadow>
          <boxGeometry args={[bw, bh, bt]} />
          <meshStandardMaterial color={POST.wood} flatShading />
        </mesh>
        <mesh position={[bw / 2 + POST.head / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0, bh * 0.85, POST.head, 3]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {/* Colour tab at the tail, so a post matches its block from afar. */}
        <mesh position={[-bw / 2 + 0.08, 0, 0]}>
          <boxGeometry args={[0.16, bh + 0.02, bt + 0.02]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {/* Label on both faces; the back one is turned so it isn't mirrored. */}
        <Text
          position={[0.05, 0, bt / 2 + 0.005]}
          fontSize={POST.labelSize}
          color={POST.ink}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
        <Text
          position={[0.05, 0, -bt / 2 - 0.005]}
          rotation={[0, Math.PI, 0]}
          fontSize={POST.labelSize}
          color={POST.ink}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    </group>
  );
}

/** Arrows near spawn pointing toward each section. */
export default function Signposts() {
  return (
    <>
      {SECTIONS.map((section, i) => (
        <Signpost
          key={section.id}
          label={section.title}
          color={section.color ?? POST.wood}
          target={section.position}
          index={i}
        />
      ))}
    </>
  );
}
