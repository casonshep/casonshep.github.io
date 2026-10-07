"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Flat, LIFT, Rule, Slab, rowOffsets } from "./Flat";
import { COLUMN, FONT, INK } from "./theme";
import { WORLD } from "./worldConfig";

// The page itself: a dark slab floating in the void, with the site's chrome
// printed on it — a pill nav at the top left and a couple of links at the
// right, and an ornamented footer at the bottom. Nothing fences it in; walk
// off a side and you fall, and Player puts you back at spawn.
//
// What the page *says* lives in sections.ts and Layout.tsx; this file only
// draws the frame around it. The nav and footer are print, not links.

const NAV = ["cason", "writing", "projects", "art", "say hi"];
const NAV_RIGHT = ["github", "email", "text version"];

const { width, top, bottom, thickness } = WORLD.page;
const length = top - bottom;
const midZ = (top + bottom) / 2;
const half = width / 2;

/** The header row's centre line. */
const HEADER_Z = top - 2.4;

function Header() {
  const size = 0.42;
  // Mono-ish spacing estimate for the pill's width; the nav is in sans.
  const advance = size * 0.56;
  const gap = 1.1;
  const words = NAV.map((w) => w.length * advance);
  const pad = 0.8;
  const pillW = words.reduce((a, b) => a + b, 0) + gap * (NAV.length - 1) + pad * 2;
  const left = -COLUMN;
  const xs = rowOffsets(words, left + pad, gap);
  return (
    <>
      <Slab w={pillW} d={1.3} h={0.06} r={0.4} color={INK.rule} position={[left + pillW / 2, 0, HEADER_Z]} />
      <Slab
        w={pillW - 0.06}
        d={1.24}
        h={0.07}
        r={0.38}
        color={INK.card}
        position={[left + pillW / 2, 0, HEADER_Z]}
      />
      {NAV.map((label, i) => (
        <Flat
          key={label}
          position={[xs[i], 0.07 + LIFT, HEADER_Z]}
          size={size}
          color={i === 0 ? INK.text : INK.dim}
          anchorY="middle"
        >
          {label}
        </Flat>
      ))}
      <Flat
        position={[COLUMN, LIFT, HEADER_Z]}
        size={size}
        color={INK.faint}
        anchorX="right"
        anchorY="middle"
      >
        {NAV_RIGHT.join("      ")}
      </Flat>
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
