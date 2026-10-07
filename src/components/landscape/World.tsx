"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import Bounds from "./Bounds";
import Ground from "./Ground";
import Player from "./Player";
import SectionBlocks from "./SectionBlocks";
import { playerState } from "./playerState";
import { useIsTouch } from "./useIsTouch";

// A bright, low-poly afternoon: pale sky, a warm sun that follows the
// player so its shadow box only has to cover the area in view, a cool
// sky/ground fill, and fog in the sky's colour so the meadow fades out
// instead of ending.

/** Sky and fog colour; Landscape paints the page behind the canvas with it too. */
export const SKY = "#bfe3ff";

const LOOK = {
  sky: SKY,
  fogNear: 30,
  fogFar: 85,
  hemiSky: "#e4f3ff",
  hemiGround: "#b9d99a",
  hemiIntensity: 1.3,
  sunColor: "#fff0d4",
  sunIntensity: 2.4,
  /** Sun direction from the player: high, from the front-right. */
  sunOffset: [14, 26, 10] as const,
  /** Half-width of the square the shadow camera covers around the player. */
  shadowExtent: 24,
  shadowMap: 2048,
  shadowMapTouch: 1024,
};

/** The sun: a directional light that rides along with the player. */
function Sun() {
  const light = useRef<THREE.DirectionalLight>(null);
  const touch = useIsTouch();
  const size = touch ? LOOK.shadowMapTouch : LOOK.shadowMap;

  // Changing mapSize after the first render needs the old map thrown away.
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.shadow.mapSize.set(size, size);
    l.shadow.map?.dispose();
    l.shadow.map = null;
  }, [size]);

  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const p = playerState.position;
    const [ox, oy, oz] = LOOK.sunOffset;
    l.position.set(p.x + ox, p.y + oy, p.z + oz);
    l.target.position.copy(p);
    l.target.updateMatrixWorld();
  });

  const e = LOOK.shadowExtent;
  return (
    <directionalLight
      ref={light}
      color={LOOK.sunColor}
      intensity={LOOK.sunIntensity}
      castShadow
      shadow-mapSize={[size, size]}
      shadow-camera-left={-e}
      shadow-camera-right={e}
      shadow-camera-top={e}
      shadow-camera-bottom={-e}
      shadow-camera-near={1}
      shadow-camera-far={80}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
    />
  );
}

// Frame stats in development only: the import itself sits behind the
// check, so production builds drop it. drei's StatsGl rather than r3f-perf,
// whose bundled font sourcemap crashes Turbopack ("invalid utf-8 sequence"
// while writing the /3d/ chunk).
const Stats =
  process.env.NODE_ENV === "development"
    ? lazy(() => import("@react-three/drei").then((m) => ({ default: m.StatsGl })))
    : null;

/** Lights, physics and everything in it. */
export default function World() {
  return (
    <>
      <color attach="background" args={[LOOK.sky]} />
      <fog attach="fog" args={[LOOK.sky, LOOK.fogNear, LOOK.fogFar]} />
      <hemisphereLight args={[LOOK.hemiSky, LOOK.hemiGround, LOOK.hemiIntensity]} />
      <Sun />
      <Physics>
        <Ground />
        <Bounds />
        <Player />
        <SectionBlocks />
      </Physics>
      {Stats && (
        <Suspense fallback={null}>
          <Stats />
        </Suspense>
      )}
    </>
  );
}
