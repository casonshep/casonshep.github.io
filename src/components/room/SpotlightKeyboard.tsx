"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  KEY_PAN,
  getSoundCategory,
  getThockEngine,
  makeKeyboardController,
  playKeySound,
  useGlobalKeyInput,
  type KeyboardController,
} from "../keyboard/Keyboard";
import { ROOM, tintStrength } from "../keyboard/visualConfig";
import { useHoloEnv } from "./holoEnv";
import HoloPanel from "./HoloPanel";
import {
  layoutBoard,
  makeKeycapGeometry,
  makeLegendTexture,
  type LayoutKey,
} from "./keyLayout";

// The glass keyboard, rebuilt y-up so it rests on the room's floor. The
// glass refracts `buffer` — a capture of the room without the keyboard that
// DarkRoom renders once per frame — instead of each material re-rendering
// the scene for itself.

type Trigger = { press: () => void; release: () => void };

/** Meshes flagged with this are hidden while DarkRoom captures the room
 *  into the refraction buffer — the glass itself and the legends on top of
 *  it. Everything else on the keyboard (switches, stems) stays in the
 *  capture, which is what makes it visible through the glass. */
export const GLASS_FLAG = "roomGlass";

function useKeycap(w: number, d: number, h: number, radius: number) {
  const D = ROOM.glass.detail;
  const geo = useMemo(
    () => makeKeycapGeometry(w, d, h, radius, D.taper, D.dish),
    [w, d, h, radius, D.taper, D.dish],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

function useRoundedBox(w: number, h: number, d: number, radius: number) {
  const geo = useMemo(
    () => new RoundedBoxGeometry(w, h, d, 4, Math.min(radius, Math.min(w, h, d) / 2)),
    [w, h, d, radius],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

function GlassKey({
  layout,
  depth,
  buffer,
  envMap,
  register,
}: {
  layout: LayoutKey;
  depth: number;
  buffer: THREE.Texture;
  envMap: THREE.Texture;
  register: (id: string, trigger: Trigger) => () => void;
}) {
  const { cfg, x, z, w, h } = layout;
  const group = useRef<THREE.Group>(null);
  const pressed = useRef(false);

  useEffect(
    () =>
      register(cfg.id, {
        press: () => {
          pressed.current = true;
        },
        release: () => {
          pressed.current = false;
        },
      }),
    [cfg.id, register],
  );

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const target = pressed.current ? -depth * ROOM.glass.pressTravel : 0;
    g.position.y += (target - g.position.y) * Math.min(1, dt * ROOM.board.pressSpeed);
  });

  const legend = useMemo(
    () => makeLegendTexture(cfg, w, h, ROOM.glass.legendResolution),
    [cfg, w, h],
  );
  useEffect(() => () => legend?.dispose(), [legend]);

  const radius = Math.min(w, h) * ROOM.glass.keyRadiusFactor;
  const geometry = useKeycap(w, depth, h, radius);
  const K = ROOM.glass.key;
  const D = ROOM.glass.detail;
  const hw = w * D.housingSize;
  const hh = h * D.housingSize;
  // The cap rests `travel` above the plate; the housing fills that gap.
  const travel = depth * ROOM.glass.pressTravel;
  const housingH = travel;
  const stemW = Math.min(w, h) * 0.22;
  const stemH = depth * 0.3;

  return (
    <group position={[x, depth / 2 + travel, z]}>
      {D.switches && (
        // Housing is fixed to the plate; only the cap and stem travel.
        <mesh position={[0, -depth / 2 - travel + housingH / 2, 0]}>
          <boxGeometry args={[hw, housingH, hh]} />
          <meshStandardMaterial color={D.housingColor} roughness={0.6} />
        </mesh>
      )}
      <group ref={group}>
        {D.switches && (
          // Stem rides with the cap, poking down into the housing at rest.
          <group position={[0, -depth / 2 - travel * 0.35 + stemH / 2, 0]}>
            <mesh>
              <boxGeometry args={[stemW, stemH, stemW * 0.42]} />
              <meshStandardMaterial
                color={D.stemColor}
                emissive={D.stemColor}
                emissiveIntensity={D.stemGlow}
                roughness={0.4}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[stemW * 0.42, stemH, stemW]} />
              <meshStandardMaterial
                color={D.stemColor}
                emissive={D.stemColor}
                emissiveIntensity={D.stemGlow}
                roughness={0.4}
              />
            </mesh>
          </group>
        )}
        <mesh
          geometry={geometry}
          userData={{ [GLASS_FLAG]: true }}
          castShadow
          onPointerDown={(e) => {
            e.stopPropagation();
            pressed.current = true;
            playKeySound(getSoundCategory(cfg.id), !!cfg.muted, KEY_PAN[cfg.id] ?? 0);
          }}
          onPointerUp={() => {
            pressed.current = false;
          }}
          onPointerLeave={() => {
            pressed.current = false;
          }}
        >
          <MeshTransmissionMaterial
            buffer={buffer}
            transmission={1}
            thickness={depth * K.thicknessFactor}
            roughness={K.roughness}
            ior={K.ior}
            chromaticAberration={K.chromaticAberration}
            anisotropicBlur={K.anisotropicBlur}
            distortion={K.distortion}
            distortionScale={K.distortionScale}
            temporalDistortion={K.temporalDistortion}
            clearcoat={K.clearcoat}
            clearcoatRoughness={K.clearcoatRoughness}
            iridescence={K.iridescence}
            iridescenceIOR={K.iridescenceIOR}
            iridescenceThicknessRange={[...K.iridescenceThicknessRange]}
            envMap={envMap}
            envMapIntensity={K.envMapIntensity}
            color={tintStrength(K.color)}
          />
        </mesh>
        {legend && (
          // Sits just above the rim of the dish, so no part of the flat
          // legend dips under the glass surface and gets hidden by it.
          <mesh
            position={[0, depth / 2 + 0.015, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            userData={{ [GLASS_FLAG]: true }}
            renderOrder={10}
          >
            <planeGeometry args={[w * D.taper * 0.95, h * D.taper * 0.95]} />
            <meshStandardMaterial
              map={legend}
              emissiveMap={legend}
              emissive="#ffffff"
              emissiveIntensity={ROOM.glass.legendGlow}
              roughness={0.7}
              transparent
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

function BasePlate({
  w,
  h,
  depth,
  buffer,
  envMap,
}: {
  w: number;
  h: number;
  depth: number;
  buffer: THREE.Texture;
  envMap: THREE.Texture;
}) {
  const P = ROOM.glass.plate;
  const plateW = w * ROOM.board.plateWidthFactor;
  const plateH = h * ROOM.board.plateHeightFactor;
  const plateD = depth * ROOM.board.plateDepthScale;
  const geometry = useRoundedBox(plateW, plateD, plateH, depth * ROOM.glass.plateRadiusFactor);
  return (
    <mesh
      geometry={geometry}
      position={[0, plateD / 2, 0]}
      userData={{ [GLASS_FLAG]: true }}
      castShadow
      receiveShadow
    >
      <MeshTransmissionMaterial
        buffer={buffer}
        transmission={1}
        thickness={plateD * P.thicknessFactor}
        roughness={P.roughness}
        ior={P.ior}
        chromaticAberration={P.chromaticAberration}
        anisotropicBlur={P.anisotropicBlur}
        distortion={P.distortion}
        distortionScale={P.distortionScale}
        temporalDistortion={P.temporalDistortion}
        clearcoat={P.clearcoat}
        clearcoatRoughness={P.clearcoatRoughness}
        iridescence={P.iridescence}
        iridescenceIOR={P.iridescenceIOR}
        iridescenceThicknessRange={[...P.iridescenceThicknessRange]}
        envMap={envMap}
        envMapIntensity={P.envMapIntensity}
        color={tintStrength(P.color)}
      />
    </mesh>
  );
}

const SpotlightKeyboard = forwardRef<
  THREE.Group,
  {
    buffer: THREE.Texture;
    /** Height of the stand the keyboard rests on. */
    standHeight?: number;
    /** The stand itself; spins with the keyboard. */
    stand?: ReactNode;
    /** Chosen sprite's hue in degrees; colours the plate's glow. */
    hue?: number | null;
    onController?: (controller: KeyboardController) => void;
  }
>(
  function SpotlightKeyboard(
    { buffer, standHeight = 0, stand, hue, onController },
    ref,
  ) {
    const board = useMemo(() => layoutBoard(ROOM.boardWidth), []);

    const triggers = useRef<Map<string, Trigger>>(new Map());
    const register = useCallback((id: string, trigger: Trigger) => {
      triggers.current.set(id, trigger);
      return () => {
        if (triggers.current.get(id) === trigger) triggers.current.delete(id);
      };
    }, []);
    const pressKey = useCallback((id: string) => triggers.current.get(id)?.press(), []);
    const releaseKey = useCallback((id: string) => triggers.current.get(id)?.release(), []);

    useGlobalKeyInput(pressKey, releaseKey);

    useEffect(() => {
      onController?.(makeKeyboardController(pressKey, releaseKey));
    }, [onController, pressKey, releaseKey]);

    // Warm the sound engine, and resume its context on the first gesture
    // (browsers refuse audio before one).
    useEffect(() => {
      void getThockEngine();
      const unlock = () => {
        void getThockEngine().then((engine) => {
          if (engine && engine.ctx.state === "suspended") void engine.ctx.resume();
        });
      };
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
      return () => {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      };
    }, []);

    // Keys sit on top of the plate.
    const plateD = board.depth * ROOM.board.plateDepthScale;

    // Display pose: tilted back, and lifted so the front edge still rests on
    // the podium; the whole thing turns slowly like a turntable.
    const tilt = (ROOM.display.tilt * Math.PI) / 180;
    const lift = (board.h / 2) * Math.sin(tilt);
    const [reduced] = useState(
      () =>
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    const envMap = useHoloEnv();
    const spin = useRef<THREE.Group>(null);
    useFrame((_, dt) => {
      const g = spin.current;
      if (!g || reduced || ROOM.display.spinSeconds <= 0) return;
      g.rotation.y += (dt / ROOM.display.spinSeconds) * Math.PI * 2;
    });

    return (
      <group ref={ref}>
        <group ref={spin}>
        {stand}
        <group position={[0, standHeight + lift, 0]} rotation={[tilt, 0, 0]}>
        {ROOM.glass.plateGlow.enabled && (
          <HoloPanel
            w={board.w * ROOM.board.plateWidthFactor * 0.98}
            h={board.h * ROOM.board.plateHeightFactor * 0.98}
            y={0.02}
            hue={hue}
          />
        )}
        <BasePlate w={board.w} h={board.h} depth={board.depth} buffer={buffer} envMap={envMap} />
        <group position={[0, plateD, 0]}>
          {board.keys.map((layout) => (
            <GlassKey
              key={layout.cfg.id}
              layout={layout}
              depth={board.depth}
              buffer={buffer}
              envMap={envMap}
              register={register}
            />
          ))}
        </group>
        </group>
        </group>
      </group>
    );
  },
);

export default SpotlightKeyboard;
