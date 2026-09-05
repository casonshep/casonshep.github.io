"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  MeshTransmissionMaterial,
  RoundedBox,
  useFBO,
} from "@react-three/drei";
import {
  ROWS,
  ROW_UNITS,
  KEY_PAN,
  getSoundCategory,
  getThockEngine,
  playKeySound,
  makeKeyboardController,
  useGlobalKeyInput,
  type KeyboardController,
  type KeyConfig,
} from "./Keyboard";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLASS, ASSEMBLY, INTRO, MELT, parseColor, tintStrength } from "./visualConfig";

// 3D glass keyboard, after https://github.com/olivierlarose/3d-distorted-glass-effect:
// keycaps are MeshTransmissionMaterial meshes that refract the ASCII video
// backdrop, which is fed into the transmission buffer as a canvas texture.
// Visual knobs live in visualConfig.ts.

const ROW_COUNT = ROWS.length;

interface LayoutKey {
  cfg: KeyConfig;
  x: number;
  y: number;
  w: number;
  h: number;
}

function layoutKeys(boardW: number, boardH: number): LayoutKey[] {
  const unit = boardW / ROW_UNITS;
  const rowH = boardH / ROW_COUNT;
  const gap = unit * GLASS.keyGapFactor;
  const keys: LayoutKey[] = [];
  ROWS.forEach((row, rowIdx) => {
    let cursor = 0;
    for (const cfg of row) {
      const width = cfg.width ?? 1;
      keys.push({
        cfg,
        x: (cursor + width / 2) * unit - boardW / 2,
        y: boardH / 2 - (rowIdx + 0.5) * rowH,
        w: width * unit - gap,
        h: rowH - gap,
      });
      cursor += width;
    }
  });
  return keys;
}

// Ease-out: pieces glide into place without overshooting or bouncing.
function assemblyEase(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, ASSEMBLY.easePower);
}

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
/** Deterministic pseudo-random in [0,1) from a key's position (+ a salt),
 *  so every render — and every visitor — gets the same shuffle. */
function hash01(x: number, y: number, salt = 0): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

// ---------------------------------------------------------------------------
// Molten glass: shared material driver for the melt sequence.
// ---------------------------------------------------------------------------
type MoltenMaterial = THREE.MeshPhysicalMaterial & {
  distortion: number;
  temporalDistortion: number;
};
// drei's ref type is a props-shaped alias; at runtime it's the material
// instance (a MeshPhysicalMaterial with the shader uniforms exposed as
// properties), which is what applyMolten drives.
type TransmissionRef = React.ComponentRef<typeof MeshTransmissionMaterial>;
const asMolten = (m: TransmissionRef | null) =>
  m as unknown as MoltenMaterial | null;

interface MoltenBase {
  color: [number, number, number];
  roughness: number;
  distortion: number;
  temporalDistortion: number;
}

const GLOW = parseColor(MELT.glowColor);
const MOLTEN_TINT = tintStrength(MELT.moltenTint);
const MOLTEN_TINT_STRENGTH = parseColor(MELT.moltenTint)[3];

/** Blends a glass material from its solid look (m = 0) to molten (m = 1):
 *  amber emissive glow, warm tint, softened surface, wobbling refraction. */
function applyMolten(mat: MoltenMaterial, base: MoltenBase, m: number) {
  const k = clamp01(m);
  mat.emissive.setRGB(GLOW[0], GLOW[1], GLOW[2]);
  mat.emissiveIntensity = GLOW[3] * MELT.glowIntensity * k;
  const tk = k * MOLTEN_TINT_STRENGTH;
  mat.color.setRGB(
    base.color[0] + (MOLTEN_TINT[0] * base.color[0] - base.color[0]) * tk,
    base.color[1] + (MOLTEN_TINT[1] * base.color[1] - base.color[1]) * tk,
    base.color[2] + (MOLTEN_TINT[2] * base.color[2] - base.color[2]) * tk,
  );
  mat.roughness = base.roughness + (MELT.moltenRoughness - base.roughness) * k;
  mat.distortion =
    base.distortion + (MELT.moltenDistortion - base.distortion) * k;
  mat.temporalDistortion =
    base.temporalDistortion +
    (MELT.moltenTemporalDistortion - base.temporalDistortion) * k;
}

const KEY_BASE: MoltenBase = {
  color: tintStrength(GLASS.key.color),
  roughness: GLASS.key.roughness,
  distortion: GLASS.key.distortion,
  temporalDistortion: GLASS.key.temporalDistortion,
};
const PLATE_BASE: MoltenBase = {
  color: tintStrength(GLASS.basePlate.color),
  roughness: GLASS.basePlate.roughness,
  distortion: 0,
  temporalDistortion: 0,
};

