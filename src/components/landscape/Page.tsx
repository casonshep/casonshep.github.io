"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Flat, LIFT, Rule } from "./Flat";
import { COLUMN, FONT, INK } from "./theme";
import { WORLD } from "./worldConfig";

// The page itself: a sheet of paper floating over the floor, with the
// site's chrome printed on it — the name at the top left, a plain slash-
// separated nav at the right, a rule under them, and an ornamented footer. Nothing fences it in; walk
// off a side and you fall, and Player puts you back at spawn.
//
// What the page *says* lives in sections.ts and Layout.tsx; this file only
// draws the frame around it. The nav and footer are print, not links.

const NAV = ["writing", "projects", "art", "say hi", "github"];

const { width, top, bottom, thickness } = WORLD.page;
const length = top - bottom;
const midZ = (top + bottom) / 2;
const half = width / 2;

/** The header row's centre line. */
const HEADER_Z = top - 2.4;

function Header() {
  const size = 0.4;
  return (
    <>
      <Flat
        position={[-COLUMN, LIFT, HEADER_Z]}
        size={1}
        font={FONT.serif}
        color={INK.text}
        anchorY="middle"
      >
        cason
      </Flat>
      <Flat
        position={[COLUMN, LIFT, HEADER_Z]}
        size={size}
        font={FONT.mono}
        color={INK.dim}
        anchorX="right"
        anchorY="middle"
      >
        {NAV.join("  /  ")}
      </Flat>
      <Rule z={HEADER_Z + 1.2} x0={-COLUMN} x1={COLUMN} />
    </>
  );
}

function Footer() {
  const z = bottom + 7;
  return (
    <>
      <Rule z={z - 2} x0={-COLUMN} x1={COLUMN} />
      <Flat position={[0, LIFT, z]} size={0.5} font={FONT.serif} color={INK.faint} anchorX="center">
        *   *   *
      </Flat>
      <Flat position={[0, LIFT, z + 1.1]} size={1.1} font={FONT.serif} color={INK.dim} anchorX="center">
        finis.
      </Flat>
      <Flat position={[0, LIFT, z + 3]} size={0.34} font={FONT.mono} color={INK.faint} anchorX="center">
        cason · 2026 · walk off the edge to start over
      </Flat>
    </>
  );
}

export default function Page() {
  return (
    <>
      {/* One collider for the slab. */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[half, thickness / 2, length / 2]} position={[0, -thickness / 2, midZ]} />
      </RigidBody>

      {/* The cut edge in a lighter shade, then the page face over it. */}
      <mesh position={[0, -thickness / 2 - 0.001, midZ]}>
        <boxGeometry args={[width, thickness, length]} />
        <meshStandardMaterial color={INK.pageSide} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.0005, midZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color={INK.page} roughness={0.95} />
      </mesh>

      <Header />
      <Footer />
    </>
  );
}
