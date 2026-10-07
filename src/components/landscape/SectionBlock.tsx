"use client";

import { Text, Text3D } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box3, Color, Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { Mesh } from "three";
import { sectionBounds } from "./playerState";
import type { Section, Vec3 } from "./types";
import { WORLD } from "./worldConfig";

// One section as a block you can climb.
//
// The title lies on its back: Text3D extrudes glyphs along local +z, and the
// mesh is tipped −90° about x so that extrusion points up. Each letter is
// then a slab `height` tall (WORLD.letterHeight by default — under one jump)
// whose top face is the glyph, readable from above by the follow camera.
// Standing letters would need to be taller than a jump to read from the
// ground, and a jump-high wall of letters is a wall, not a floor.
//
// Physics is one cuboid fitted to the measured text bounds, not a collider
// per letter: the player walks across the gaps between letters at letter
// height instead of catching on their edges. A thin plinth fills that same
// footprint so the gaps read as part of one block rather than as holes.
//
// The block's world-space box goes into `sectionBounds` once the geometry
// exists; its top face is the collider's top face, i.e. the surface the
// player stands on.

const BLOCK = {
  /** Glyph size (≈ cap height) of a top-level title, metres. */
  titleSize: 2.2,
  /** Children are drawn at this fraction of the parent's size. */
  childScale: 0.6,
  /** Few curve segments — glyph outlines stay faceted, to fit the low-poly look. */
  curveSegments: 3,
  /** Plinth under the letters, as a fraction of the letter height. */
  plinth: 0.18,
  /** Body copy: size, ink, and gap in front of the title, metres. */
  bodySize: 0.36,
  bodyInk: "#24324a",
  bodyGap: 0.7,
  /** Body copy never wraps narrower than this, even under a short title. */
  bodyMinWidth: 7,
  font: "/fonts/helvetiker_bold.typeface.json",
} as const;

/** Body-local bounds of the title, once measured. The mesh is re-centred on
 *  x/z so the block's origin sits at its middle, on the ground. */
type Measure = {
  /** Mesh offset that centres the glyphs over the origin. */
  offset: Vec3;
  /** Width (x), letter height (y), depth (z). */
  size: Vec3;
};

/** Quarter turn about y that makes the title read right-way-up from spawn:
 *  the block's local +z (where the body copy sits) faces the spawn point. */
function yawToward(from: Vec3, to: Vec3): number {
  const angle = Math.atan2(to[0] - from[0], to[2] - from[2]);
  return Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
}

function shade(color: string, by: number): string {
  return `#${new Color(color).multiplyScalar(by).getHexString()}`;
}

function Block({
  section,
  origin,
  yaw,
  scale,
}: {
  section: Section;
  origin: Vec3;
  yaw: number;
  scale: number;
}) {
  const textRef = useRef<Mesh>(null);
  const measuredGeometry = useRef<unknown>(null);
  const [measure, setMeasure] = useState<Measure | null>(null);

  const height = section.height ?? WORLD.letterHeight;
  const color = section.color ?? "#ffffff";

  // Measure the glyphs whenever Text3D hands the mesh a new geometry — first
  // mount, and again if the title changes under hot reload. Polling the
  // geometry's identity is one comparison a frame, and needs no assumption
  // about when fiber attaches it.
  useFrame(() => {
    const mesh = textRef.current;
    if (!mesh || mesh.geometry === measuredGeometry.current) return;
    const geometry = mesh.geometry;
    if (!geometry.getAttribute("position")) return;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box || box.isEmpty()) return;
    measuredGeometry.current = geometry;
    // Geometry space: glyphs in x/y, extrusion along +z. After the −90° tip
    // about x, geometry y runs toward world −z, and z runs up.
    setMeasure({
      offset: [-(box.min.x + box.max.x) / 2, -box.min.z, (box.min.y + box.max.y) / 2],
      size: [box.max.x - box.min.x, box.max.z - box.min.z, box.max.y - box.min.y],
    });
  });

  // World-space box for the overlay. Quarter turns keep an axis-aligned box
  // exact, so this is the footprint and not an over-estimate of it.
  useEffect(() => {
    if (!measure) return;
    const [w, h, d] = measure.size;
    const local = new Box3(new Vector3(-w / 2, 0, -d / 2), new Vector3(w / 2, h, d / 2));
    const place = new Matrix4().compose(
      new Vector3(...origin),
      new Quaternion().setFromEuler(new Euler(0, yaw, 0)),
      new Vector3(1, 1, 1),
    );
    const world = local.applyMatrix4(place);
    sectionBounds.set(section.id, world);
    return () => {
      if (sectionBounds.get(section.id) === world) sectionBounds.delete(section.id);
    };
  }, [measure, origin, yaw, section.id]);

  const [w, h, d] = measure?.size ?? [0, 0, 0];
  const bodyWidth = Math.max(w, BLOCK.bodyMinWidth * scale);

  return (
    <group position={origin} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false}>
        {measure && (
          <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
        )}
      </RigidBody>

      <Text3D
        ref={textRef}
        font={BLOCK.font}
        size={BLOCK.titleSize * scale}
        height={height}
        curveSegments={BLOCK.curveSegments}
        rotation={[-Math.PI / 2, 0, 0]}
        position={measure?.offset ?? [0, 0, 0]}
        visible={measure !== null}
        castShadow
        receiveShadow
      >
        {section.title}
        <meshStandardMaterial color={color} flatShading />
      </Text3D>

      {measure && (
        <mesh position={[0, (h * BLOCK.plinth) / 2, 0]} receiveShadow>
          <boxGeometry args={[w, h * BLOCK.plinth, d]} />
          <meshStandardMaterial color={shade(color, 0.72)} flatShading />
        </mesh>
      )}

      {measure && section.lines.length > 0 && (
        <Text
          position={[0, 0.02, d / 2 + BLOCK.bodyGap * scale]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={BLOCK.bodySize * Math.max(scale, 0.75)}
          maxWidth={bodyWidth}
          lineHeight={1.35}
          textAlign="center"
          anchorX="center"
          anchorY="top"
          color={BLOCK.bodyInk}
        >
          {section.lines.join("\n")}
        </Text>
      )}
    </group>
  );
}

/** One section as a climbable block, plus its children as smaller blocks
 *  around it. Children are siblings in the physics world — rapier doesn't
 *  nest rigid bodies — placed relative to the parent and turned with it. */
export default function SectionBlock({ section }: { section: Section }) {
  const yaw = useMemo(() => yawToward(section.position, WORLD.spawn), [section.position]);

  const children = useMemo(() => {
    const turn = new Quaternion().setFromEuler(new Euler(0, yaw, 0));
    const base = new Vector3(...section.position);
    return (section.children ?? []).map((child) => ({
      child,
      origin: new Vector3(...child.position).applyQuaternion(turn).add(base).toArray() as Vec3,
    }));
  }, [section.children, section.position, yaw]);

  return (
    <>
      <Block section={section} origin={section.position} yaw={yaw} scale={1} />
      {children.map(({ child, origin }) => (
        <Block key={child.id} section={child} origin={origin} yaw={yaw} scale={BLOCK.childScale} />
      ))}
    </>
  );
}
