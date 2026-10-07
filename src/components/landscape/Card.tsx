"use client";

import { useTexture } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useMemo } from "react";
import { Box3, SRGBColorSpace, Vector3 } from "three";
import { Flat, LIFT, Pill, Slab, pillWidth, rowOffsets } from "./Flat";
import { sectionBounds } from "./playerState";
import { FONT, INK } from "./theme";
import type { Section, Vec3 } from "./types";

// A card from the page's grid, raised off the page so you can hop onto it:
// a rounded tile with a mono label at the top ("projects · 2026"), a serif
// title, a line of body copy, and either tags or a picture. Standing on it
// raises its panel, the way hovering a card would on a flat site.

export const CARD = {
  /** How far a card stands proud of the page — a small hop. */
  rise: 0.35,
  radius: 0.45,
  pad: 0.7,
};

/** A picture inset in the card, covering its lower part. */
function Picture({ src, w, d }: { src: string; w: number; d: number }) {
  // Configured in the loader's callback, before anything renders with it:
  // sRGB, and cover-fit — cropped to the slot's aspect like object-fit: cover.
  const texture = useTexture(src, (t) => {
    const tex = Array.isArray(t) ? t[0] : t;
    tex.colorSpace = SRGBColorSpace;
    const image = tex.image as { width: number; height: number } | undefined;
    if (!image) return;
    const slot = w / d;
    const pic = image.width / image.height;
    if (pic > slot) {
      tex.repeat.set(slot / pic, 1);
      tex.offset.set((1 - slot / pic) / 2, 0);
    } else {
      tex.repeat.set(1, pic / slot);
      tex.offset.set(0, (1 - pic / slot) / 2);
    }
    tex.needsUpdate = true;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
}

export default function Card({
  item,
  center,
  w,
  d,
}: {
  item: Section;
  /** Centre of the card's footprint, on the page. */
  center: Vec3;
  w: number;
  d: number;
}) {
  const [cx, cy, cz] = center;
  const top = CARD.rise;
  const { pad } = CARD;
  /** Far (top-of-card) edge, where the label sits. */
  const z0 = -d / 2 + pad;
  const x0 = -w / 2 + pad;

  const bounds = useMemo(
    () => new Box3(new Vector3(cx - w / 2, cy, cz - d / 2), new Vector3(cx + w / 2, cy + top, cz + d / 2)),
    [cx, cy, cz, w, d, top],
  );
  useEffect(() => {
    sectionBounds.set(item.id, bounds);
    return () => {
      if (sectionBounds.get(item.id) === bounds) sectionBounds.delete(item.id);
    };
  }, [item.id, bounds]);

  const tagSize = 0.28;
  const tags = item.tags ?? [];
  const tagX = rowOffsets(tags.map((t) => pillWidth(t, tagSize)), x0, 0.25);

  return (
    <group position={center}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, top / 2, d / 2]} position={[0, top / 2, 0]} />
      </RigidBody>
      {/* An outline a shade lighter than the face, the card's border. */}
      <Slab w={w} d={d} h={top - 0.02} r={CARD.radius} color={INK.rule} />
      <Slab w={w - 0.08} d={d - 0.08} h={top} r={CARD.radius - 0.04} color={INK.card} />

      <group position={[0, top + LIFT, 0]}>
        {item.meta && (
          <Flat position={[x0, 0, z0]} size={0.32} font={FONT.mono} color={INK.faint}>
            {item.meta}
          </Flat>
        )}
        <Flat position={[w / 2 - pad, 0, z0]} size={0.36} color={INK.faint} anchorX="right">
          ↗
        </Flat>
        <Flat position={[x0, 0, z0 + 0.8]} size={0.95} font={FONT.serif} color={INK.text} maxWidth={w - 2 * pad}>
          {item.title}
        </Flat>
        {item.lines[0] && !item.image && (
          <Flat position={[x0, 0, z0 + 2.3]} size={0.36} maxWidth={w - 2 * pad}>
            {item.lines[0]}
          </Flat>
        )}
        {tags.map((tag, i) => (
          <Pill key={tag} label={tag} size={tagSize} position={[tagX[i], 0, d / 2 - pad - tagSize]} />
        ))}
        {item.image && (
          // Below the title, down to the bottom padding.
          <group position={[0, 0, (z0 + 2.1 + d / 2 - pad) / 2]}>
            <Suspense fallback={null}>
              <Picture src={item.image} w={w - 2 * pad} d={d / 2 - pad - (z0 + 2.1)} />
            </Suspense>
          </group>
        )}
      </group>
    </group>
  );
}
