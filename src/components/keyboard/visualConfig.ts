// ============================================================================
// visualConfig.ts — every knob for the landing page's look, in one place.
//
// Edit and save; the dev server hot-reloads.
// Colors: use "rgba(r,g,b,a)" (or hex) everywhere. For the glass and
// terminal tints the alpha channel means TINT STRENGTH — 1 = full color,
// 0 = no tint (neutral) — since those materials have no real transparency.
// Each knob lists a practical range as [min … max] — values outside won't
// break anything, they just stop looking better.
// (The charcoal DOM keyboard's colors live in Keyboard.tsx under
// KEYCAP_THEMES / CASE_THEMES if you want to restyle that variant too.)
// ============================================================================

/** Parses "#rgb", "#rrggbb", "rgb(...)" or "rgba(...)" → [r,g,b,a] in 0..1. */
export function parseColor(
  color: string,
): [number, number, number, number] {
  const c = color.trim();
  if (c.startsWith("#")) {
    let h = c.slice(1);
    if (h.length === 3)
      h = h
        .split("")
        .map((x) => x + x)
        .join("");
    const num = parseInt(h.slice(0, 6), 16);
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255,
      1,
    ];
  }
  const m = c.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i,
  );
  if (m) {
    return [
      Number(m[1]) / 255,
      Number(m[2]) / 255,
      Number(m[3]) / 255,
      m[4] !== undefined ? Number(m[4]) : 1,
    ];
  }
  return [1, 1, 1, 1];
}

/** RGB with the alpha applied as tint strength (alpha 0 fades to neutral). */
export function tintStrength(color: string): [number, number, number] {
  const [r, g, b, a] = parseColor(color);
  return [1 + (r - 1) * a, 1 + (g - 1) * a, 1 + (b - 1) * a];
}

// ---------------------------------------------------------------------------
// Intro typing
// ---------------------------------------------------------------------------
export const INTRO = {
  /** The sentence the keyboard types out. Supported characters: anything on
   *  the keyboard (letters get Shift for capitals). */
  sentence: "hi, im cason. I build things and do stuff",
} as const;

// ---------------------------------------------------------------------------
// Video backdrop (the ascii effect)
// ---------------------------------------------------------------------------
export const BACKDROP = {
  /** Effect frame rate. [8 … 30] — 8-12 feels like a flipbook, 15-24 retro
   *  film, 30 smooth but costs more CPU. */
  targetFps: 26,

  /** How many viewport-heights of the page the video spans. [1 … 3]
   *  1 = video ends with the landing section, 1.5-2 = scrolling reveals
   *  more of the (portrait) clip's frame before the terminal fades in.
   *  The extra length adds scroll runway between the two sections. */
  videoScreens: 1,

  /** Brightness lift applied to the (dark) footage before mapping to glyphs.
   *  liftGain [0.8 … 2.5]: >1 brightens everything; 2+ blows out highlights.
   *  liftGamma [0.5 … 1.2]: <1 lifts shadows (reveals dark detail),
   *  1 = untouched, >1 crushes shadows for a high-contrast look. */
  liftGain: 1.3,
  liftGamma: 1.2,

  /** ASCII: font size in px (cell size follows from it).
   *  [8 … 24] — 8-10 is fine detail (almost looks like an image, more CPU),
   *  14-18 clearly reads as text, 20+ is chunky abstract blocks. */
  asciiFontPx: 20,

  /** ASCII: characters from darkest to brightest. Any length ≥ 2.
   *  More characters = smoother tonal gradient; denser glyphs (#, @, $)
   *  at the end read brighter. Leading space = pure black cells. */
  asciiRamp: " ·.:~=+$$$$",

  /** Video crop: fraction of the frame to trim from the top. [0 … 0.4]
   *  0 = no trim, 0.2 = chop the top 20% of the video frame. */
  videoCropTop: .2,

  /** Video crop: fraction of the frame to trim from the bottom. [0 … 0.4]
   *  0 = no trim, 0.2 = chop the bottom 20% of the video frame. */
  videoCropBottom: 0.33,

  /** Video fit: 0 = contain (full frame, $ filler on sides),
   *  1 = cover (fills viewport, edges cropped). [0 … 1]
   *  0.5 is a good middle ground for portrait video on landscape screens. */
  videoFit: 1,

  /** Fill character color for side gaps when videoFit < 1.
   *  Bright white maps to "$" in the ramp. Dim it to soften the fill. */
  videoFillColor: "#ffffff",

  /** ASCII: canvas filter applied when tinting glyphs with video color.
   *  brightness [1 … 2.5], saturate [1 … 2.5] — push brightness when the
   *  footage is dark, saturation to exaggerate the stage-light colors. */
  asciiTintFilter: "brightness(1.5) saturate(1.7)",
} as const;

