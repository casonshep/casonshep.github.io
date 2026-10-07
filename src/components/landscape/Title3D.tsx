"use client";

import { Text3D } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
import { Box3, Vector3 } from "three";
import type { Mesh } from "three";
import { sectionBounds } from "./playerState";
import { FONT, INK } from "./theme";
import type { Vec3 } from "./types";
import { WORLD } from "./worldConfig";

// A heading you can climb. The glyphs lie on their back — Text3D extrudes
// along local +z, and the mesh is tipped −90° about x so the extrusion
// points up — making each letter a slab `height` tall whose top face is the
// glyph, read from above by the follow camera like type on a page.
//
// Physics is one cuboid fitted to the measured text, not a collider per
// letter, so the player walks across the gaps between letters instead of
// catching on them. With an `id`, the box is registered in sectionBounds
// so standing on the heading raises that entry's panel.

type Measure = {
  /** Mesh offset that puts the glyphs where `align` says, on the ground. */
  offset: Vec3;
  /** Width (x), height (y), depth (z). */
  size: Vec3;
};

export default function Title3D({
  text,
  origin,
  size,
  id,
  align = "left",
  height = WORLD.letterHeight,
  color = INK.text,
  glow = 0,
}: {
  text: string;
  /** Left edge (align "left") or centre (align "center") of the text, on the ground. */
  origin: Vec3;
  /** Glyph size, metres. */
  size: number;
  id?: string;
  align?: "left" | "center";
  height?: number;
  color?: string;
  glow?: number;
}) {
  const textRef = useRef<Mesh>(null);
  const measured = useRef<unknown>(null);
  const [measure, setMeasure] = useState<Measure | null>(null);

  // Measure whenever Text3D hands the mesh a new geometry (first mount, and
  // again under hot reload). One identity check a frame.
  useFrame(() => {
    const mesh = textRef.current;
    if (!mesh || mesh.geometry === measured.current) return;
    const geometry = mesh.geometry;
    if (!geometry.getAttribute("position")) return;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box || box.isEmpty()) return;
    measured.current = geometry;
    // Geometry space: glyphs in x/y, extrusion along +z. After the tip,
    // geometry y runs toward world −z and z runs up.
    const x = align === "left" ? -box.min.x : -(box.min.x + box.max.x) / 2;
    setMeasure({
      offset: [x, -box.min.z, (box.min.y + box.max.y) / 2],
      size: [box.max.x - box.min.x, box.max.z - box.min.z, box.max.y - box.min.y],
    });
  });

  const [w, h, d] = measure?.size ?? [0, 0, 0];
  /** Centre of the measured box, relative to `origin`. */
  const cx = align === "left" ? w / 2 : 0;

  useEffect(() => {
    if (!measure || !id) return;
    const [ox, oy, oz] = origin;
    const world = new Box3(
      new Vector3(ox + cx - w / 2, oy, oz - d / 2),
      new Vector3(ox + cx + w / 2, oy + h, oz + d / 2),
    );
    sectionBounds.set(id, world);
    return () => {
      if (sectionBounds.get(id) === world) sectionBounds.delete(id);
    };
  }, [measure, id, origin, cx, w, h, d]);

  return (
    <group position={origin}>
      <RigidBody type="fixed" colliders={false}>
        {measure && <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[cx, h / 2, 0]} />}
      </RigidBody>
      <Text3D
        ref={textRef}
        font={FONT.serif3d}
        size={size}
        height={height}
        curveSegments={8}
        bevelEnabled={false}
        rotation={[-Math.PI / 2, 0, 0]}
        position={measure?.offset ?? [0, 0, 0]}
        visible={measure !== null}
        castShadow
        receiveShadow
      >
        {text}
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} roughness={0.5} />
      </Text3D>
    </group>
  );
}
