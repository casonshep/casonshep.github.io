"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import Overlay from "./Overlay";
import { CONTROLS } from "./Player";
import TouchControls from "./TouchControls";
import World, { SKY } from "./World";
import { WORLD } from "./worldConfig";

// The /3d/ page: a full-viewport canvas with the HTML overlay and touch
// controls beside it. KeyboardControls wraps the canvas (its context
// reaches inside); it listens on window and removes its listeners when
// this unmounts, so nothing outlives the page.

export default function Landscape() {
  return (
    <KeyboardControls map={CONTROLS}>
      <div className="fixed inset-0" style={{ background: SKY }}>
        <Canvas
          shadows="percentage"
          flat
          dpr={WORLD.dpr}
          camera={{ fov: 50, near: 0.1, far: 300, position: [0, 6, 12] }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          style={{ touchAction: "none" }}
        >
          <Suspense fallback={null}>
            <World />
          </Suspense>
        </Canvas>
      </div>
      <Overlay />
      <TouchControls />
    </KeyboardControls>
  );
}