// ---------------------------------------------------------------------------
// 3D glass keyboard
// ---------------------------------------------------------------------------
export const GLASS = {
  /** Width : height ratio of the keyboard's footprint on the page.
   *  Wider (e.g. "15 / 4") = flatter board, narrower (e.g. "15 / 5.5")
   *  = taller keys. */
  boardAspect: "15 / 4.6",

  /** Backward tilt of the whole board, radians. [-0.5 … 0]
   *  0 = viewed dead-on (depth invisible), -0.15 subtle, -0.3 strong
   *  perspective, past -0.45 the top row starts hiding the row behind it. */
  tiltX: -0.29,

  /** Key thickness as a fraction of one key-unit width. [0.3 … 1.5]
   *  0.3-0.5 = low-profile laptop keys, 0.8-1.2 = chunky mechanical,
   *  1.5 = novelty ice cubes. */
  keyDepthFactor: 1.0,

  /** Gap between keys as a fraction of one key-unit width. [0.04 … 0.25]
   *  0.04 = nearly touching, 0.1 = classic keyboard, 0.2+ = floating tiles. */
  keyGapFactor: 0.1,

  /** Keycap corner radius as a fraction of the key's smaller side.
   *  [0.05 … 0.5] — 0.05 = sharp slabs, 0.2 = softened squares,
   *  0.5 = fully pill-shaped. */
  keyRadiusFactor: 0.23,

  /** How far a pressed key sinks, as a fraction of key depth. [0.2 … 0.9]
   *  0.2 = shallow tap, 0.5 = satisfying travel, 0.9 = nearly bottoms out. */
  pressTravelFactor: 0.5,

  /** Press animation speed (higher = snappier). [8 … 40]
   *  8-12 = soft/mushy, 20-25 = mechanical click, 40 = instant. */
  pressSpeed: 26,

  /** Keycap glass material (drei MeshTransmissionMaterial props). */
  key: {
    /** Surface polish. [0 … 0.6] — 0 = polished clear glass, 0.1-0.2 =
     *  slightly satin, 0.3-0.5 = frosted (scatters reflections and the
     *  see-through image), 0.6+ = opaque-ish milk glass. */
    roughness: 0,

    /** Index of refraction: how much light BENDS through the glass.
     *  [1 … 2.4] — 1 = no bending at all (invisible glass), 1.2 = subtle,
     *  1.5 = realistic glass, 2 + = dense crystal/diamond magnification.
     *  This is the main "how glassy" knob. */
    ior: 40,

    /** RGB fringe at refracted edges (lens rainbow). [0 … 0.3]
     *  0 = clean, 0.03-0.06 = subtle realism, 0.1-0.2 = stylized prism,
     *  0.3 = broken projector. */
    chromaticAberration: 2,

    /** Blur of whatever is seen through the glass. [0 … 2]
     *  0 = perfectly sharp, 0.3-0.7 = light frost, 1-1.5 = heavy frost,
     *  2 = background reduced to colored glow. */
    anisotropicBlur: 0,

    /** Wavy warping of the refracted image (hand-blown glass). [0 … 1.5]
     *  0 = optically perfect, 0.1-0.3 = organic imperfection,
     *  0.6-1 = obviously wavy, 1.5 = funhouse mirror. */
    distortion: .5,

    /** Size of those waves. [0.1 … 2] — 0.1-0.3 = fine ripple texture,
     *  0.5-1 = broad undulations, 2 = one slow wave across the key. */
    distortionScale: 0.05,

    /** Animates the distortion over time. [0 … 0.5] — 0 = frozen,
     *  0.05-0.1 = barely-alive shimmer, 0.2-0.4 = heat-haze wobble,
     *  0.5 = actively liquid. */
    temporalDistortion: .17,

    /** Tint multiplied over everything seen through the glass — can only
     *  darken/tint, never brighten. Lighter colors = clearer glass;
     *  the alpha channel is tint strength (0 = untinted). */
    color: "rgba(174, 189, 242, 1)",

    /** Refraction thickness as a fraction of key depth. [0.3 … 2]
     *  Higher = background appears more offset/magnified through the key.
     *  Has little effect while ior is near 1. */
    thicknessFactor: .2,
  },

  /** Frosted base plate behind the keys. Same knobs and ranges as `key`;
   *  higher roughness/blur here reads as a frosted tray the clear keys
   *  float on. */
  basePlate: {
    roughness: 0,
    ior: 11,
    chromaticAberration: 0.2,
    anisotropicBlur: 1.1,
    color: "rgba(143, 161, 221, 1)",
    /** Refraction thickness as a fraction of key depth. [0.3 … 2] */
    thicknessFactor: 0.8,
  },

  /** Glass slab behind the typed sentence. Same knobs and ranges as `key`. */
  textSlab: {
    roughness: 0,
    ior: 15,
    chromaticAberration: 0.04,
    anisotropicBlur: 1.0,
    color: "rgba(160, 176, 232, 1)",
    /** Refraction (optical) thickness, px. [4 … 40] */
    thickness: 10,
    /** Physical depth of the slab geometry, px. [6 … 30] */
    depth: 12,
  },

  /** Key legend text colors (drawn onto the keycaps).
   *  ink = main labels, soft = the small shift-symbols. Adjust the alpha
   *  (last rgba number) to fade legends into the glass. */
  legend: {
    ink: "rgba(255,255,255,0.92)",
    soft: "rgba(255,255,255,0.5)",
  },

  /** Strength of the environment (city HDR) reflections on the glass.
   *  [0 … 1.5] — 0 = no specular streaks at all (glass goes invisible over
   *  dark footage), 0.3-0.7 = believable sheen, 1+ = showroom lighting. */
  envIntensity: .5,
} as const;

