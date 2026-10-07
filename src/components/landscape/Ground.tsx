"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { WORLD } from "./worldConfig";

// The floor: one fixed slab collider the size of the play area, under a
// faceted pastel meadow that runs on past the walls so the fog, not an
// edge, ends the world. Scenery props have no colliders and sit only at
// the rim and beyond, clear of the content paths.

const GROUND_COLOR = "#a8dc8c";
/** The visible meadow is this many times the play area, so the edge is lost in fog. */
const VISUAL_SCALE = 3;
/** Facet depth: vertices only ever sink, so nothing pokes up through the feet. */
const JITTER = 0.08;

const ROCK_COLORS = ["#c9c3d6", "#b8c4cf", "#d6cbbd"];
const LEAF_COLORS = ["#7cc98a", "#9ad48f", "#6fbf9e", "#b5dc84"];
const TRUNK_COLOR = "#b48a6a";

/** Small deterministic PRNG (mulberry32), as in DarkRoom: scenery is laid
 *  out during render, so it must be the same every time. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Meadow() {
  const geometry = useMemo(() => {
    const size = WORLD.groundSize * VISUAL_SCALE;
    const g = new THREE.PlaneGeometry(size, size, 90, 90);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const rnd = makeRng(7);
    for (let i = 0; i < pos.count; i++) pos.setY(i, -rnd() * JITTER);
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={GROUND_COLOR} flatShading roughness={1} />
    </mesh>
  );
}

type Prop = {
  kind: "rock" | "tree";
  x: number;
  z: number;
  scale: number;
  rot: number;
  color: string;
};

/** Rocks and trees in a ring from just inside the walls out to the fog. */
function useProps(): Prop[] {
  return useMemo(() => {
    const rnd = makeRng(2026);
    const half = WORLD.groundSize / 2;
    const inner = half - 8;
    const outer = half * 2.4;
    const props: Prop[] = [];
    for (let i = 0; i < 80; i++) {
      const a = rnd() * Math.PI * 2;
      // Square-root spread keeps the ring evenly dense rather than crowded inside.
      const r = Math.sqrt(inner * inner + rnd() * (outer * outer - inner * inner));
      const tree = rnd() < 0.65;
      const palette = tree ? LEAF_COLORS : ROCK_COLORS;
      props.push({
        kind: tree ? "tree" : "rock",
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        scale: 0.7 + rnd() * 1.1,
        rot: rnd() * Math.PI * 2,
        color: palette[Math.floor(rnd() * palette.length)],
      });
    }
    return props;
  }, []);
}

function Tree({ p }: { p: Prop }) {
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]} scale={p.scale}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.22, 1, 5]} />
        <meshStandardMaterial color={TRUNK_COLOR} flatShading />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <coneGeometry args={[1, 1.8, 6]} />
        <meshStandardMaterial color={p.color} flatShading />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[0.7, 1.3, 6]} />
        <meshStandardMaterial color={p.color} flatShading />
      </mesh>
    </group>
  );
}

function Rock({ p }: { p: Prop }) {
  return (
    <mesh
      position={[p.x, 0.15 * p.scale, p.z]}
      rotation={[p.rot * 0.3, p.rot, 0]}
      scale={[p.scale, p.scale * 0.6, p.scale * 0.8]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color={p.color} flatShading />
    </mesh>
  );
}

export default function Ground() {
  const props = useProps();
  const half = WORLD.groundSize / 2;
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[half, 0.5, half]} position={[0, -0.5, 0]} />
      </RigidBody>
      <Meadow />
      {props.map((p, i) =>
        p.kind === "tree" ? <Tree key={i} p={p} /> : <Rock key={i} p={p} />,
      )}
    </>
  );
}
