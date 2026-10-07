"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  useEcctrlAnimationStore,
  type EcctrlAnimationState,
} from "ecctrl/animation";

// What the player looks like. CHARACTER_MODEL names the .glb and how its
// clips map onto ecctrl's animation states — or, for a static model with no
// rig, `clips: null`, and the body is moved in code instead: a waddle and
// bob while walking, a stretch on the way up and a squash on landing. Set
// CHARACTER_MODEL itself to null and the blocky placeholder stands in. The placeholder is also what shows while the
// model downloads. Either one is drawn with its feet at y = 0 facing +Z
// (ecctrl turns the body so +Z is forward); Player lifts it into place.

/** How one ecctrl state plays: a clip, its speed (0 holds the first frame),
 *  and whether it plays once and holds the last frame. */
type ClipPlay = { clip: string; timeScale: number; once?: boolean };

type CharacterModel = {
  url: string;
  /** World height the model is scaled to, metres. */
  height: number;
  /** Turn about y so the model's face points along +Z, radians. */
  yaw?: number;
  /** Clip per state, or null for a static model moved in code. */
  clips: Record<EcctrlAnimationState, ClipPlay> | null;
};

const LUXRAY_WALK = "Armature|walk3";
const LUXRAY_JUMP = "Armature|jump";

/**
 * "Luxray" by Gianmarco (GianmArt), CC BY 4.0 —
 * https://sketchfab.com/3d-models/luxray-7c6a2c3957d7437691a3f8125f362756
 * Fan-made; meshopt-compressed copy in public/models/ (see the LICENSE file
 * beside it). Ships only walk and jump clips: idle holds the walk's first
 * frame, run plays the walk faster. Kept as a rigged alternative.
 */
export const LUXRAY: CharacterModel = {
  url: "/models/luxray.glb",
  height: 1.3,
  clips: {
    IDLE: { clip: LUXRAY_WALK, timeScale: 0 },
    WALK: { clip: LUXRAY_WALK, timeScale: 1.3 },
    RUN: { clip: LUXRAY_WALK, timeScale: 2.2 },
    JUMP_START: { clip: LUXRAY_JUMP, timeScale: 1.6, once: true },
    JUMP_IDLE: { clip: LUXRAY_JUMP, timeScale: 1.6, once: true },
    JUMP_FALL: { clip: LUXRAY_JUMP, timeScale: 1.6, once: true },
    JUMP_LAND: { clip: LUXRAY_WALK, timeScale: 0 },
  },
};

/**
 * "Pokemon MiniQ" by pokedigilucas, CC BY 4.0 —
 * https://sketchfab.com/3d-models/pokemon-miniq-4c186473d2804f8e9af616a822d64e14
 * Fan-made and static (no rig), so it walks by the procedural waddle below.
 */
export const MINIQ: CharacterModel = {
  url: "/models/miniq.glb",
  height: 1.1,
  yaw: 0,
  clips: null,
};

/** Who you play as — the one-line swap. */
export const CHARACTER_MODEL: CharacterModel | null = MINIQ;

/** The procedural walk for static models. */
const WADDLE = {
  /** Steps per second walking; running multiplies it. */
  stepRate: 2.6,
  runRate: 1.7,
  /** Side-to-side roll at each step, radians. */
  roll: 0.14,
  /** Hop height at each step, as a fraction of the model's height. */
  bob: 0.06,
  /** Forward lean while moving, radians (more when running). */
  lean: 0.08,
  /** Stretch on the way up, squash on landing. */
  stretch: 0.12,
  squash: 0.18,
  /** How fast poses ease toward their target, per second. */
  ease: 12,
};

const FADE = 0.15;

const PLACEHOLDER = {
  body: "#ffd23f",
  accent: "#2b2d42",
  cheek: "#ff6b6b",
};

/** A blocky, bright stand-in: a rounded body with ears and a face on +Z. */
export function PlaceholderCharacter({ height = 1.3 }: { height?: number }) {
  const s = height / 1.3;
  return (
    <group scale={s}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.7, 0.75, 0.6]} />
        <meshStandardMaterial color={PLACEHOLDER.body} flatShading />
      </mesh>
      <mesh position={[0, 1.0, 0.02]} castShadow>
        <boxGeometry args={[0.6, 0.45, 0.55]} />
        <meshStandardMaterial color={PLACEHOLDER.body} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* Ears */}
          <mesh position={[side * 0.2, 1.38, 0]} rotation={[0, 0, side * -0.25]} castShadow>
            <coneGeometry args={[0.09, 0.4, 4]} />
            <meshStandardMaterial color={PLACEHOLDER.accent} flatShading />
          </mesh>
          {/* Eyes and cheeks, on the forward (+Z) face */}
          <mesh position={[side * 0.14, 1.06, 0.3]}>
            <boxGeometry args={[0.08, 0.1, 0.02]} />
            <meshStandardMaterial color={PLACEHOLDER.accent} />
          </mesh>
          <mesh position={[side * 0.22, 0.93, 0.3]}>
            <boxGeometry args={[0.1, 0.07, 0.02]} />
            <meshStandardMaterial color={PLACEHOLDER.cheek} />
          </mesh>
          {/* Feet */}
          <mesh position={[side * 0.2, 0.07, 0.05]} castShadow>
            <boxGeometry args={[0.2, 0.14, 0.3]} />
            <meshStandardMaterial color={PLACEHOLDER.body} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Restart `action` from the top with `play`'s looping, fading it in. */
