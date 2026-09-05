"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { SpotLight, useDepthBuffer, useFBO } from "@react-three/drei";
import { ROOM } from "../keyboard/visualConfig";
import SpotlightKeyboard, { GLASS_FLAG } from "./SpotlightKeyboard";
import AsciiSkyline from "./AsciiSkyline";
import IdentityDisc from "./IdentityDisc";
import type { KeyboardController } from "../keyboard/Keyboard";

// A dark room. The keyboard sits on the floor under a single spotlight;
// nothing else is lit. Knobs live in visualConfig.ts under ROOM.

const DEG = Math.PI / 180;

/** Small deterministic PRNG (mulberry32): the dust is laid out during
 *  render, so it must be pure — same motes every time. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function usePrefersReducedMotion() {
  return useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
}

/** Height of whatever the keyboard rests on. */
function standHeight() {
  if (ROOM.disc.enabled) return ROOM.disc.thickness;
  if (ROOM.podium.enabled) return ROOM.podium.height;
  return 0;
}

/** Floor + walls. Matte and dark: only the spotlight pool reads. */
function Room() {
  const R = ROOM.room;
  const span = R.sideWall * 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[span, R.backWall * 2 + span]} />
        <meshStandardMaterial
          color={R.floorColor}
          roughness={R.floorRoughness}
          metalness={R.floorMetalness}
        />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, R.ceiling / 2, -R.backWall]} receiveShadow>
        <planeGeometry args={[span, R.ceiling]} />
        <meshStandardMaterial color={R.wallColor} roughness={0.95} />
      </mesh>
      {/* Side walls */}
      <mesh position={[-R.sideWall, R.ceiling / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[R.backWall * 2 + span, R.ceiling]} />
        <meshStandardMaterial color={R.wallColor} roughness={0.95} />
      </mesh>
      <mesh position={[R.sideWall, R.ceiling / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[R.backWall * 2 + span, R.ceiling]} />
        <meshStandardMaterial color={R.wallColor} roughness={0.95} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, R.ceiling, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[span, R.backWall * 2 + span]} />
        <meshStandardMaterial color={R.wallColor} roughness={1} />
      </mesh>
    </group>
  );
}

/** The round pedestal under the keyboard. */
function Podium() {
  const P = ROOM.podium;
  return (
    <mesh position={[0, P.height / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[P.radius, P.radius, P.height, 128]} />
      <meshStandardMaterial color={P.color} roughness={P.roughness} metalness={0} />
    </mesh>
  );
}

/** Dust motes drifting down through the cone of light. */
function Dust() {
  const S = ROOM.spot;
  const D = S.dust;
  const reduced = usePrefersReducedMotion();
  const points = useRef<THREE.Points>(null);

  // Each mote: position inside the cone, plus a phase for its wander.
  const { positions, phases } = useMemo(() => {
    const positions = new Float32Array(D.count * 3);
    const phases = new Float32Array(D.count);
    const tanA = Math.tan(S.angle);
    const rnd = makeRng(1337);
    for (let i = 0; i < D.count; i++) {
      const y = 0.3 + rnd() * (S.height - 0.3);
      const r = tanA * (S.height - y) * Math.sqrt(rnd());
      const a = rnd() * Math.PI * 2;
      positions[i * 3] = S.offset[0] + Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = S.offset[1] + Math.sin(a) * r;
      phases[i] = rnd() * Math.PI * 2;
    }
    return { positions, phases };
  }, [D.count, S.angle, S.height, S.offset]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, dt) => {
    if (reduced) return;
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime;
    const tanA = Math.tan(S.angle);
    const step = Math.min(dt, 0.1);
    for (let i = 0; i < D.count; i++) {
      const ix = i * 3;
      let y = arr[ix + 1] - D.speed * step;
      const ph = phases[i];
      arr[ix] += Math.sin(t * 0.5 + ph) * D.wander * step;
      arr[ix + 2] += Math.cos(t * 0.37 + ph * 1.3) * D.wander * step;
      // Keep inside the cone; respawn near the top when a mote reaches the floor.
      const maxR = tanA * (S.height - y);
      const dx = arr[ix] - S.offset[0];
      const dz = arr[ix + 2] - S.offset[1];
      const r = Math.hypot(dx, dz);
      if (y < 0.2 || r > maxR) {
        y = S.height * (0.55 + Math.random() * 0.4);
        const nr = tanA * (S.height - y) * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        arr[ix] = S.offset[0] + Math.cos(a) * nr;
        arr[ix + 2] = S.offset[1] + Math.sin(a) * nr;
      }
      arr[ix + 1] = y;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} raycast={() => null}>
      <pointsMaterial
        color={S.color}
        size={D.size}
        sizeAttenuation
        transparent
        opacity={D.opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** The one light: a spot straight down onto the board, with a visible beam. */
function Overhead() {
  const S = ROOM.spot;
  const light = useRef<THREE.SpotLight>(null);
  // Depth buffer lets the beam fade where it meets the keyboard and floor.
  const depthBuffer = useDepthBuffer({ size: 512 });
  const distance = S.height + 8;
  const radiusBottom = Math.tan(S.angle) * distance;

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(S.offset[0], 0, S.offset[1]);
    l.target.updateMatrixWorld();
  }, [S.offset]);

  return (
    <SpotLight
      ref={light}
      position={[S.offset[0], S.height, S.offset[1]]}
      angle={S.angle}
      penumbra={S.penumbra}
      intensity={S.intensity}
      color={S.color}
      distance={distance}
      decay={2}
      castShadow
      shadow-mapSize={[S.shadowMapSize, S.shadowMapSize]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-radius={S.shadowRadius}
      volumetric={S.beam.enabled}
      opacity={S.beam.opacity}
      attenuation={S.beam.attenuation}
      anglePower={S.beam.anglePower}
      radiusTop={0.4}
      radiusBottom={radiusBottom}
      depthBuffer={depthBuffer}
    />
  );
}

/** Fixed three-quarter view that fits the board to the viewport, with a
 *  little cursor parallax. */
function CameraRig() {
  const C = ROOM.camera;
  const reduced = usePrefersReducedMotion();
  const pointer = useRef({ x: 0, y: 0 });
  const orbit = useRef({ yaw: 0, pitch: 0 });
  const podiumTop = standHeight();
  const target = useMemo(
    () => new THREE.Vector3(C.lookAt[0], C.lookAt[1] + podiumTop, C.lookAt[2]),
    [C.lookAt, podiumTop],
  );

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced]);

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const aspect = state.size.width / state.size.height;
    if (cam.fov !== C.fov || cam.aspect !== aspect) {
      cam.fov = C.fov;
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
    }

    // Distance at which the board spans `fitWidth` of the view. On tall
    // viewports also make sure the board's depth fits vertically.
    const halfV = Math.tan((C.fov / 2) * DEG);
    const halfH = halfV * aspect;
    const w = ROOM.boardWidth / 2 / ROOM.fitWidth;
    const dist = Math.max(w / halfH, (w * 0.62) / halfV);

    const k = 1 - Math.pow(1 - C.smoothing, dt * 60);
    const wantYaw = pointer.current.x * C.parallaxYaw;
    const wantPitch = pointer.current.y * C.parallaxPitch;
    orbit.current.yaw += (wantYaw - orbit.current.yaw) * k;
    orbit.current.pitch += (wantPitch - orbit.current.pitch) * k;

    const yaw = (C.yaw + orbit.current.yaw) * DEG;
    const el = Math.min(88, Math.max(5, C.elevation + orbit.current.pitch)) * DEG;
    cam.position.set(
      target.x + Math.sin(yaw) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(yaw) * Math.cos(el) * dist,
    );
    cam.lookAt(target);
  });

  return null;
}