/** Splits a piece's local melt time t ∈ [0,1] into its phases:
 *  soft — slumping/pooling in place, drip — the tail forming,
 *  slide — the whole blob sliding off (eased), slideLinear — raw. */
function meltPhases(t: number, sagPortion: number) {
  const soft = smoothstep(t / sagPortion);
  // The tail starts forming a little before the blob lets go.
  const dripStart = sagPortion * 0.6;
  const drip = smoothstep((t - dripStart) / (1 - dripStart));
  const slideLinear = clamp01((t - sagPortion) / (1 - sagPortion));
  return {
    soft,
    drip,
    slide: Math.pow(slideLinear, MELT.fallPower),
    slideLinear,
  };
}

// ---------------------------------------------------------------------------
// Molten deformation: a vertex-shader pass injected into the transmission
// material. Rigid scaling reads as "stiff", so instead every vertex moves:
// the cap slumps flat and squats, spreads sideways (most at the bottom, so
// neighbours run together into one pool), wobbles like a liquid surface,
// and finally its underside stretches into a tapering tail. The rounded
// box is built with face subdivisions so those curves have vertices.
// ---------------------------------------------------------------------------
interface MeltUniforms {
  uSoft: { value: number };
  uDrip: { value: number };
  uH: { value: number };
  uW: { value: number };
  uSeed: { value: number };
  uAmp: { value: number };
  uMeltTime: { value: number };
}

const f = (n: number) => n.toFixed(4);
const MELT_VERTEX_CHUNK = `
#include <begin_vertex>
{
  // 0 at the top edge of the piece … 1 at its bottom edge.
  float ny = clamp(0.5 - transformed.y / uH, 0.0, 1.0);
  float soft = uSoft * uAmp;
  // Slump: collapse toward the plate and squat.
  transformed.z *= 1.0 - soft * ${f(MELT.slump)};
  transformed.y *= 1.0 - soft * ${f(MELT.squash)};
  // Pool: spread sideways, mostly at the base, into the neighbours.
  transformed.x *= 1.0 + soft * ${f(MELT.spread)} * (0.35 + 0.65 * ny);
  transformed.y -= soft * ${f(MELT.spread)} * uH * 0.12 * ny;
  // Liquid wobble.
  float wobY = sin(transformed.y * (6.2831 / uH) * 1.3 + uSeed + uMeltTime);
  float wobX = cos(transformed.x * (6.2831 / uW) * 0.9 + uSeed * 1.7 + uMeltTime * 0.8);
  transformed.x += wobY * soft * uW * ${f(MELT.wobble)};
  transformed.z += wobX * soft * uH * ${f(MELT.wobble)} * 0.6;
  transformed.y += wobX * soft * uH * ${f(MELT.wobble)} * 0.4;
  // Drip: the underside stretches into a tapering tail.
  float tail = ny * ny * uDrip * uAmp;
  transformed.y -= tail * uH * ${f(MELT.tailLength)};
  transformed.x *= 1.0 - tail * ${f(MELT.tailNarrow)};
  transformed.z *= 1.0 - tail * 0.5;
}
`;
const MELT_VERTEX_HEADER = `
#ifndef MELT_UNIFORMS
#define MELT_UNIFORMS
uniform float uSoft;
uniform float uDrip;
uniform float uH;
uniform float uW;
uniform float uSeed;
uniform float uAmp;
uniform float uMeltTime;
#endif
`;

const meltInstalled = new WeakSet<THREE.Material>();

/** Wraps the material's compile hook (drei installs its own) to add the
 *  melt uniforms and vertex pass. Safe to call every frame: no-op once done. */
