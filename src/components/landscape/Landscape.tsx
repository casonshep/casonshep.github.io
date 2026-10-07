"use client";

import { Canvas } from "@react-three/fiber";
import Overlay from "./Overlay";
import World from "./World";
import { WORLD } from "./worldConfig";

/** The /3d/ page: the canvas, and the HTML overlay beside it. Stub. */
export default function Landscape() {
  return (
    <>
      <div style={{ position: "fixed", inset: 0 }}>
        <Canvas dpr={WORLD.dpr} shadows camera={{ position: [0, 6, 12] }}>
          <World />
        </Canvas>
      </div>
      <Overlay />
    </>
  );
}