/** Renders the room (glass hidden) into the glass refraction buffer once
 *  per frame, so the ~70 transmission materials share one capture. */
function Scene({ onController }: { onController?: (c: KeyboardController) => void }) {
  // Half-float so the spotlit podium keeps its brightness through the
  // glass: an 8-bit capture clips the pool to flat grey, and every cap
  // then shows that grey instead of a bright refracted highlight.
  const buffer = useFBO({ type: THREE.HalfFloatType });
  const keyboard = useRef<THREE.Group>(null);

  const hidden = useRef<THREE.Object3D[]>([]);
  useFrame(({ gl, scene, camera }) => {
    const kb = keyboard.current;
    const list = hidden.current;
    list.length = 0;
    // Hide only the glass (and the legends riding on it): the switches and
    // stems stay in the capture so they show through the caps.
    kb?.traverse((o) => {
      if (o.userData[GLASS_FLAG] && o.visible) {
        o.visible = false;
        list.push(o);
      }
    });
    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    for (const o of list) o.visible = true;
    // Several renders per frame (this capture, the beam's depth pass, R3F's
    // own); autoUpdate is off (see DarkRoom's onCreated) so the shadow map
    // refreshes once — and only now, with the keyboard visible again, so it
    // actually casts a shadow.
    gl.shadowMap.needsUpdate = true;
  });

  const R = ROOM.room;
  return (
    <>
      <color attach="background" args={[R.fogColor]} />
      <fog attach="fog" args={[R.fogColor, R.fogNear, R.fogFar]} />
      <ambientLight intensity={R.ambient} />
      <CameraRig />
      {ROOM.skyline.enabled && <AsciiSkyline />}
      {R.geometry && <Room />}
      {ROOM.podium.enabled && <Podium />}
      {ROOM.spot.enabled && <Overhead />}
      {ROOM.spot.enabled && ROOM.spot.dust.enabled && <Dust />}
      <SpotlightKeyboard
        ref={keyboard}
        buffer={buffer.texture}
        standHeight={standHeight()}
        stand={ROOM.disc.enabled ? <IdentityDisc /> : undefined}
        onController={onController}
      />
    </>
  );
}

export default function DarkRoom({
  onController,
}: {
  onController?: (controller: KeyboardController) => void;
}) {
  return (
    <div className="fixed inset-0" style={{ background: ROOM.room.fogColor }}>
      <Canvas
        shadows="percentage"
        dpr={[1, ROOM.maxDpr]}
        camera={{ fov: ROOM.camera.fov, near: 0.5, far: 400, position: [0, 30, 40] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ touchAction: "none" }}
        onCreated={({ gl }) => {
          gl.shadowMap.autoUpdate = false;
        }}
      >
        <Suspense fallback={null}>
          <Scene onController={onController} />
        </Suspense>
      </Canvas>
    </div>
  );
}
