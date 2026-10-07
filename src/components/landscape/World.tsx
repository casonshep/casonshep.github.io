"use client";

import { Physics } from "@react-three/rapier";
import Bounds from "./Bounds";
import Ground from "./Ground";
import Player from "./Player";
import SectionBlocks from "./SectionBlocks";

/** Lights, physics and everything in it. Stub. */
export default function World() {
  return (
    <>
      <color attach="background" args={["#bfe3ff"]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} />
      <Physics>
        <Ground />
        <Bounds />
        <Player />
        <SectionBlocks />
      </Physics>
    </>
  );
}
