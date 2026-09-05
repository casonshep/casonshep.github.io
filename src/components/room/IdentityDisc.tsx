"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ROOM } from "../keyboard/visualConfig";
import { useHoloEnv } from "./holoEnv";

// A compact identity-disc base under the keyboard. The body is a lathed
// cross-section with real recessed channels — a groove in the top face and a
// slot in the rim — that the LED strips sit inside, chamfered edges, and a
// clear-coated plastic finish reflecting the same environment as the glass.
// LEDs are emissive (tone-mapped, so they bloom softly instead of clipping).

/** Cross-section (r, y) of the ring, revolved around y. Corner points are
 *  duplicated so the shading breaks crisply at each edge. */
function profile(R: number, Ri: number, h: number, c: number, groove: { r: number; w: number; d: number }, slot: { d: number; h: number }) {
  const pts: [number, number][] = [];
  const P = (r: number, y: number) => pts.push([r, y]);
  const gi = groove.r - groove.w / 2;
  const go = groove.r + groove.w / 2;
  const s0 = h * 0.5 - slot.h / 2;
  const s1 = h * 0.5 + slot.h / 2;
  // Inner wall, bottom → top, with a chamfer at the top.
  P(Ri, 0); P(Ri, h - c); P(Ri + c, h);
  // Top face to the groove; groove walls and floor.
  P(gi, h); P(gi, h - groove.d); P(go, h - groove.d); P(go, h);
  // Top face to the rim chamfer.
  P(R - c, h); P(R, h - c);
  // Rim: down to the slot, into it, back out, down to the bottom chamfer.
  P(R, s1); P(R - slot.d, s1); P(R - slot.d, s0); P(R, s0);
  P(R, c); P(R - c, 0);
  P(Ri, 0);
  return pts.map(([r, y]) => new THREE.Vector2(r, y));
}

function useDiscBody() {
  const D = ROOM.disc;
  const geo = useMemo(() => {
    const pts = profile(
      D.radius, D.holeRadius, D.thickness, D.chamfer,
      { r: D.bandRadius, w: D.bandWidth + 0.12, d: D.grooveDepth },
      { d: D.slotDepth, h: D.thickness * D.rimBand },
    );
    const lathe = new THREE.LatheGeometry(pts, 256);
    // Flat-shade each profile facet so chamfers and channel edges read.
    const g = lathe.toNonIndexed();
    lathe.dispose();
    g.computeVertexNormals();
    return g;
  }, [D]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

function LedRing({
  radius, width, y, segments, gapDeg, color, intensity,
}: {
  radius: number; width: number; y: number; segments: number; gapDeg: number; color: string; intensity: number;
}) {
  const gap = (gapDeg * Math.PI) / 180;
  const span = (Math.PI * 2) / segments - gap;
  return (
    <group position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: segments }, (_, i) => (
        <mesh key={i} raycast={() => null}>
          <ringGeometry args={[radius - width / 2, radius + width / 2, 96, 1, (i * Math.PI * 2) / segments + gap / 2, span]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export default function IdentityDisc() {
  const D = ROOM.disc;
  const body = useDiscBody();
  const envMap = useHoloEnv();
  const top = D.thickness;
  const screwR = D.thickness * 0.14;

  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={D.bodyColor}
          roughness={D.bodyRoughness}
          metalness={0.1}
          clearcoat={D.clearcoat}
          clearcoatRoughness={0.18}
          envMap={envMap}
          envMapIntensity={D.envMapIntensity}
        />
      </mesh>

      {/* LED strip lying in the top groove. */}
      <LedRing
        radius={D.bandRadius}
        width={D.bandWidth}
        y={top - D.grooveDepth + 0.015}
        segments={D.segments}
        gapDeg={D.gapDegrees}
        color={D.ledColor}
        intensity={D.ledIntensity}
      />

      {/* LED strip inside the rim slot. */}
      <mesh position={[0, top * 0.5, 0]} raycast={() => null}>
        <cylinderGeometry
          args={[D.radius - D.slotDepth + 0.015, D.radius - D.slotDepth + 0.015, top * D.rimBand * 0.8, 192, 1, true]}
        />
        <meshStandardMaterial color={D.ledColor} emissive={D.ledColor} emissiveIntensity={D.ledIntensity} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Screws between the hole and the groove. */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const r = (D.holeRadius + D.bandRadius - D.bandWidth) / 2;
        return (
          <group key={i} position={[Math.cos(a) * r, top, Math.sin(a) * r]}>
            <mesh raycast={() => null}>
              <cylinderGeometry args={[screwR, screwR * 1.15, 0.06, 24]} />
              <meshStandardMaterial color="#8d9097" metalness={0.9} roughness={0.35} envMap={envMap} />
            </mesh>
            <mesh position={[0, 0.031, 0]} rotation={[-Math.PI / 2, 0, a]} raycast={() => null}>
              <planeGeometry args={[screwR * 1.3, screwR * 0.28]} />
              <meshStandardMaterial color="#2a2c31" roughness={0.6} />
            </mesh>
          </group>
        );
      })}

      {/* The LEDs' light on the keyboard above. */}
      {D.lightIntensity > 0 && (
        <pointLight position={[0, top + 6, 0]} color={D.ledColor} intensity={D.lightIntensity} distance={D.radius * 4} decay={2} />
      )}
    </group>
  );
}