function start(action: THREE.AnimationAction, play: ClipPlay) {
  action.reset();
  action.setLoop(play.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  action.clampWhenFinished = Boolean(play.once);
  action.fadeIn(FADE).play();
}

function ModelCharacter({ model }: { model: CharacterModel }) {
  const group = useRef<THREE.Group>(null);
  const pose = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(model.url);
  const { actions } = useAnimations(animations, group);
  const state = useEcctrlAnimationStore((s) => s.animationState);
  const current = useRef<THREE.AnimationAction | null>(null);
  const phase = useRef(0);
  const landedAt = useRef(-1);

  // Fit the model to `height`, feet on y = 0, centred over the capsule.
  // Measured on the skinned vertices, so it works for whatever is swapped in.
  const fit = useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene, true);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = size.y > 0 ? model.height / size.y : 1;
    return {
      scale,
      position: [-center.x * scale, -box.min.y * scale, -center.z * scale] as const,
    };
  }, [scene, model.height]);

  useEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }, [scene]);

  useEffect(() => {
    if (!model.clips) return;
    const play = model.clips[state];
    const action = actions[play.clip];
    if (!action) return;
    action.setEffectiveTimeScale(play.timeScale);
    // States that share a clip (jump start → airborne → fall) keep it
    // running rather than restarting it.
    if (current.current === action) return;
    start(action, play);
    current.current?.fadeOut(FADE);
    current.current = action;
  }, [actions, model.clips, state]);

  // Static models: pose the body in code. The pose group pivots at the
  // feet, so roll and lean rock the model on the ground, not about its middle.
  useFrame(({ clock }, delta) => {
    const g = pose.current;
    if (!g || model.clips) return;
    const t = clock.elapsedTime;
    const moving = state === "WALK" || state === "RUN";
    const airborne = state === "JUMP_START" || state === "JUMP_IDLE" || state === "JUMP_FALL";
    if (state === "JUMP_LAND") landedAt.current = t;

    const rate = WADDLE.stepRate * (state === "RUN" ? WADDLE.runRate : 1);
    if (moving) phase.current += delta * rate * Math.PI;
    const step = Math.sin(phase.current);

    let roll = 0;
    let bob = 0;
    let lean = 0;
    let stretch = 1;
    if (moving) {
      roll = step * WADDLE.roll;
      bob = Math.abs(step) * WADDLE.bob * model.height;
      lean = WADDLE.lean * (state === "RUN" ? 1.8 : 1);
    } else if (airborne) {
      stretch = 1 + (state === "JUMP_FALL" ? 0.3 : 1) * WADDLE.stretch;
    }
    // A short squash right after touching down.
    const sinceLand = t - landedAt.current;
    if (landedAt.current >= 0 && sinceLand < 0.18) {
      stretch = 1 - WADDLE.squash * Math.sin((sinceLand / 0.18) * Math.PI);
    }

    const k = 1 - Math.exp(-WADDLE.ease * delta);
    g.rotation.z += (roll - g.rotation.z) * k;
    g.rotation.x += (lean - g.rotation.x) * k;
    g.position.y += (bob - g.position.y) * k;
    const sy = g.scale.y + (stretch - g.scale.y) * k;
    // Keep volume: thinner as it stretches, wider as it squashes.
    const sxz = 1 / Math.sqrt(sy);
    g.scale.set(sxz, sy, sxz);
  });

  return (
    <group ref={pose}>
      {/* Turn outside the fit, so the centring offsets stay in model space. */}
      <group rotation={[0, model.yaw ?? 0, 0]}>
        <group ref={group} position={fit.position} scale={fit.scale}>
          <primitive object={scene} />
        </group>
      </group>
    </group>
  );
}

/** The player's body. Falls back to the placeholder while loading, or for good when no model is set. */
export default function Character() {
  const model = CHARACTER_MODEL;
  if (!model) return <PlaceholderCharacter />;
  return (
    <Suspense fallback={<PlaceholderCharacter height={model.height} />}>
      <ModelCharacter model={model} />
    </Suspense>
  );
}

// Start the download with the page, not when the Canvas first asks. Client
// only: the server has no origin to resolve the path against.
if (CHARACTER_MODEL && typeof window !== "undefined") {
  useGLTF.preload(CHARACTER_MODEL.url);
}
