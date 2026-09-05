"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ROOM } from "../keyboard/visualConfig";

// A glowing panel under the glass plate: domain-warped noise mapped through
// a repeating spectral palette, so the light looks like thin-film rainbow
// streaks flowing under the glass. It is not flagged as glass, so the room
// capture includes it and the caps and plate refract it.

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
uniform float uTime;
uniform float uScale;
uniform float uStripes;
uniform float uContrast;
uniform float uIntensity;
uniform float uStretch;
uniform float uSaturation;
uniform float uHue;
uniform float uSpread;

// --- simplex-ish value noise + fbm -------------------------------------
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// Spectral palette: cycles through the rainbow as t increases, so tightly
// packed t gives the dense colour banding of thin-film interference.
//
// uHue recentres that cycle on the hue of the chosen sprite and uSpread
// narrows how much of the wheel it covers, so the flow reads as that
// Pokemon's colour. uHue = 0.5 with uSpread = 1 is the identity: the
// untinted, full-rainbow original (the palette has period 1).
//
// Note the palette runs red -> blue -> green, the opposite way round the
// wheel from HSL's red -> green -> blue, so callers must pass 1 - hue/360
// rather than hue/360. paletteHue() below does that.
vec3 spectrum(float t) {
  float u = uHue + (fract(t) - 0.5) * uSpread;
  vec3 c = 0.5 + 0.5 * cos(6.28318 * (u + vec3(0.0, 0.33, 0.67)));
  // Bias toward saturated, luminous colour.
  return pow(c, vec3(0.8));
}

void main() {
  // Stretch along x so the streaks run the length of the plate.
  vec2 p = (vUv - 0.5) * vec2(uScale * uStretch, uScale);
  float t = uTime;

  // Domain warp: two fbm layers bend the coordinates into flowing curves.
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.15)), fbm(p + vec2(5.2, 1.3) - t * 0.1));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.12),
                fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.08));
  float f = fbm(p + 3.5 * r);

  // Many rainbow cycles across the value range → fine stripes.
  vec3 col = spectrum(f * uStripes + t * 0.05);

  // Ridges: bright where the warped field folds, dark in between, like the
  // dark glass between the light streaks in the reference.
  float ridge = abs(fract(f * uStripes * 0.5) - 0.5) * 2.0;
  float bright = pow(1.0 - ridge, uContrast);
  float body = smoothstep(0.15, 0.85, f + 0.35);
  float lum = mix(0.08, 1.0, bright) * body;

  vec3 grey = vec3(dot(col, vec3(0.299, 0.587, 0.114)));
  col = mix(grey, col, uSaturation);
  gl_FragColor = vec4(col * lum * uIntensity, 1.0);
}
`;

/** Neutral palette centre: reproduces the original full-rainbow flow. */
const NEUTRAL_HUE = 0.5;

/** Degrees of HSL hue -> position in the shader's palette, which winds the
 *  opposite way (see the note above `spectrum`). */
const paletteHue = (deg: number) => ((1 - deg / 360) % 1 + 1) % 1;

export default function HoloPanel({
  w,
  h,
  y,
  hue,
}: {
  w: number;
  h: number;
  y: number;
  /** Chosen sprite's hue in degrees, or null for the untinted rainbow. */
  hue?: number | null;
}) {
  const G = ROOM.glass.plateGlow;
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScale: { value: G.scale },
      uStripes: { value: G.stripes },
      uContrast: { value: G.contrast },
      uIntensity: { value: G.intensity },
      uStretch: { value: G.stretch },
      uSaturation: { value: G.saturation },
      uHue: { value: NEUTRAL_HUE },
      uSpread: { value: 1 },
    }),
    [G.scale, G.stripes, G.contrast, G.intensity, G.stretch, G.saturation],
  );
  useFrame((state, dt) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime * G.speed;

    const T = G.tint;
    const wantHue = T.enabled && hue != null ? paletteHue(hue) : NEUTRAL_HUE;
    const wantSpread = T.enabled && hue != null ? T.spread : 1;
    const k = 1 - Math.pow(1 - T.smoothing, Math.min(dt, 0.1) * 60);

    // Hue is an angle: ease along the short way round, or a red sprite
    // following a magenta one would sweep back through the whole wheel.
    const cur = m.uniforms.uHue.value as number;
    let delta = wantHue - cur;
    delta -= Math.round(delta);
    m.uniforms.uHue.value = cur + delta * k;
    m.uniforms.uSpread.value +=
      (wantSpread - (m.uniforms.uSpread.value as number)) * k;
  });
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[w, h]} />
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        toneMapped={false}
      />
    </mesh>
  );
}
