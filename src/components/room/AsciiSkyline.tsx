"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { ROOM, parseColor } from "../keyboard/visualConfig";

// ASCII backdrop on a plane locked to the camera, so it reads as a flat 2D
// image. A fragment shader computes a tiny scene per glyph cell — either a
// raymarched, lit object (identity disc / gyroid sphere) or the synthwave
// horizon — turns its luminance into a glyph from a ramp atlas, and tints it.

/** Draws the glyph ramp into a one-row atlas (cells 0.6:1, like monospace). */
function makeAtlas(ramp: string): THREE.CanvasTexture {
  const cellH = 48;
  const cellW = Math.round(cellH * 0.6);
  const canvas = document.createElement("canvas");
  canvas.width = cellW * ramp.length;
  canvas.height = cellH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = `${Math.round(cellH * 0.9)}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < ramp.length; i++) {
    ctx.fillText(ramp[i], cellW * (i + 0.5), cellH * 0.55);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uAtlas;
uniform float uGlyphs;
uniform float uTime;
uniform float uAspect;
uniform float uRows;
uniform float uBrightness;
uniform float uHorizon;
uniform float uSunR;
uniform float uGrain;
uniform float uGridSpeed;
uniform float uGridDensity;
uniform float uScroll;
uniform float uFlicker;
uniform float uSeed;
uniform float uScene;
uniform float uObjScale;
uniform float uObjY;
uniform float uTilt;
uniform float uSpin;
uniform vec3 cGrid, cGlow, cSunA, cSunB, cBuild, cBuildNear, cWin, cStar, cGrain;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float landscape(vec2 p, vec2 cell, float t, out vec3 col) {
  float lum = 0.0;
  col = vec3(0.0);
  if (p.y > uHorizon) {
    // ---- sky: stars -------------------------------------------------
    float s = step(0.986, hash(cell + 7.0));
    float tw = 0.5 + 0.5 * sin(t * 1.3 + hash(cell) * 6.2831);
    lum = s * (0.25 + 0.35 * tw);
    col = cStar;

    // ---- sun: striped, hotter at the bottom ----------------------------
    vec2 sp = vec2((p.x - 0.5) * uAspect, p.y - (uHorizon + uSunR * 0.55));
    float r = length(sp);
    if (uSunR > 0.0 && r < uSunR) {
      float k = clamp(sp.y / uSunR * 0.5 + 0.5, 0.0, 1.0);   // 0 bottom .. 1 top
      // Stripes bite into the lower half and thicken toward the bottom.
      float stripe = step(mix(0.15, 0.6, k), fract((p.y - uHorizon) * 26.0 - t * 0.25));
      float cut = mix(stripe, 1.0, smoothstep(0.35, 0.6, k));
      float edge = smoothstep(uSunR, uSunR * 0.85, r);
      lum = (0.55 + 0.4 * (1.0 - k)) * cut * edge;
      col = mix(cSunB, cSunA, k);
    }

    // ---- city: far and near silhouettes --------------------------------
    float bx = p.x * uAspect + uScroll * t;
    float id1 = floor(bx * 7.0);
    float h1 = uHorizon + 0.04 + 0.2 * pow(hash(vec2(id1, 1.0)), 1.4);
    float id2 = floor(bx * 13.0 + 3.7);
    float h2 = uHorizon + 0.02 + 0.11 * pow(hash(vec2(id2, 2.0)), 1.6);
    float flick = step(0.25, hash(cell + floor(t * uFlicker) * 0.37 + 5.0));
    if (p.y < h1) {
      float win = step(0.62, hash(cell + id1)) * step(0.5, mod(cell.x, 2.0)) * step(0.5, mod(cell.y, 2.0)) * flick;
      lum = 0.14 + 0.62 * win;
      col = mix(cBuild, cWin, win);
    }
    if (p.y < h2) {
      float win = step(0.7, hash(cell + id2 + 9.0)) * step(0.5, mod(cell.x + 1.0, 3.0)) * step(0.5, mod(cell.y, 2.0)) * flick;
      lum = 0.1 + 0.7 * win;
      col = mix(cBuildNear, cWin, win);
    }
  } else {
    // ---- floor: perspective grid rushing toward the viewer -----------------
    float d = uHorizon - p.y;                 // 0 at horizon
    float z = 0.035 / max(d, 0.002);          // depth
    float gx = (p.x - 0.5) * uAspect * z * uGridDensity;
    float gz = z * uGridDensity * 0.6 + t * uGridSpeed;
    float lx = step(0.86, fract(gx)) + step(fract(gx), 0.14);
    float lz = step(0.8, fract(gz));
    float line = clamp(lx + lz, 0.0, 1.0);
    float fade = smoothstep(0.0, 0.14, d) * (1.0 - smoothstep(0.35, 0.6, d) * 0.5);
    lum = line * (0.45 + 0.5 * fade) + 0.04;
    col = cGrid;
    // Horizon glow band.
    float glow = smoothstep(0.03, 0.0, d);
    lum = max(lum, glow * 0.9);
    col = mix(col, cGlow, glow);
  }

  return lum;
}

// ---- raymarched object ---------------------------------------------------------
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c); }
float sdTorus(vec3 p, float R, float r) { vec2 q = vec2(length(p.xz) - R, p.y); return length(q) - r; }
float sdCyl(vec3 p, float R, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(R, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdSphere(vec3 p, float r) { return length(p) - r; }
float gyroid(vec3 p, float k) { p *= k; return abs(dot(sin(p), cos(p.zxy))) / k - 0.04; }

// Returns distance; material id in m: 0 body, 1 bright band, 2 dark groove.
float map(vec3 p, out float m) {
  m = 0.0;
  if (uScene < 1.5) {
    // Identity disc: outer rim torus, flat plate with concentric grooves, hub.
    float rim = sdTorus(p, 1.0, 0.10);
    float plate = sdCyl(p, 0.94, 0.035);
    float rr = length(p.xz);
    // Grooves ripple the plate surface.
    plate += 0.012 * sin(rr * 46.0);
    float hub = sdCyl(p, 0.22, 0.07);
    float hole = sdCyl(p, 0.11, 0.2);
    float d = min(rim, min(plate, hub));
    d = max(d, -hole);
    // Bright energy band just inside the rim, and a thin one around the hub.
    if (abs(rr - 0.86) < 0.035 && abs(p.y) < 0.05) m = 1.0;
    if (abs(rr - 0.27) < 0.015 && abs(p.y) < 0.09) m = 1.0;
    if (d == rim) m = max(m, 0.0);
    return d;
  }
  // Gyroid lattice sphere with a solid core.
  float s = sdSphere(p, 1.0);
  float g = gyroid(p, 7.0);
  float shell = max(s, g);
  float core = sdSphere(p, 0.42);
  if (core < shell) m = 1.0;
  return min(shell, core);
}

vec3 normalAt(vec3 p) {
  float m;
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    map(p + e.xyy, m) - map(p - e.xyy, m),
    map(p + e.yxy, m) - map(p - e.yxy, m),
    map(p + e.yyx, m) - map(p - e.yyx, m)));
}

float object(vec2 p, vec2 cell, float t, out vec3 col) {
  col = cGlow;
  vec2 uvc = (p - vec2(0.5, uObjY)) * vec2(uAspect, 1.0) / uObjScale;
  vec3 ro = vec3(0.0, 0.0, 3.4);
  vec3 rd = normalize(vec3(uvc * 1.15, -1.7));
  mat3 R = rotX(uTilt) * rotY(uSpin + t * 0.2);
  mat3 Ri = transpose(R);
  vec3 o = Ri * ro;
  vec3 d = Ri * rd;
  float tt = 0.0;
  float m = 0.0;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    vec3 q = o + d * tt;
    float h = map(q, m);
    if (h < 0.0015) { hit = true; break; }
    tt += h * 0.9;
    if (tt > 8.0) break;
  }
  if (!hit) {
    // Faint stars.
    float s = step(0.988, hash(cell + 7.0));
    col = cStar;
    return s * 0.35;
  }
  vec3 q = o + d * tt;
  vec3 n = normalAt(q);
  vec3 nw = R * n;
  vec3 L = normalize(vec3(-0.55, 0.85, 0.7));
  vec3 V = -rd;
  float diff = max(dot(nw, L), 0.0);
  float spec = pow(max(dot(reflect(-L, nw), V), 0.0), 28.0);
  float rimL = pow(1.0 - max(dot(nw, V), 0.0), 3.0);
  float lum = 0.06 + 0.62 * diff + 0.35 * spec + 0.25 * rimL;
  if (m > 0.5) { lum = 0.92 + 0.08 * spec; col = cWin; }
  return clamp(lum, 0.0, 1.0);
}

void main() {
  float cols = floor(uRows * uAspect / 0.6);
  vec2 grid = vec2(cols, uRows);
  vec2 cell = floor(vUv * grid);
  vec2 cuv = fract(vUv * grid);
  vec2 p = (cell + 0.5) / grid;      // cell centre, 0..1 screen
  float t = uTime;

  vec3 col;
  float lum = uScene > 2.5 ? landscape(p, cell, t, col) : object(p, cell, t, col);

  // ---- grain over everything: the dot-matrix poster texture -----------------
  float g = step(1.0 - uGrain, hash(cell + floor(t * 1.5) * 0.13 + 3.0));
  if (g > 0.5 && lum < 0.12) {
    lum = 0.2 + 0.15 * hash(cell + 2.0);
    col = cGrain;
  }

  // ---- glyph lookup ----------------------------------------------------------
  float idx = floor(clamp(lum, 0.0, 0.999) * uGlyphs);
  vec2 auv = vec2((idx + cuv.x) / uGlyphs, cuv.y);
  float mask = texture2D(uAtlas, auv).r;
  gl_FragColor = vec4(col * mask * uBrightness, 1.0);
}
`;

const BILLBOARD_DIST = 300;
const _fwd = new THREE.Vector3();

function rgb(hex: string): THREE.Color {
  const [r, g, b] = parseColor(hex);
  return new THREE.Color(r, g, b);
}

export default function AsciiSkyline() {
  const S = ROOM.skyline;
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height;
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);

  const atlas = useMemo(() => makeAtlas(S.ramp), [S.ramp]);
  useEffect(() => () => atlas.dispose(), [atlas]);

  const uniforms = useMemo(() => {
    const C = S.colors;
    const m = S.mono ? rgb(S.monoColor) : null;
    const c = (hex: string) => ({ value: m ?? rgb(hex) });
    return {
      uAtlas: { value: atlas },
      uGlyphs: { value: S.ramp.length },
      uTime: { value: 0 },
      uAspect: { value: aspect },
      uRows: { value: S.rows },
      uBrightness: { value: S.brightness },
      uHorizon: { value: S.horizon },
      uSunR: { value: S.sunRadius },
      uGrain: { value: S.grain },
      uGridSpeed: { value: S.gridSpeed },
      uGridDensity: { value: S.gridDensity },
      uScroll: { value: S.scrollSpeed },
      uFlicker: { value: S.flicker },
      uSeed: { value: S.seed * 0.137 },
      uScene: { value: S.scene === "disc" ? 1 : S.scene === "gyroid" ? 2 : 3 },
      uObjScale: { value: S.objectScale },
      uObjY: { value: S.objectY },
      uTilt: { value: (S.objectTilt * Math.PI) / 180 },
      uSpin: { value: (S.objectSpin * Math.PI) / 180 },
      cGrid: c(C.grid),
      cGlow: c(C.horizonGlow),
      cSunA: c(C.sunTop),
      cSunB: c(C.sunBottom),
      cBuild: c(C.building),
      cBuildNear: c(C.buildingNear),
      cWin: c(C.window),
      cStar: c(C.star),
      cGrain: c(C.grain),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atlas, S]);

  useFrame((state, dt) => {
    const m = mesh.current;
    const sm = mat.current;
    if (!m || !sm) return;
    if (S.animate) sm.uniforms.uTime.value += dt;
    const cam = state.camera as THREE.PerspectiveCamera;
    sm.uniforms.uAspect.value = cam.aspect;
    // Sit squarely in front of the camera, filling the view.
    cam.getWorldDirection(_fwd);
    m.position.copy(cam.position).addScaledVector(_fwd, BILLBOARD_DIST);
    m.quaternion.copy(cam.quaternion);
    const h = 2 * BILLBOARD_DIST * Math.tan((cam.fov * Math.PI) / 360);
    m.scale.set(h * cam.aspect, h, 1);
  });

  return (
    <mesh ref={mesh} raycast={() => null} renderOrder={-10}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
