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
import { GLASS, ASSEMBLY, tintStrength } from "./visualConfig";

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
}: {
  layout: LayoutKey;
  depth: number;
  buffer: THREE.Texture;
  register: (id: string, trigger: GlassTrigger) => () => void;
  assemblyDelay?: number;
  dropDistance?: number;
  /** Scroll-scrubbed assembly time in virtual ms; see GlassScene. */
  timeline: React.RefObject<number>;
}) {
  const { cfg, x, y, w, h } = layout;
  const group = useRef<THREE.Group>(null);
  const assemblyRef = useRef<THREE.Group>(null);
  const pressedRef = useRef(false);

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

  useFrame((_, dt) => {
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
  });

  const legend = useMemo(() => makeLegendTexture(cfg, w, h), [cfg, w, h]);
  useEffect(() => () => legend?.dispose(), [legend]);

  const radius = Math.min(w, h) * GLASS.keyRadiusFactor;

  return (
    <group position={[x, y, 0]}>
      <group ref={assemblyRef}>
        <group ref={group}>
          <RoundedBox
            args={[w, h, depth]}
            radius={radius}
            smoothness={3}
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
          </RoundedBox>
          {legend && (
            <mesh position={[0, 0, depth / 2 + 0.6]}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial
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
  );
}

function AnimatedBasePlate({
  width,
  height,
  depth,
  buffer,
  riseDistance,
  timeline,
}: {
  width: number;
  height: number;
  depth: number;
  buffer: THREE.Texture;
  riseDistance: number;
  timeline: React.RefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
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
  });

  return (
    <group ref={groupRef}>
      <RoundedBox
        args={[
          width * GLASS.basePlate.widthFactor,
          height * GLASS.basePlate.heightFactor,
          depth * GLASS.basePlate.depthScale,
        ]}
        radius={depth * GLASS.basePlate.radiusFactor}
        smoothness={3}
        position={[0, 0, -depth * GLASS.basePlate.zOffsetFactor]}
      >
        <MeshTransmissionMaterial
          buffer={buffer}
          transmission={1}
          thickness={depth * GLASS.basePlate.thicknessFactor}
          roughness={GLASS.basePlate.roughness}
          ior={GLASS.basePlate.ior}
          chromaticAberration={GLASS.basePlate.chromaticAberration}
          anisotropicBlur={GLASS.basePlate.anisotropicBlur}
          color={tintStrength(GLASS.basePlate.color)}
        />
      </RoundedBox>
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
          {assemblyDelays ? (
            <AnimatedBasePlate
              width={board.w}
              height={board.h}
              depth={board.depth}
              buffer={buffer.texture}
              riseDistance={riseDist}
              timeline={timeline}
            />
          ) : (
            <RoundedBox
              args={[
                board.w * GLASS.basePlate.widthFactor,
                board.h * GLASS.basePlate.heightFactor,
                board.depth * GLASS.basePlate.depthScale,
              ]}
              radius={board.depth * GLASS.basePlate.radiusFactor}
              smoothness={3}
              position={[0, 0, -board.depth * GLASS.basePlate.zOffsetFactor]}
            >
              <MeshTransmissionMaterial
                buffer={buffer.texture}
                transmission={1}
                thickness={board.depth * GLASS.basePlate.thicknessFactor}
                roughness={GLASS.basePlate.roughness}
                ior={GLASS.basePlate.ior}
                chromaticAberration={GLASS.basePlate.chromaticAberration}
                anisotropicBlur={GLASS.basePlate.anisotropicBlur}
                color={tintStrength(GLASS.basePlate.color)}
              />
            </RoundedBox>
          )}
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
