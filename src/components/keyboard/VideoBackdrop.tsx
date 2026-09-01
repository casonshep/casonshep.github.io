"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BACKDROP } from "./visualConfig";
import { asciifyFrame, measureAsciiGrid } from "./ascii";

// The backdrop is rendered in two stages:
//  1. A 2D pipeline (offscreen) turns the current video frame into ascii —
//     clip cycling/morphing, crop/fit, auto edge fill all happen here at
//     BACKDROP.targetFps.
//  2. A WebGL composite (the visible #video-backdrop canvas) runs every
//     animation frame: pointer movement stamps soft waves into an additive
//     displacement field (after reactbits' RippleDistortion), and a shader
//     pushes the ascii "water" along the field with swirl + chromatic
//     dispersion. Where the water is displaced hard, the raw HD video frame
//     is revealed underneath. The glass keyboard samples this canvas, so it
//     refracts the rippled result.

const MAX_WAVES = 100;
const WAVE_START_SCALE = 1.5;
const LIFE_CONSTANT = Math.log(500);
/** Displacement-field resolution as a fraction of the screen. */
const FIELD_SCALE = 0.4;
/** Wave-stamp sprite resolution. */
const SPRITE_SIZE = 128;

const COMPOSITE_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const COMPOSITE_FRAG = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uAscii;
uniform sampler2D uField;
uniform sampler2D uVideo;
uniform vec2 uResolution;
uniform float uStrengthPx;
uniform float uSwirl;
uniform float uDispersion;
uniform float uReveal;
uniform float uHasVideo;
uniform vec4 uVideoDst; // dest rect of the clip on screen, top-origin uv
uniform vec4 uVideoSrc; // source rect within the clip, top-origin uv

const float TAU = 6.283185307179586;

