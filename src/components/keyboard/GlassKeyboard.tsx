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
import { GLASS, tintStrength } from "./visualConfig";

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
    const px = (cfg.small ? h * 0.3 : h * 0.42) * scale;
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
    ctx.font = font(h * 0.22 * scale, 500);
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
}: {
  layout: LayoutKey;
  depth: number;
  buffer: THREE.Texture;
  register: (id: string, trigger: GlassTrigger) => () => void;
}) {
  const { cfg, x, y, w, h } = layout;
  const group = useRef<THREE.Group>(null);
  const pressedRef = useRef(false);

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
  });

  const legend = useMemo(() => makeLegendTexture(cfg, w, h), [cfg, w, h]);
  useEffect(() => () => legend?.dispose(), [legend]);

  const radius = Math.min(w, h) * GLASS.keyRadiusFactor;

  return (
    <group position={[x, y, 0]}>
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
  );
}

function PillSlab({
  textPillEl,
  initialRect,
  viewportSize,
  buffer,
}: {
  textPillEl?: HTMLElement | null;
  initialRect: DOMRect;
  viewportSize: { width: number; height: number };
  buffer: THREE.Texture;
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
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[initialRect.width, initialRect.height, GLASS.textSlab.depth]}
      radius={Math.min(10, initialRect.height / 2 - 1)}
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
        color={tintStrength(GLASS.textSlab.color)}
      />
    </RoundedBox>
  );
}

function GlassScene({
  rect,
  pillRect,
  textPillEl,
  onController,
}: {
  rect: DOMRect | null;
  pillRect: DOMRect | null;
  textPillEl?: HTMLElement | null;
  onController?: (controller: KeyboardController) => void;
}) {
  const { size, gl, camera } = useThree();
  const buffer = useFBO();
  const [bgScene] = useState(() => new THREE.Scene());
  const [bgTexture, setBgTexture] = useState<THREE.CanvasTexture | null>(null);
  const bgTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // The dithered video canvas doubles as the refraction source.
  useEffect(() => {
    const el = document.getElementById(
      "video-backdrop",
    ) as HTMLCanvasElement | null;
    if (!el) return;
    const tex = new THREE.CanvasTexture(el);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    bgTextureRef.current = tex;
    // Syncing an external canvas into React state; runs once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBgTexture(tex);
    return () => {
      bgTextureRef.current = null;
      tex.dispose();
    };
  }, []);

  // Standard R3F render-to-target pass; the renderer and texture are meant
  // to be driven imperatively inside useFrame.
   
  useFrame(() => {
    const tex = bgTextureRef.current;
    if (tex) tex.needsUpdate = true;
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
      <ambientLight intensity={0.6} />
      <directionalLight intensity={1.6} position={[200, 400, 600]} />
      {/* Glass slab behind the typed-sentence text (the text itself stays DOM).
          Tracked imperatively every frame so it never desyncs on scroll. */}
      {pillRect && pillRect.width > 0 && (
        <PillSlab
          textPillEl={textPillEl}
          initialRect={pillRect}
          viewportSize={size}
          buffer={buffer.texture}
        />
      )}
      {/* Environment reflections keep the glass legible over dark footage.
          Suspense-isolated so the HDR fetch doesn't block the whole scene. */}
      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={GLASS.envIntensity} />
      </Suspense>
      {board && (
        <group position={[board.cx, board.cy, 0]} rotation={[GLASS.tiltX, 0, 0]}>
          {/* Frosted glass base plate behind the keys. */}
          <RoundedBox
            args={[board.w * 1.03, board.h * 1.06, board.depth * 0.5]}
            radius={board.depth * 0.3}
            smoothness={3}
            position={[0, 0, -board.depth * 0.6]}
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
          {board.keys.map((layout) => (
            <GlassKey
              key={layout.cfg.id}
              layout={layout}
              depth={board.depth}
              buffer={buffer.texture}
              register={register}
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
}: {
  onController?: (controller: KeyboardController) => void;
  /** Optional DOM element to back with a glass slab (e.g. the typed text). */
  textPillEl?: HTMLElement | null;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pillRect, setPillRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const update = () => {
      setRect(holder.getBoundingClientRect());
      setPillRect(textPillEl ? textPillEl.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener("resize", update);
    // Rects are viewport-relative while the 3D canvas is fixed, so the
    // meshes must follow the page as it scrolls.
    window.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(holder);
    if (textPillEl) observer.observe(textPillEl);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [textPillEl]);

  return (
    <>
      {/* Reserves the keyboard's spot in the page flow; the 3D scene renders
          into the fullscreen canvas below and aligns with this rect. */}
      <div
        ref={holderRef}
        aria-hidden
        style={{ width: "100%", aspectRatio: GLASS.boardAspect }}
      />
      <div className="fixed inset-0" style={{ zIndex: 5, pointerEvents: "auto" }}>
        <Canvas
          orthographic
          camera={{ position: [0, 0, 600], zoom: 1, near: 0.1, far: 2000 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 1.5]}
          style={{ background: "transparent" }}
        >
          <GlassScene
            rect={rect}
            pillRect={pillRect}
            textPillEl={textPillEl}
            onController={onController}
          />
        </Canvas>
      </div>
    </>
  );
}