function ensureMeltShader(mat: MoltenMaterial, uniforms: MeltUniforms) {
  if (meltInstalled.has(mat)) return;
  meltInstalled.add(mat);
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    prev.call(mat, shader, renderer);
    // drei replaces shader.uniforms wholesale, so add ours afterwards.
    Object.assign(shader.uniforms, uniforms);
    if (shader.vertexShader.includes("MELT_UNIFORMS")) return; // already patched
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${MELT_VERTEX_HEADER}`)
      .replace("#include <begin_vertex>", MELT_VERTEX_CHUNK);
  };
  const prevKey = mat.customProgramCacheKey.bind(mat);
  mat.customProgramCacheKey = () => `${prevKey()}|melt`;
  mat.needsUpdate = true;
}

function makeMeltUniforms(w: number, h: number, seed: number, amp: number): MeltUniforms {
  return {
    uSoft: { value: 0 },
    uDrip: { value: 0 },
    uH: { value: h },
    uW: { value: w },
    uSeed: { value: seed * Math.PI * 2 },
    uAmp: { value: amp },
    uMeltTime: { value: 0 },
  };
}

/** Rounded box with face subdivisions (so the melt has vertices to bend). */
function useMeltGeometry(w: number, h: number, d: number, radius: number, segments: number) {
  const geo = useMemo(
    () => new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, Math.min(w, h, d) / 2)),
    [w, h, d, radius, segments],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

function makeLegendTexture(
  cfg: KeyConfig,
  w: number,
  h: number,
): THREE.CanvasTexture | null {
  if (!cfg.label && !cfg.shiftLabel) return null;
  const scale = 4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(w * scale));
  canvas.height = Math.max(2, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const font = (px: number, weight: number) =>
    `${weight} ${Math.round(px)}px ui-monospace, Menlo, monospace`;

  if (cfg.label) {
    const px =
      (cfg.small ? h * GLASS.legend.smallScale : h * GLASS.legend.mainScale) *
      scale;
    ctx.font = font(px, cfg.small ? 600 : 700);
    ctx.fillStyle = GLASS.legend.ink;
    ctx.textBaseline = "middle";
    if (cfg.align === "left") {
      ctx.textAlign = "left";
      ctx.fillText(cfg.label, h * 0.22 * scale, canvas.height * 0.62);
    } else {
      ctx.textAlign = "center";
      ctx.fillText(cfg.label, canvas.width / 2, canvas.height * 0.58);
    }
  }
  if (cfg.shiftLabel) {
    ctx.font = font(h * GLASS.legend.shiftScale * scale, 500);
    ctx.fillStyle = GLASS.legend.soft;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(cfg.shiftLabel, h * 0.18 * scale, h * 0.12 * scale);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

type GlassTrigger = { press: () => void; release: () => void };

function GlassKey({
  layout,
  depth,
  buffer,
  register,
  assemblyDelay,
  dropDistance,
  timeline,
  melt,
  meltDelay,
  fallDistance,
}: {
  layout: LayoutKey;
  depth: number;
  buffer: THREE.Texture;
  register: (id: string, trigger: GlassTrigger) => () => void;
  assemblyDelay?: number;
  dropDistance?: number;
  /** Scroll-scrubbed assembly time in virtual ms; see GlassScene. */
  timeline: React.RefObject<number>;
  /** Scroll-scrubbed melt progress 0..1; see GlassScene. */
  melt: React.RefObject<number>;
  /** When (in melt progress) this key starts melting. [0 … MELT.stagger] */
  meltDelay: number;
  /** How far (px) the key falls once it lets go. */
  fallDistance: number;
}) {
  const { cfg, x, y, w, h } = layout;
  const group = useRef<THREE.Group>(null);
  const assemblyRef = useRef<THREE.Group>(null);
  const meltRef = useRef<THREE.Group>(null);
  const matRef = useRef<TransmissionRef>(null);
  const legendMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const lastMeltT = useRef(-1);
  const pressedRef = useRef(false);

  // Per-key randomness for the melt: sideways drift and spin while sliding.
  const meltRand = useMemo(
    () => ({
      drift: (hash01(x, y, 1) * 2 - 1) * MELT.fallDrift,
      spin: ((hash01(x, y, 2) * 2 - 1) * MELT.fallSpin * Math.PI) / 180,
    }),
    [x, y],
  );
  // Shader uniforms are mutated per frame, so they live in a ref.
  const meltUniformsRef = useRef<MeltUniforms>(
    makeMeltUniforms(w, h, hash01(x, y, 4), 1),
  );

  const tumbleAngle = useMemo(() => {
    if (!ASSEMBLY.enabled) return 0;
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return ((s - Math.floor(s)) * 2 - 1) * ASSEMBLY.tumbleRange * Math.PI / 180;
  }, [x, y]);

  useEffect(
    () =>
      register(cfg.id, {
        press: () => {
          pressedRef.current = true;
        },
        release: () => {
          pressedRef.current = false;
        },
      }),
    [cfg.id, register],
  );

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const target = pressedRef.current ? -depth * GLASS.pressTravelFactor : 0;
    g.position.z +=
      (target - g.position.z) * Math.min(1, dt * GLASS.pressSpeed);

    const a = assemblyRef.current;
    if (a && assemblyDelay != null && dropDistance) {
      const elapsed = (timeline.current ?? 0) - assemblyDelay;
      if (elapsed >= ASSEMBLY.keyDuration) {
        a.position.y = 0;
        a.rotation.z = 0;
        a.visible = true;
      } else {
        a.visible = elapsed > 0;
        const t = Math.max(elapsed / ASSEMBLY.keyDuration, 0);
        const progress = assemblyEase(t);
        a.position.y = Math.abs((1 - progress) * dropDistance);
        a.rotation.z = (1 - progress) * tumbleAngle;
      }
    }

    // Melt: slump and pool in place (vertex shader), then slide off slowly.
    const mg = meltRef.current;
    const mat = asMolten(matRef.current);
    const meltUniforms = meltUniformsRef.current;
    if (mg && mat) {
      ensureMeltShader(mat, meltUniforms);
      meltUniforms.uMeltTime.value = state.clock.elapsedTime * MELT.wobbleSpeed;
      meltUniforms.uH.value = h;
      meltUniforms.uW.value = w;
      const duration = Math.max(0.05, 1 - MELT.stagger);
      const t = clamp01(((melt.current ?? 0) - meltDelay) / duration);
      if (t !== lastMeltT.current) {
        lastMeltT.current = t;
        const { soft, drip, slide, slideLinear } = meltPhases(t, MELT.sagPortion);
        meltUniforms.uSoft.value = soft;
        meltUniforms.uDrip.value = drip;
        // Sink onto the plate as it softens, then slide off.
        mg.position.z = -depth * MELT.sink * soft;
        mg.position.y = -slide * fallDistance;
        mg.position.x = meltRand.drift * w * slideLinear;
        mg.rotation.z = meltRand.spin * slideLinear;
        mg.visible = slide < 1;
        applyMolten(mat, KEY_BASE, soft);
        if (legendMatRef.current) {
          legendMatRef.current.opacity = 1 - clamp01(soft * 1.6);
        }
      }
    }
  });

  const legend = useMemo(() => makeLegendTexture(cfg, w, h), [cfg, w, h]);
  useEffect(() => () => legend?.dispose(), [legend]);

  const radius = Math.min(w, h) * GLASS.keyRadiusFactor;
  const geometry = useMeltGeometry(w, h, depth, radius, MELT.keySegments);

  return (
    <group position={[x, y, 0]}>
      <group ref={assemblyRef}>
      <group ref={meltRef}>
        <group ref={group}>
          <mesh
            geometry={geometry}
            onPointerDown={(e) => {
              e.stopPropagation();
              pressedRef.current = true;
              playKeySound(
                getSoundCategory(cfg.id),
                !!cfg.muted,
                KEY_PAN[cfg.id] ?? 0,
              );
            }}
            onPointerUp={() => {
              pressedRef.current = false;
            }}
            onPointerLeave={() => {
              pressedRef.current = false;
            }}
          >
            <MeshTransmissionMaterial
              ref={matRef}
              buffer={buffer}
              transmission={1}
              thickness={depth * GLASS.key.thicknessFactor}
              roughness={GLASS.key.roughness}
              ior={GLASS.key.ior}
              chromaticAberration={GLASS.key.chromaticAberration}
              anisotropicBlur={GLASS.key.anisotropicBlur}
              distortion={GLASS.key.distortion}
              distortionScale={GLASS.key.distortionScale}
              temporalDistortion={GLASS.key.temporalDistortion}
              color={tintStrength(GLASS.key.color)}
            />
          </mesh>
          {legend && (
            <mesh position={[0, 0, depth / 2 + 0.6]}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial
                ref={legendMatRef}
                map={legend}
                transparent
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          )}
        </group>
      </group>
      </group>
    </group>
  );
}

function AnimatedBasePlate({
  width,
  height,
  depth,
  buffer,
  riseDistance,
  timeline,
  melt,
  fallDistance,
}: {
  width: number;
  height: number;
  depth: number;
  buffer: THREE.Texture;
  riseDistance: number;
  timeline: React.RefObject<number>;
  /** Scroll-scrubbed melt progress 0..1; see GlassScene. */
  melt: React.RefObject<number>;
  fallDistance: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meltRef = useRef<THREE.Group>(null);
  const matRef = useRef<TransmissionRef>(null);
  const lastMeltT = useRef(-1);
  const plateW = width * GLASS.basePlate.widthFactor;
  const plateH = height * GLASS.basePlate.heightFactor;
  const plateD = depth * GLASS.basePlate.depthScale;
  const meltUniformsRef = useRef<MeltUniforms>(
    makeMeltUniforms(plateW, plateH, 0.37, MELT.plateAmount),
  );
  const geometry = useMeltGeometry(
    plateW,
    plateH,
    plateD,
    depth * GLASS.basePlate.radiusFactor,
    MELT.plateSegments,
  );

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const elapsed = timeline.current ?? 0;
    if (elapsed >= ASSEMBLY.baseDuration) {
      g.position.y = 0;
    } else {
      const t = Math.max(elapsed / ASSEMBLY.baseDuration, 0);
      const progress = assemblyEase(t);
      g.position.y = -(1 - progress) * riseDistance;
    }
    g.visible = true;

    // Melt: the plate lets go after most keys have (MELT.plateDelay).
    const mg = meltRef.current;
    const mat = asMolten(matRef.current);
    const meltUniforms = meltUniformsRef.current;
    if (mg && mat) {
      ensureMeltShader(mat, meltUniforms);
      meltUniforms.uMeltTime.value = state.clock.elapsedTime * MELT.wobbleSpeed;
      meltUniforms.uH.value = plateH;
      meltUniforms.uW.value = plateW;
      const duration = Math.max(0.05, 1 - MELT.plateDelay);
      const t = clamp01(((melt.current ?? 0) - MELT.plateDelay) / duration);
      if (t !== lastMeltT.current) {
        lastMeltT.current = t;
        const { soft, drip, slide } = meltPhases(t, MELT.sagPortion);
        meltUniforms.uSoft.value = soft;
        meltUniforms.uDrip.value = drip;
        mg.position.y = -slide * fallDistance;
        mg.visible = slide < 1;
        applyMolten(mat, PLATE_BASE, soft);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={meltRef}>
      <mesh
        geometry={geometry}
        position={[0, 0, -depth * GLASS.basePlate.zOffsetFactor]}
      >
        <MeshTransmissionMaterial
          ref={matRef}
          buffer={buffer}
          transmission={1}
          thickness={depth * GLASS.basePlate.thicknessFactor}
          roughness={GLASS.basePlate.roughness}
          ior={GLASS.basePlate.ior}
          chromaticAberration={GLASS.basePlate.chromaticAberration}
          anisotropicBlur={GLASS.basePlate.anisotropicBlur}
          color={tintStrength(GLASS.basePlate.color)}
        />
      </mesh>
      </group>
    </group>
  );
}

function PillSlab({
  textPillEl,
  initialRect,
  viewportSize,
  buffer,
  cursorTilt,
}: {
  textPillEl?: HTMLElement | null;
  initialRect: DOMRect;
  viewportSize: { width: number; height: number };
  buffer: THREE.Texture;
  cursorTilt?: { current: { x: number; y: number } };
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !textPillEl) return;
    const r = textPillEl.getBoundingClientRect();
    mesh.position.x = r.x + r.width / 2 - viewportSize.width / 2;
    mesh.position.y = viewportSize.height / 2 - (r.y + r.height / 2);
    mesh.position.z = -6;
    mesh.scale.x = r.width / initialRect.width;
    mesh.scale.y = r.height / initialRect.height;
    if (cursorTilt) {
      const f = GLASS.cursorTilt.slabFactor;
      mesh.rotation.x = cursorTilt.current.x * f;
      mesh.rotation.y = cursorTilt.current.y * f;
    }
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[initialRect.width, initialRect.height, GLASS.textSlab.depth]}
      radius={Math.min(GLASS.textSlab.radius, initialRect.height / 2 - 1)}
      smoothness={3}
      position={[
        initialRect.x + initialRect.width / 2 - viewportSize.width / 2,
        viewportSize.height / 2 - (initialRect.y + initialRect.height / 2),
        -6,
      ]}
    >
      <MeshTransmissionMaterial
        buffer={buffer}
        transmission={1}
        thickness={GLASS.textSlab.thickness}
        roughness={GLASS.textSlab.roughness}
        ior={GLASS.textSlab.ior}
        chromaticAberration={GLASS.textSlab.chromaticAberration}
        anisotropicBlur={GLASS.textSlab.anisotropicBlur}
        distortion={GLASS.textSlab.distortion}
        distortionScale={GLASS.textSlab.distortionScale}
        temporalDistortion={GLASS.textSlab.temporalDistortion}
        color={tintStrength(GLASS.textSlab.color)}
      />
    </RoundedBox>
  );
}

function LinkSlab({
  el,
  initialRect,
  viewportSize,
  buffer,
  cursorTilt,
}: {
  el: HTMLElement;
  initialRect: DOMRect;
  viewportSize: { width: number; height: number };
  buffer: THREE.Texture;
  cursorTilt?: { current: { x: number; y: number } };
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const r = el.getBoundingClientRect();
    mesh.position.x = r.x + r.width / 2 - viewportSize.width / 2;
    mesh.position.y = viewportSize.height / 2 - (r.y + r.height / 2);
    mesh.position.z = -6;
    mesh.scale.x = r.width / initialRect.width;
    mesh.scale.y = r.height / initialRect.height;
    if (cursorTilt) {
      const f = GLASS.cursorTilt.slabFactor;
      mesh.rotation.x = cursorTilt.current.x * f;
      mesh.rotation.y = cursorTilt.current.y * f;
    }
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[initialRect.width, initialRect.height, GLASS.linkSlab.depth]}
      radius={Math.min(GLASS.linkSlab.radius, initialRect.height / 2 - 1)}
      smoothness={3}
      position={[
        initialRect.x + initialRect.width / 2 - viewportSize.width / 2,
        viewportSize.height / 2 - (initialRect.y + initialRect.height / 2),
        -6,
      ]}
    >
      <MeshTransmissionMaterial
        buffer={buffer}
        transmission={1}
        thickness={GLASS.linkSlab.thickness}
        roughness={GLASS.linkSlab.roughness}
        ior={GLASS.linkSlab.ior}
        chromaticAberration={GLASS.linkSlab.chromaticAberration}
        anisotropicBlur={GLASS.linkSlab.anisotropicBlur}
        distortion={GLASS.linkSlab.distortion}
        distortionScale={GLASS.linkSlab.distortionScale}
        temporalDistortion={GLASS.linkSlab.temporalDistortion}
        color={tintStrength(GLASS.linkSlab.color)}
      />
    </RoundedBox>
  );
}

function GlassScene({
  rect,
  pillRect,
  textPillEl,
  linkEls,
  linkRects,
  holderRef,
  onController,
}: {
  rect: DOMRect | null;
  pillRect: DOMRect | null;
  textPillEl?: HTMLElement | null;
  linkEls?: (HTMLElement | null)[];
  linkRects?: (DOMRect | null)[];
  holderRef: React.RefObject<HTMLDivElement | null>;
  onController?: (controller: KeyboardController) => void;
}) {
  const { size, gl, camera } = useThree();
  const buffer = useFBO();
  const [bgScene] = useState(() => new THREE.Scene());
  const [bgTexture, setBgTexture] = useState<THREE.CanvasTexture | null>(null);
  const bgTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // The dithered video canvas doubles as the refraction source.
  // Tracks the canvas dimensions the current texture was built around, so a
  // resize forces a rebuild (fresh GPU storage) instead of trusting in-place
  // re-uploads — those are where the refraction can get stuck on stale
  // frames on some drivers.
  const bgTexSize = useRef({ w: 0, h: 0 });

  const rebuildBgTexture = useCallback((el: HTMLCanvasElement) => {
    bgTextureRef.current?.dispose();
    const tex = new THREE.CanvasTexture(el);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    bgTextureRef.current = tex;
    bgTexSize.current = { w: el.width, h: el.height };
    setBgTexture(tex);
  }, []);

  useEffect(() => {
    return () => {
      bgTextureRef.current?.dispose();
      bgTextureRef.current = null;
    };
  }, []);

  // Standard R3F render-to-target pass; the renderer and texture are meant
  // to be driven imperatively inside useFrame.

  useFrame(() => {
    // Re-resolve the backdrop canvas every frame: if the element was
    // replaced (remount) or resized, rebuild the texture so the glass never
    // keeps refracting a stale frame of an old/detached canvas.
    const el = document.getElementById(
      "video-backdrop",
    ) as HTMLCanvasElement | null;
    const tex = bgTextureRef.current;
    if (el && el.width > 0 && el.height > 0) {
      if (
        !tex ||
        tex.image !== el ||
        bgTexSize.current.w !== el.width ||
        bgTexSize.current.h !== el.height
      ) {
        rebuildBgTexture(el);
      } else {
        tex.needsUpdate = true;
      }
    }
    gl.setRenderTarget(buffer);
    gl.render(bgScene, camera);
    gl.setRenderTarget(null);
  });
   

  const triggers = useRef<Map<string, GlassTrigger>>(new Map());
  const register = useCallback((id: string, trigger: GlassTrigger) => {
    triggers.current.set(id, trigger);
    return () => {
      if (triggers.current.get(id) === trigger) triggers.current.delete(id);
    };
  }, []);
  const pressKey = useCallback(
    (id: string) => triggers.current.get(id)?.press(),
    [],
  );
  const releaseKey = useCallback(
    (id: string) => triggers.current.get(id)?.release(),
    [],
  );

  useEffect(() => {
    onController?.(makeKeyboardController(pressKey, releaseKey));
  }, [onController, pressKey, releaseKey]);
  useEffect(() => {
    void getThockEngine();
  }, []);
  useGlobalKeyInput(pressKey, releaseKey);

  const board = useMemo(() => {
    if (!rect) return null;
    return {
      cx: rect.x + rect.width / 2 - size.width / 2,
      cy: size.height / 2 - (rect.y + rect.height / 2),
      keys: layoutKeys(rect.width, rect.height),
      depth: (rect.width / ROW_UNITS) * GLASS.keyDepthFactor,
      w: rect.width,
      h: rect.height,
    };
  }, [rect, size.width, size.height]);

  const assemblyDelays = useMemo(() => {
    if (!ASSEMBLY.enabled || !board) return null;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    const keyStart = ASSEMBLY.baseDuration * ASSEMBLY.keyStartOffset;
    // Fully random landing order: each key hashes its position into a
    // delay anywhere in the stagger window.
    const keyDelays = board.keys.map(({ x, y }) => {
      const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const rand = s - Math.floor(s);
      return keyStart + rand * ASSEMBLY.keyStagger;
    });
    return { keyDelays };
  }, [board]);

  const dropDist = assemblyDelays ? size.height * ASSEMBLY.keyDropHeight : 0;
  const riseDist = assemblyDelays ? size.height * ASSEMBLY.baseRiseHeight : 0;

  // Melt sequence (see MELT in visualConfig): progress 0..1 scrubbed by the
  // scroll range that follows the assembly and typing runways.
  const meltEnabled = useMemo(
    () =>
      MELT.enabled &&
      !(
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ),
    [],
  );
  const melt = useRef(0);
  const meltDelays = useMemo(() => {
    if (!board) return null;
    // Each key's start time within the stagger window: a shuffle, biased
    // by row so the melt can pool from the bottom (or drip from the top).
    return board.keys.map(({ x, y }) => {
      const rowFrac = board.h > 0 ? 0.5 - y / board.h : 0.5; // 0 top … 1 bottom
      const rand = hash01(x, y, 3);
      const bias = MELT.rowBias;
      const order =
        bias >= 0
          ? rand * (1 - bias) + (1 - rowFrac) * bias
          : rand * (1 + bias) + rowFrac * -bias;
      return clamp01(order) * MELT.stagger;
    });
  }, [board]);
  const fallDist = size.height * MELT.fallHeight;

  const assemblyEndMs = useMemo(() => {
    if (!assemblyDelays) return 0;
    return Math.max(...assemblyDelays.keyDelays) + ASSEMBLY.keyDuration;
  }, [assemblyDelays]);

  const boardGroupRef = useRef<THREE.Group>(null);
  const cursorTilt = useRef({ x: 0, y: 0 });

  // Assembly timeline in virtual ms, scrubbed by scroll: 0 at the top of
  // the page, assemblyEndMs once the visitor has scrolled scrollRange
  // viewport-heights. Scrolling back up reverses the build.
  const timeline = useRef(0);

  // The canvas is pointer-events:none (so the drift wall behind stays
  // clickable) and R3F events attach to the keyboard holder instead, so
  // the cursor tilt tracks the pointer via a window listener.
  const pointerNorm = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerNorm.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerNorm.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, dt) => {
    if (assemblyDelays && assemblyEndMs > 0) {
      const range = window.innerHeight * ASSEMBLY.scrollRange;
      const scrollProgress =
        range > 0 ? Math.min(Math.max(window.scrollY / range, 0), 1) : 1;
      timeline.current = scrollProgress * assemblyEndMs;
    } else {
      timeline.current = assemblyEndMs;
    }

    if (meltEnabled) {
      const vh = window.innerHeight;
      const start =
        vh * ((ASSEMBLY.enabled ? ASSEMBLY.scrollRange : 0) + INTRO.scrollRange);
      const span = Math.max(1, vh * MELT.scrollRange);
      melt.current = clamp01((window.scrollY - start) / span);
    } else {
      melt.current = 0;
    }

    const g = boardGroupRef.current;
    if (!g) return;

    const el = holderRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      g.position.x = r.x + r.width / 2 - size.width / 2;
      g.position.y = size.height / 2 - (r.y + r.height / 2);
    }

    // Smooth cursor-tracking tilt
    const lerpFactor = 1 - Math.pow(1 - GLASS.cursorTilt.smoothing, dt * 60);
    const targetX = -pointerNorm.current.y * GLASS.cursorTilt.strength;
    const targetY = pointerNorm.current.x * GLASS.cursorTilt.strength;
    cursorTilt.current.x += (targetX - cursorTilt.current.x) * lerpFactor;
    cursorTilt.current.y += (targetY - cursorTilt.current.y) * lerpFactor;

    // Compute base rotation
    let baseRotX = GLASS.tiltX;
    let baseRotY = 0;

    if (assemblyDelays && assemblyEndMs > 0) {
      const progress = Math.min(timeline.current / assemblyEndMs, 1);
      if (progress < 1) {
        const eased = assemblyEase(progress);
        baseRotX = ASSEMBLY.startTiltX + (GLASS.tiltX - ASSEMBLY.startTiltX) * eased;
        baseRotY = ASSEMBLY.startRotateY * (1 - eased);
      } else {
        baseRotY = Math.sin(state.clock.elapsedTime * ASSEMBLY.idleSpeed * Math.PI * 2) * ASSEMBLY.idleAmplitude;
      }
    }

    // Melting: ease the board a little further toward the viewer.
    baseRotX += MELT.tiltX * smoothstep(melt.current);

    g.rotation.x = baseRotX + cursorTilt.current.x;
    g.rotation.y = baseRotY + cursorTilt.current.y;
  });

  return (
    <>
      {bgTexture &&
        createPortal(
          // Mounted only once the texture exists so the material compiles
          // with the map from the start (a later map assignment would not
          // trigger a shader rebuild).
          <mesh position={[0, 0, -200]}>
            <planeGeometry args={[size.width, size.height]} />
            <meshBasicMaterial map={bgTexture} toneMapped={false} />
          </mesh>,
          bgScene,
        )}
      <ambientLight intensity={GLASS.lights.ambient} />
      <directionalLight
        intensity={GLASS.lights.directional}
        position={[...GLASS.lights.directionalPosition]}
      />
      {/* Glass slab behind the typed-sentence text (the text itself stays DOM).
          Tracked imperatively every frame so it never desyncs on scroll. */}
      {pillRect && pillRect.width > 0 && (
        <PillSlab
          textPillEl={textPillEl}
          initialRect={pillRect}
          viewportSize={size}
          buffer={buffer.texture}
          cursorTilt={cursorTilt}
        />
      )}
      {linkEls?.map((el, i) => {
        const r = linkRects?.[i];
        if (!el || !r || r.width <= 0) return null;
        return (
          <LinkSlab
            key={i}
            el={el}
            initialRect={r}
            viewportSize={size}
            buffer={buffer.texture}
            cursorTilt={cursorTilt}
          />
        );
      })}
      {/* Environment reflections keep the glass legible over dark footage.
          Suspense-isolated so the HDR fetch doesn't block the whole scene. */}
      <Suspense fallback={null}>
        <Environment
          preset={GLASS.envPreset}
          environmentIntensity={GLASS.envIntensity}
        />
      </Suspense>
      {board && (
        <group ref={boardGroupRef} position={[board.cx, board.cy, 0]}>
          {/* Handles both the assembly rise and the melt; with assembly
              off riseDist is 0, so it simply sits in place. */}
          <AnimatedBasePlate
            width={board.w}
            height={board.h}
            depth={board.depth}
            buffer={buffer.texture}
            riseDistance={riseDist}
            timeline={timeline}
            melt={melt}
            fallDistance={fallDist}
          />
          {board.keys.map((layout, i) => (
            <GlassKey
              key={layout.cfg.id}
              layout={layout}
              depth={board.depth}
              buffer={buffer.texture}
              register={register}
              assemblyDelay={assemblyDelays?.keyDelays[i]}
              dropDistance={dropDist}
              timeline={timeline}
              melt={melt}
              meltDelay={meltDelays?.[i] ?? 0}
              fallDistance={fallDist}
            />
          ))}
        </group>
      )}
    </>
  );
}

export default function GlassKeyboard({
  onController,
  textPillEl,
  linkEls,
}: {
  onController?: (controller: KeyboardController) => void;
  textPillEl?: HTMLElement | null;
  linkEls?: (HTMLElement | null)[];
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pillRect, setPillRect] = useState<DOMRect | null>(null);
  const [linkRects, setLinkRects] = useState<(DOMRect | null)[]>([]);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const update = () => {
      setRect(holder.getBoundingClientRect());
      setPillRect(textPillEl ? textPillEl.getBoundingClientRect() : null);
      if (linkEls) {
        setLinkRects(linkEls.map((el) => el?.getBoundingClientRect() ?? null));
      }
    };
    update();
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(holder);
    if (textPillEl) observer.observe(textPillEl);
    linkEls?.forEach((el) => { if (el) observer.observe(el); });
    return () => {
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [textPillEl, linkEls]);

  return (
    <>
      {/* Reserves the keyboard's spot in the page flow; the 3D scene renders
          into the fullscreen canvas below and aligns with this rect. It is
          also the R3F event source: the fullscreen canvas itself ignores
          pointer events so the drift-wall tiles behind it stay hoverable
          and clickable everywhere outside the keyboard's footprint. */}
      <div
        ref={holderRef}
        aria-hidden
        style={{
          width: "100%",
          aspectRatio: GLASS.boardAspect,
          pointerEvents: "auto",
          touchAction: "none",
        }}
      />
      <div className="fixed inset-0" style={{ zIndex: 5, pointerEvents: "none" }}>
        <Canvas
          orthographic
          camera={{ position: [0, 0, 600], zoom: 1, near: 0.1, far: 2000 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, GLASS.maxDpr]}
          style={{ background: "transparent" }}
          eventSource={holderRef as React.RefObject<HTMLElement>}
          eventPrefix="client"
        >
          <GlassScene
            rect={rect}
            pillRect={pillRect}
            textPillEl={textPillEl}
            linkEls={linkEls}
            linkRects={linkRects}
            holderRef={holderRef}
            onController={onController}
          />
        </Canvas>
      </div>
    </>
  );
}
