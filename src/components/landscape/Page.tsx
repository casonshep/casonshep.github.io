"use client";

import { Grid, Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { WORLD } from "./worldConfig";

// The floor is a web page: a dark slab floating in the void, with a header
// bar along its top edge, hairline dividers between sections, a footer, and
// a glowing rim so you can see where it ends. Nothing fences it in — walk
// off a side and you fall, and Player puts you back at spawn.
//
// What the page *says* lives in sections.ts; this file only draws the
// chrome around it. The header nav and footer are labels, not links.

export const PAGE_LOOK = {
  surface: "#121218",
  /** The glowing rim that shows where the page ends. */
  edge: "#6c7cff",
  headerFill: "#1b1b24",
  grid: "#1c1c26",
  gridMajor: "#2a2a3a",
  ink: "#e6e6ee",
  inkDim: "#7d7d8c",
  /** Flat text face; served locally so the scene needs no font CDN. */
  font: "/fonts/Geist-Regular.ttf",
};

/** Header depth (z) and how far it stands proud of the page. */
const HEADER = { depth: 4.5, rise: 0.12 };
const FOOTER_DEPTH = 6;
/** z of the hairlines between sections, top to bottom (see sections.ts). */
const DIVIDERS = [-19, -47, -66];
const NAV = ["me", "projects", "art", "blog", "contact"];

const { width, top, bottom, thickness } = WORLD.page;
const length = top - bottom;
const midZ = (top + bottom) / 2;
const half = width / 2;

type V3 = [number, number, number];

/** Flat text lying face-up on the page, reading toward −z. */
function Label({
  children,
  position,
  size,
  color,
  anchorX = "center",
}: {
  children: string;
  position: V3;
  size: number;
  color: string;
  anchorX?: "left" | "center" | "right";
}) {
  return (
    <Text
      font={PAGE_LOOK.font}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={size}
      color={color}
      anchorX={anchorX}
      anchorY="middle"
      letterSpacing={0.04}
    >
      {children}
    </Text>
  );
}

/** A thin glowing bar lying on the page. */
function Line({ position, size, color, glow }: { position: V3; size: V3; color: string; glow: number }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} />
    </mesh>
  );
}

function Rim() {
  const y = 0.01;
  const t = 0.08;
  const c = PAGE_LOOK.edge;
  return (
    <>
      <Line position={[0, y, top]} size={[width, 0.02, t]} color={c} glow={1.6} />
      <Line position={[0, y, bottom]} size={[width, 0.02, t]} color={c} glow={1.6} />
      <Line position={[-half, y, midZ]} size={[t, 0.02, length]} color={c} glow={1.6} />
      <Line position={[half, y, midZ]} size={[t, 0.02, length]} color={c} glow={1.6} />
    </>
  );
}

function Header() {
  const z = top - HEADER.depth / 2;
  const y = HEADER.rise + 0.01;
  return (
    <>
      <mesh position={[0, HEADER.rise / 2, z]} receiveShadow>
        <boxGeometry args={[width, HEADER.rise, HEADER.depth]} />
        <meshStandardMaterial color={PAGE_LOOK.headerFill} />
      </mesh>
      <Label position={[-half + 1.5, y, z]} size={1.1} color={PAGE_LOOK.ink} anchorX="left">
        cason
      </Label>
      <Label position={[half - 1.5, y, z]} size={0.55} color={PAGE_LOOK.inkDim} anchorX="right">
        {NAV.join("     ")}
      </Label>
    </>
  );
}

function Hairline({ z, inset = 0 }: { z: number; inset?: number }) {
  return (
    <Line
      position={[0, 0.01, z]}
      size={[width - inset, 0.01, 0.04]}
      color={PAGE_LOOK.gridMajor}
      glow={0.8}
    />
  );
}

function Footer() {
  return (
    <>
      <Hairline z={bottom + FOOTER_DEPTH} />
      <Label position={[0, 0.02, bottom + FOOTER_DEPTH / 2]} size={0.5} color={PAGE_LOOK.inkDim}>
        cason · 2026 · walk off the edge to start over
      </Label>
    </>
  );
}

export default function Page() {
  return (
    <>
      {/* One collider for the slab; the header's rise is small enough to walk up. */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[half, thickness / 2, length / 2]}
          position={[0, -thickness / 2, midZ]}
        />
      </RigidBody>

      <mesh position={[0, -thickness / 2, midZ]} receiveShadow>
        <boxGeometry args={[width, thickness, length]} />
        <meshStandardMaterial color={PAGE_LOOK.surface} roughness={0.9} />
      </mesh>

      <Grid
        position={[0, 0.004, midZ]}
        args={[width, length]}
        cellSize={1}
        cellThickness={0.6}
        cellColor={PAGE_LOOK.grid}
        sectionSize={6}
        sectionThickness={1}
        sectionColor={PAGE_LOOK.gridMajor}
        fadeDistance={60}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid={false}
      />

      <Rim />
      <Header />
      <Hairline z={top - HEADER.depth} />
      {DIVIDERS.map((z) => (
        <Hairline key={z} z={z} inset={4} />
      ))}
      <Footer />
    </>
  );
}