void main() {
  // All textures are uploaded unflipped, so sample in canvas space
  // (origin at the top-left).
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);

  float amount = texture2D(uField, uv).r;

  // Push direction rotates with intensity — the liquid swirl smear.
  float theta = amount * uSwirl * TAU;
  vec2 dir = vec2(sin(theta), cos(theta));
  vec2 push = dir * amount * (uStrengthPx / uResolution);

  // Chromatic dispersion: R/G/B sampled at slightly different pushes.
  float split = uDispersion * 0.25;
  vec3 col;
  col.r = texture2D(uAscii, uv + push * (1.0 + split)).r;
  col.g = texture2D(uAscii, uv + push).g;
  col.b = texture2D(uAscii, uv + push * (1.0 - split)).b;

  // Where the water is pushed hard, the raw HD frame shows through.
  float reveal = smoothstep(0.45, 1.0, amount) * uReveal;
  if (reveal > 0.001 && uHasVideo > 0.5) {
    vec2 vuv = (uv - uVideoDst.xy) / uVideoDst.zw;
    if (vuv.x >= 0.0 && vuv.x <= 1.0 && vuv.y >= 0.0 && vuv.y <= 1.0) {
      vec2 suv = uVideoSrc.xy + vuv * uVideoSrc.zw;
      col = mix(col, texture2D(uVideo, suv).rgb, reveal);
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Soft ring-modulated gaussian blob, stamped additively into the field. */
function makeWaveSprite(rings: number): HTMLCanvasElement {
  const sprite = document.createElement("canvas");
  sprite.width = SPRITE_SIZE;
  sprite.height = SPRITE_SIZE;
  const sctx = sprite.getContext("2d");
  if (!sctx) return sprite;
  const img = sctx.createImageData(SPRITE_SIZE, SPRITE_SIZE);
  const d = img.data;
  const EDGE = 0.006737947; // exp(-5)
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const px = (x / (SPRITE_SIZE - 1)) * 2 - 1;
      const py = (y / (SPRITE_SIZE - 1)) * 2 - 1;
      const r2 = px * px + py * py;
      let v = 0;
      if (r2 <= 1) {
        let brush = (Math.exp(-r2 * 5) - EDGE) / (1 - EDGE);
        brush *= 0.55 + 0.45 * Math.cos(Math.sqrt(r2) * Math.PI * 2 * rings);
        v = Math.max(0, Math.min(1, brush)) * 255;
      }
      const i = (y * SPRITE_SIZE + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  return sprite;
}

export default function VideoBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Which of the A/B video elements is currently on screen (they swap as
  // clips cycle), so the pause button always targets the live one.
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const togglePause = useCallback(() => {
    const video = activeVideoRef.current ?? videoRef.current;
    if (!video) return;
    if (pausedRef.current) {
      pausedRef.current = false;
      setPaused(false);
      video.play().catch(() => {});
    } else {
      video.pause();
      pausedRef.current = true;
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const displayCanvas = canvasRef.current;
    if (!video || !displayCanvas) return;

    // --- Offscreen 2D ascii pipeline -----------------------------------

    const ascii = document.createElement("canvas");
    const ctx = ascii.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const sources = BACKDROP.videoSources;

    // Second, hidden video element so two clips can morph into each other.
    // Clips loop plainly — the boomerang is baked into the -bounce media
    // files themselves (see scripts/make-boomerang.sh).
    const videoB = document.createElement("video");
    videoB.muted = true;
    videoB.loop = true;
    videoB.playsInline = true;
    videoB.preload = "auto";

    let active = video;
    let standby = videoB;
    let srcIndex = 0;
    if (sources.length > 1) {
      standby.src = sources[1 % sources.length];
      standby.load();
    }
    activeVideoRef.current = active;

    // Morph state: -1 = not morphing, otherwise the timestamp it started.
    let cycleStart = performance.now();
    let morphStart = -1;

    // Video-grid canvases (BACKDROP resolution).
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d", { willReadFrequently: true });
    const videoCells = document.createElement("canvas");
    // Read back frequently: the "auto" fill color samples the drawn frame.
    const videoCtx = videoCells.getContext("2d", { willReadFrequently: true });

    if (!offCtx || !videoCtx) return;

    const fontPx = BACKDROP.asciiFontPx;

    let cols = 0;
    let rows = 0;

    // --- WebGL ripple composite -----------------------------------------

    const ripple = BACKDROP.cursorRipple;

    const field = document.createElement("canvas");
    const fieldCtx = field.getContext("2d");
    const sprite = makeWaveSprite(ripple.rings);

    const renderer = new THREE.WebGLRenderer({
      canvas: displayCanvas,
      antialias: false,
      alpha: false,
      // The glass keyboard uploads this canvas as a texture every frame;
      // without this the drawing buffer may already be cleared by then.
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);

    const makeTex = (source: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(source);
      t.flipY = false;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    };
    const asciiTex = makeTex(ascii);
    const fieldTex = makeTex(field);
    const makeVideoTex = (v: HTMLVideoElement) => {
      const t = new THREE.VideoTexture(v);
      t.flipY = false;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      return t;
    };
    const videoTexA = makeVideoTex(video);
    const videoTexB = makeVideoTex(videoB);

    const uniforms = {
      uAscii: { value: asciiTex },
      uField: { value: fieldTex },
      uVideo: { value: videoTexA as THREE.Texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uStrengthPx: { value: ripple.strength },
      uSwirl: { value: ripple.swirl },
      uDispersion: { value: ripple.dispersion },
      uReveal: { value: ripple.reveal },
      uHasVideo: { value: 0 },
      uVideoDst: { value: new THREE.Vector4(0, 0, 1, 1) },
      uVideoSrc: { value: new THREE.Vector4(0, 0, 1, 1) },
    };

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: COMPOSITE_VERT,
        fragmentShader: COMPOSITE_FRAG,
        uniforms,
        depthTest: false,
        depthWrite: false,
      }),
    );
    scene.add(quad);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ascii.width = w;
      ascii.height = h;
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(w, h);
      field.width = Math.max(2, Math.round(w * FIELD_SCALE));
      field.height = Math.max(2, Math.round(h * FIELD_SCALE));

      const grid = measureAsciiGrid(ctx, fontPx, w, h);
      cols = grid.cols;
      rows = grid.rows;
      off.width = cols;
      off.height = rows;
      videoCells.width = cols;
      videoCells.height = Math.ceil(rows * BACKDROP.videoScreens);
    };
    resize();
    window.addEventListener("resize", resize);

    // --- Wave field (after reactbits' RippleDistortion) ------------------

    const waves = Array.from({ length: MAX_WAVES }, () => ({
      x: 0,
      y: 0,
      scale: WAVE_START_SCALE,
      target: WAVE_START_SCALE,
      size: 1,
      opacity: 0,
    }));
    let waveCursor = 0;
    let prevStampX = 0;
    let prevStampY = 0;

    const stampWave = (x: number, y: number) => {
      const wave = waves[waveCursor];
      waveCursor = (waveCursor + 1) % MAX_WAVES;
      wave.x = x;
      wave.y = y;
      wave.scale = WAVE_START_SCALE;
      wave.target = WAVE_START_SCALE * Math.max(1, ripple.spread);
      wave.size = Math.max(1, ripple.brushSize);
      wave.opacity = 1;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (ripple.strength <= 0) return;
      const step = Math.max(1, ripple.spacing);
      if (
        Math.abs(e.clientX - prevStampX) > step ||
        Math.abs(e.clientY - prevStampY) > step
      ) {
        stampWave(e.clientX, e.clientY);
        prevStampX = e.clientX;
        prevStampY = e.clientY;
      }
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const updateField = (dt: number) => {
      if (!fieldCtx) return;
      const growth = 1 - Math.exp(-dt * 1.09);
      const decay = Math.exp((-dt * LIFE_CONSTANT) / Math.max(0.15, ripple.fade));
      fieldCtx.globalCompositeOperation = "source-over";
      fieldCtx.fillStyle = "#000";
      fieldCtx.fillRect(0, 0, field.width, field.height);
      fieldCtx.globalCompositeOperation = "lighter";
      for (const wave of waves) {
        if (wave.opacity <= 0) continue;
        wave.opacity *= decay;
        wave.scale += (wave.target - wave.scale) * growth;
        if (wave.opacity < 0.002) {
          wave.opacity = 0;
          continue;
        }
        const size = wave.scale * wave.size * FIELD_SCALE;
        fieldCtx.globalAlpha = wave.opacity * wave.opacity;
        fieldCtx.drawImage(
          sprite,
          wave.x * FIELD_SCALE - size / 2,
          wave.y * FIELD_SCALE - size / 2,
          size,
          size,
        );
      }
      fieldCtx.globalAlpha = 1;
      fieldCtx.globalCompositeOperation = "source-over";
    };

    // --- Clip mapping / ascii drawing ------------------------------------

    // Crop/fit mapping for a clip: source rect in video px, dest rect in
    // cell units. Shared by the ascii pass and the shader's HD reveal
    // (scaled to uv there so both layers align exactly).
    const cellMapping = (v: HTMLVideoElement) => {
      const vw = v.videoWidth;
      const vh = v.videoHeight;
      if (!vw || !vh) return null;

      const cropSy = Math.round(vh * BACKDROP.videoCropTop);
      const cropSh = Math.round(vh * (1 - BACKDROP.videoCropTop - BACKDROP.videoCropBottom));
      if (cropSh <= 0) return null;
      const croppedAspect = vw / cropSh;

      const targetAspect =
        ascii.width / (ascii.height * BACKDROP.videoScreens);

      const fit = BACKDROP.videoFit;

      let cDx = 0, cDy = 0, cDw = cols, cDh = videoCells.height;
      if (croppedAspect < targetAspect) {
        cDw = Math.round(videoCells.height * croppedAspect / BACKDROP.videoScreens);
        cDx = Math.round((cols - cDw) / 2);
      } else {
        cDh = Math.round((cols / croppedAspect) * BACKDROP.videoScreens);
        cDy = Math.round((videoCells.height - cDh) / 2);
      }

      let covSx = 0, covSy = 0, covSw = vw, covSh = cropSh;
      if (croppedAspect > targetAspect) {
        covSw = cropSh * targetAspect;
        covSx = (vw - covSw) / 2;
      } else {
        covSh = vw / targetAspect;
        covSy = (cropSh - covSh) / 2;
      }

      return {
        dx: Math.round(cDx * (1 - fit)),
        dy: Math.round(cDy * (1 - fit)),
        dw: Math.round(cDw + (cols - cDw) * fit),
        dh: Math.round(cDh + (videoCells.height - cDh) * fit),
        sx: Math.round(covSx * fit),
        sy: cropSy + Math.round(covSy * fit),
        sw: Math.round(vw - (vw - covSw) * fit),
        sh: Math.round(cropSh - (cropSh - covSh) * fit),
      };
    };

    // Draw one clip's current frame into the cell grid. `alpha` < 1 blends
    // it over what's already there — the ascii pass then picks glyphs from
    // the mix, which is what makes the morph between clips.
    const drawVideoCells = (v: HTMLVideoElement, alpha: number): boolean => {
      const m = cellMapping(v);
      if (!m) return false;
      const { sx, sy, sw, sh, dx, dy, dw, dh } = m;

      videoCtx.globalAlpha = alpha;
      if (alpha >= 1) {
        videoCtx.clearRect(0, 0, cols, videoCells.height);
      }

      videoCtx.drawImage(v, sx, sy, sw, sh, dx, dy, dw, dh);
      videoCtx.globalAlpha = 1;

      // Fill any gap around the frame — behind the drawn footage — with the
      // configured color, or ("auto") the most common color along the
      // frame's own edges so the fill blends with the clip.
      if (alpha >= 1 && (dw < cols || dh < videoCells.height)) {
        videoCtx.globalCompositeOperation = "destination-over";
        videoCtx.fillStyle =
          BACKDROP.videoFillColor === "auto"
            ? dominantEdgeColor(dx, dy, dw, dh)
            : BACKDROP.videoFillColor;
        videoCtx.fillRect(0, 0, cols, videoCells.height);
        videoCtx.globalCompositeOperation = "source-over";
      }
      return true;
    };

    // Most common color along the left/right edges of the drawn frame,
    // found by bucketing edge pixels into a coarse color histogram.
    const dominantEdgeColor = (
      dx: number,
      dy: number,
      dw: number,
      dh: number,
    ): string => {
      const xL = Math.max(0, Math.min(cols - 1, dx));
      const xR = Math.max(0, Math.min(cols - 1, dx + dw - 1));
      const y = Math.max(0, dy);
      const hgt = Math.min(videoCells.height, dy + dh) - y;
      if (hgt <= 0 || !videoCtx) return "#000";
      const buckets = new Map<
        number,
        { n: number; r: number; g: number; b: number }
      >();
      for (const x of xL === xR ? [xL] : [xL, xR]) {
        const d = videoCtx.getImageData(x, y, 1, hgt).data;
        for (let i = 0; i < d.length; i += 4) {
          const key = ((d[i] >> 5) << 10) | ((d[i + 1] >> 5) << 5) | (d[i + 2] >> 5);
          let e = buckets.get(key);
          if (!e) {
            e = { n: 0, r: 0, g: 0, b: 0 };
            buckets.set(key, e);
          }
          e.n++;
          e.r += d[i];
          e.g += d[i + 1];
          e.b += d[i + 2];
        }
      }
      let best: { n: number; r: number; g: number; b: number } | null = null;
      for (const e of buckets.values()) if (!best || e.n > best.n) best = e;
      if (!best) return "#000";
      return `rgb(${Math.round(best.r / best.n)},${Math.round(
        best.g / best.n,
      )},${Math.round(best.b / best.n)})`;
    };

    // --- Render loop ------------------------------------------------------

    let raf = 0;
    let lastHeavy = 0;
    let lastFrameT = 0;
    let currentVideoRow = 0;

    const render = (t: number) => {
      raf = requestAnimationFrame(render);
      const dt = lastFrameT ? Math.min(0.05, (t - lastFrameT) / 1000) : 0;
      lastFrameT = t;
      if (cols === 0 || rows === 0) return;

      currentVideoRow = Math.round(
        (-window.scrollY * BACKDROP.scrollPan +
          window.innerHeight * BACKDROP.videoOffsetY) /
          fontPx,
      );

      // Heavy pass (clip cycling + ascii rasterization) at targetFps.
      if (t - lastHeavy >= 1000 / BACKDROP.targetFps) {
        lastHeavy = t;

        // --- Clip cycling: after each cycle, morph-crossfade to the next ---
        let morphAlpha = 0;
        let morphP = -1; // raw 0..1 progress, drives the blur envelope
        if (sources.length > 1 && !pausedRef.current) {
          if (
            morphStart < 0 &&
            t - cycleStart > BACKDROP.videoCycleSeconds * 1000 &&
            standby.readyState >= 2
          ) {
            morphStart = t;
            standby.currentTime = 0;
            void standby.play().catch(() => {});
          }
          if (morphStart >= 0) {
            const p = (t - morphStart) / (BACKDROP.videoMorphSeconds * 1000);
            if (p >= 1) {
              // Morph done: swap roles, queue the next clip on the old element.
              const old = active;
              active = standby;
              standby = old;
              standby.pause();
              activeVideoRef.current = active;
              srcIndex = (srcIndex + 1) % sources.length;
              standby.src = sources[(srcIndex + 1) % sources.length];
              standby.load();
              morphStart = -1;
              cycleStart = t;
            } else {
              morphP = p;
              morphAlpha = p * p * (3 - 2 * p); // smoothstep
            }
          }
        }

        // Blur over the composite, swelling mid-morph then re-sharpening.
        // CSS-filter only, so the glass keyboard's refraction source (this
        // canvas's bitmap) stays crisp.
        if (BACKDROP.videoMorphBlurPx > 0) {
          const blur =
            morphP >= 0
              ? Math.sin(morphP * Math.PI) * BACKDROP.videoMorphBlurPx
              : 0;
          displayCanvas.style.filter =
            blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : "";
        }

        offCtx.imageSmoothingEnabled = false;
        offCtx.fillStyle = "#000";
        offCtx.fillRect(0, 0, cols, rows);
        // Refresh the cell buffer only when a decodable frame is available —
        // during load gaps we hold the last good frame instead of going
        // black. The videoCells canvas persists between ticks.
        if (active.readyState >= 2) {
          drawVideoCells(active, 1);
          if (morphAlpha > 0 && standby.readyState >= 2) {
            drawVideoCells(standby, morphAlpha);
          }
        }
        if (currentVideoRow > -videoCells.height) {
          offCtx.drawImage(videoCells, 0, currentVideoRow);
        }

        asciifyFrame(ctx, offCtx, cols, rows, {
          fontPx,
          ramp: BACKDROP.asciiRamp,
          tintFilter: BACKDROP.asciiTintFilter,
          gain: BACKDROP.liftGain,
          gamma: BACKDROP.liftGamma,
          startRow: 0,
          endRow: rows,
        });
        asciiTex.needsUpdate = true;
      }

      // Light pass every frame: wave field + shader composite.
      updateField(dt);
      fieldTex.needsUpdate = true;

      uniforms.uVideo.value = active === video ? videoTexA : videoTexB;
      const m = active.readyState >= 2 ? cellMapping(active) : null;
      if (m) {
        const cw = ascii.width / cols;
        const chh = ascii.height / rows;
        uniforms.uVideoDst.value.set(
          (m.dx * cw) / ascii.width,
          ((m.dy + currentVideoRow) * chh) / ascii.height,
          Math.max(1e-5, (m.dw * cw) / ascii.width),
          Math.max(1e-5, (m.dh * chh) / ascii.height),
        );
        uniforms.uVideoSrc.value.set(
          m.sx / active.videoWidth,
          m.sy / active.videoHeight,
          m.sw / active.videoWidth,
          m.sh / active.videoHeight,
        );
        uniforms.uHasVideo.value = 1;
      } else {
        uniforms.uHasVideo.value = 0;
      }

      renderer.render(scene, camera);
    };

    const tryPlay = () => {
      if (!pausedRef.current) void active.play().catch(() => {});
    };
    tryPlay();
    window.addEventListener("pointerdown", tryPlay);
    window.addEventListener("keydown", tryPlay);

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
      window.removeEventListener("pointermove", onPointerMove);
      videoB.pause();
      videoB.removeAttribute("src");
      activeVideoRef.current = null;
      asciiTex.dispose();
      fieldTex.dispose();
      videoTexA.dispose();
      videoTexB.dispose();
      quad.geometry.dispose();
      (quad.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        src={BACKDROP.videoSources[0]}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        id="video-backdrop"
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ width: "100%", height: "100%", background: "#000" }}
      />
      <button
        onClick={togglePause}
        aria-label={paused ? "Play background video" : "Pause background video"}
        style={{
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          color: "rgba(255,255,255,0.5)",
          cursor: "pointer",
          transition: "color 150ms, border-color 150ms, background 150ms",
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "rgba(255,255,255,0.9)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
          e.currentTarget.style.background = "rgba(0,0,0,0.55)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(255,255,255,0.5)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          e.currentTarget.style.background = "rgba(0,0,0,0.4)";
        }}
      >
        {paused ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M3 1.5v11l9-5.5z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="1" width="3.5" height="12" rx="0.75" />
            <rect x="8.5" y="1" width="3.5" height="12" rx="0.75" />
          </svg>
        )}
      </button>
    </>
  );
}