// ---------------------------------------------------------------------------
// Second section background (static image, ASCII-ified with the same
// font/ramp as the video backdrop so the two blend seamlessly).
// ---------------------------------------------------------------------------
export const TERMINAL = {
  /** ASCII font size for this section in px. [8 … 24]
   *  Smaller = finer detail (more characters), larger = chunkier.
   *  Set to 0 or omit to inherit BACKDROP's value. */
  asciiFontPx: 10,

  /** Brightness lift for the section image before ASCII conversion.
   *  [0.8 … 2.5] — >1 brightens, useful for dark photos. */
  liftGain: 1.3,

  /** Gamma for the section image. [0.5 … 1.2]
   *  <1 lifts shadows, 1 = untouched, >1 crushes shadows. */
  liftGamma: 1.0,

  /** ASCII ramp override for this section (leave empty to use BACKDROP's).
   *  Same format: characters from darkest to brightest. */
  asciiRamp: "",

  /** Canvas filter applied when tinting glyphs for this section.
   *  brightness [1 … 2.5], saturate [1 … 2.5]. */
  asciiTintFilter: "brightness(2) saturate(2.5)",

  /** How many character rows the video → section transition takes.
   *  [0 … 30] — 0 = hard cut at the section boundary, 5-14 = gradual
   *  crossfade (the image bleeds up into the bottom of the landing
   *  section), 20+ = very slow dissolve. */
  blendRows: 5,

  /** Image crop: fraction of the image to trim from the top. [0 … 0.4] */
  imageCropTop: 0,

  /** Image crop: fraction of the image to trim from the bottom. [0 … 0.4] */
  imageCropBottom: 0,

  /** Image crop: fraction of the image to trim from the left. [0 … 0.4] */
  imageCropLeft: 0,

  /** Image crop: fraction of the image to trim from the right. [0 … 0.4] */
  imageCropRight: 0,

  /** Image fit: 0 = contain (full image, black bars), 1 = cover (fills
   *  section, edges cropped). [0 … 1] */
  imageFit: 1,
} as const;

// ---------------------------------------------------------------------------
// "Liquid" DOM glass (SVG displacement filter, after reactbits' GlassSurface).
// Used by the alternate keyboard implementation (toggle bottom-left).
// Chromium-only for the full effect; Safari/Firefox get a frosted fallback.
// ---------------------------------------------------------------------------
export const GLASS_SURFACE = {
  /** Width of the refracting edge band, as a fraction of the element's
   *  smaller side. [0.02 … 0.2] — bigger = wider bent rim. */
  borderWidth: 0.07,

  /** Brightness (%) of the displacement map's core. [0 … 100] — lower =
   *  stronger distortion reaches the middle, higher = calm center. */
  brightness: 50,

  /** Opacity of the map's core. [0 … 1] — lower lets edge distortion bleed
   *  further inward. */
  opacity: 0.93,

  /** Blur (px) of the displacement map — softens the transition between
   *  edge distortion and calm center. [2 … 30]. */
  blur: 11,

  /** Output blur (px) applied after displacement. [0 … 3] — 0 = crisp. */
  displace: 0.4,

  /** Frost overlay opacity behind the content. [0 … 0.5]. */
  backgroundOpacity: 0.06,

  /** Backdrop saturation multiplier. [0.5 … 2]. */
  saturation: 1.2,

  /** Displacement strength. [-300 … 0] — more negative = stronger edge
   *  refraction. */
  distortionScale: -140,

  /** Extra per-channel displacement for chromatic fringing. [0 … 40]. */
  redOffset: 0,
  greenOffset: 10,
  blueOffset: 20,

  /** Which channels of the map drive x/y displacement. "R" | "G" | "B". */
  xChannel: "R" as "R" | "G" | "B",
  yChannel: "G" as "R" | "G" | "B",

  /** Blend mode used when building the displacement map. */
  mixBlendMode: "difference",
} as const;
