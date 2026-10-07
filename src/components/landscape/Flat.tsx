"use client";

import { Text } from "@react-three/drei";
import { useEffect, useMemo, type ComponentProps } from "react";
import { ExtrudeGeometry, Shape } from "three";
import { FONT, INK } from "./theme";
import type { Vec3 } from "./types";

// Flat things printed on the page: type, hairlines, tag pills. Everything
// lies face-up and reads toward −z, so "top" of a text block is its far
// edge and lines run toward the player (+z).

/** Just above a surface, so flat marks never z-fight with it. */
export const LIFT = 0.012;

type TextProps = ComponentProps<typeof Text>;

/** Type lying on the page. `position` is its top-left (anchor) corner by default. */
export function Flat({
  children,
  position,
  size,
  font = FONT.sans,
  color = INK.dim,
  anchorX = "left",
  anchorY = "top",
  ...rest
}: {
  children: string;
  position: Vec3;
  size: number;
  font?: string;
} & Omit<TextProps, "position" | "children" | "font" | "fontSize">) {
  return (
    <Text
      font={font}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={size}
      color={color}
      anchorX={anchorX}
      anchorY={anchorY}
      lineHeight={1.4}
      {...rest}
    >
      {children}
    </Text>
  );
}

/** A hairline across the page at depth `z`, from x0 to x1. */
export function Rule({ z, x0, x1, y = 0 }: { z: number; x0: number; x1: number; y?: number }) {
  return (
    <mesh position={[(x0 + x1) / 2, y + LIFT / 2, z]}>
      <boxGeometry args={[x1 - x0, LIFT, 0.05]} />
      <meshStandardMaterial color={INK.rule} />
    </mesh>
  );
}

/** A rounded rectangle `w` × `d` with corner radius `r`, extruded `h` up
 *  from y = 0 and centred on x/z — the shape of every card, pill and the
 *  nav bar. (RoundedBox rounds by the smallest side, so a thin slab would
 *  come out square-cornered.) */
export function Slab({
  w,
  d,
  h,
  r,
  color,
  position,
}: {
  w: number;
  d: number;
  h: number;
  r: number;
  color: string;
  position?: Vec3;
}) {
  const geometry = useMemo(() => {
    const rr = Math.min(r, w / 2, d / 2);
    const x = -w / 2;
    const y = -d / 2;
    const shape = new Shape();
    shape.moveTo(x + rr, y);
    shape.lineTo(x + w - rr, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + rr);
    shape.lineTo(x + w, y + d - rr);
    shape.quadraticCurveTo(x + w, y + d, x + w - rr, y + d);
    shape.lineTo(x + rr, y + d);
    shape.quadraticCurveTo(x, y + d, x, y + d - rr);
    shape.lineTo(x, y + rr);
    shape.quadraticCurveTo(x, y, x + rr, y);
    const g = new ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 6 });
    // Shape space is x/y with extrusion along +z; lay it down so it rises along +y.
    g.rotateX(-Math.PI / 2);
    return g;
  }, [w, d, h, r]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/** Mono advance, as a fraction of the font size — for sizing pills to their text. */
const MONO_ADVANCE = 0.6;

/** Width a pill will take for `label` at `size`. */
export function pillWidth(label: string, size: number) {
  return label.length * size * MONO_ADVANCE + size * 1.6;
}

/** Left edges for a row of widths laid out from `start` with `gap` between. */
export function rowOffsets(widths: readonly number[], start: number, gap: number) {
  return widths.map((_, i) => start + widths.slice(0, i).reduce((a, b) => a + b + gap, 0));
}

/** A rounded tag (`#react`) or button (`all posts`), its left edge at `position`. */
export function Pill({
  label,
  position,
  size = 0.32,
  color = INK.accent,
}: {
  label: string;
  position: Vec3;
  size?: number;
  color?: string;
}) {
  const w = pillWidth(label, size);
  const d = size * 2;
  const h = 0.05;
  const [x, y, z] = position;
  return (
    <group position={[x + w / 2, y, z]}>
      <Slab w={w} d={d} h={h} r={d / 2} color={INK.card} />
      <Flat
        position={[0, h + LIFT, 0]}
        size={size}
        font={FONT.mono}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Flat>
    </group>
  );
}
