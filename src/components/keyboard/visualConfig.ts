// ============================================================================
// visualConfig.ts — every knob for the landing page's look, in one place.
//
// Edit and save; the dev server hot-reloads.
// Colors: use "rgba(r,g,b,a)" (or hex) everywhere. For the glass tints the
// alpha channel means TINT STRENGTH — 1 = full color, 0 = no tint (neutral)
// — since those materials have no real transparency.
// Each knob lists a practical range as [min … max] — values outside won't
// break anything, they just stop looking better.
//
// Sections: INTRO (typing), BACKDROP (ascii video + clip morphs), GLASS
// (3D keyboard materials/lights), ASSEMBLY (scroll-scrubbed build),
// GLASS_SURFACE (unused alternate DOM-glass keyboard variant).
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

  /** Typing is scrubbed by scroll, like the assembly: once the keyboard
   *  has built (ASSEMBLY.scrollRange), this much additional scroll (as a
   *  fraction of viewport height) types out the sentence and links —
   *  scrolling back up deletes them again. [0.3 … 2] */
  scrollRange: 0.8,


  /** Font size of the typed sentence. CSS clamp string. */
  fontSize: "clamp(1.4rem, 4vw, 2.6rem)",

  /** Font size of the link labels below the sentence. CSS clamp string. */
  linkFontSize: "clamp(0.78rem, 1.2vw, 0.9rem)",
} as const;

// ---------------------------------------------------------------------------
// Video backdrop (the ascii effect)
// ---------------------------------------------------------------------------
export const BACKDROP = {
  /** Effect frame rate. [8 … 30] — 8-12 feels like a flipbook, 15-24 retro
   *  film, 30 smooth but costs more CPU. */
  targetFps: 20,

  /** How many viewport-heights the video's frame spans. [1 … 3]
   *  1 fills the viewport exactly. Only matters beyond 1 when scrollPan > 0
   *  (the extra length is what scrolling pans through). */
  videoScreens: 1,

  /** How much the video pans with page scroll. [0 … 1]
   *  0 = static (fixed in place), 1 = scrolls 1:1 with the page,
   *  in between = parallax. With > 0, raise videoScreens to
   *  ≥ 1 + ASSEMBLY.scrollRange so the pan never runs out of frame. */
  scrollPan: 0,

  /** Vertical drop of the video, as a fraction of viewport height.
   *  [-1 … 1] — 0 = top-aligned with the viewport, 0.1 = nudged down 10%,
   *  negative = raised. Cells outside the frame render black. */
  videoOffsetY: 0,

  /** Background clips, cycled with an ascii crossfade morph. Drop files
   *  into /public/media and list them here (e.g. "/media/clip2.mp4").
   *  A single entry just loops — no cycling.
   *  The -bounce files have the boomerang (forward + reversed) baked in —
   *  regenerate one for a new clip with:
   *    ./scripts/make-boomerang.sh public/media/<clip>.mp4 */
  videoSources: [
    "/media/cow-bounce.mp4",
    "/media/harley-bounce.mp4",
    "/media/slayter-bounce.mp4",
  ] as readonly string[],

  /** Seconds each clip plays before morphing to the next. [5 … 120] */
  videoCycleSeconds: 10,

  /** Duration of the morph crossfade between clips, seconds. [0.5 … 5] */
  videoMorphSeconds: 1.5,

  /** Peak blur laid over the ascii canvas mid-morph, px. [0 … 24]
   *  Ramps up and back down across the morph. 0 = no blur: the clips only
   *  crossfade inside the character grid (pure ascii glyph morph). */
  videoMorphBlurPx: 20,

  /** Cursor ripple (after reactbits' RippleDistortion): pointer movement
   *  stamps soft waves that grow and fade into a displacement field; a
   *  shader smears the ascii "water" along it with swirl + chromatic
   *  dispersion, and where the water is displaced hard the raw HD video
   *  shows through. Runs at full frame rate on the GPU; sits over the
   *  ascii, under all the glass. */
  cursorRipple: {
    /** Max water displacement, px. [0 … 200] 0 disables. */
    strength: 90,
    /** Diameter of each stamped wave, px. [60 … 400] */
    brushSize: 150,
    /** Ring crests inside each wave. [1 … 8] */
    rings: 4,
    /** Swirl: how much the push direction rotates with intensity. [0 … 2] */
    swirl: 1,
    /** How far each wave expands from its stamped size. [1 … 12] */
    spread: 7.75,
    /** Seconds a wave takes to dissolve. [0.5 … 8] */
    fade: 3,
    /** Min cursor travel between wave stamps, px. [4 … 60]
     *  Smaller = denser, soupier trail (more waves alive at once). */
    spacing: 15,
    /** Chromatic dispersion: RGB split along the push. [0 … 1] */
    dispersion: 0.5,
    /** How strongly hard-displaced water opens to the HD video. [0 … 1]
     *  0 = never reveal (pure ripple), 1 = full clean video in the wake. */
    reveal: 0.8,
  },

  /** Brightness lift applied to the (dark) footage before mapping to glyphs.
   *  liftGain [0.8 … 2.5]: >1 brightens everything; 2+ blows out highlights.
   *  liftGamma [0.5 … 1.2]: <1 lifts shadows (reveals dark detail),
   *  1 = untouched, >1 crushes shadows for a high-contrast look. */
  liftGain: 1.8,
  liftGamma: .7,

  /** ASCII: font size in px (cell size follows from it).
   *  [8 … 24] — 8-10 is fine detail (almost looks like an image, more CPU),
   *  14-18 clearly reads as text, 20+ is chunky abstract blocks. */
  asciiFontPx: 10,

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

  /** Fill color for the side gaps when videoFit < 1.
   *  "auto" = the most common color along the current frame's edges, so the
   *  fill blends with the footage and follows it as clips morph. Or any
   *  fixed CSS color ("#ffffff" = bright $ fill, "#000" = empty). */
  videoFillColor: "auto" as string,

  /** ASCII: canvas filter applied when tinting glyphs with video color.
   *  brightness [1 … 2.5], saturate [1 … 2.5] — push brightness when the
   *  footage is dark, saturation to exaggerate the stage-light colors. */
  asciiTintFilter: "brightness(1.7) saturate(1.9)",

  /** CSS background of the fixed vignette layer over the backdrop, keeping
   *  the hero text readable. Any CSS gradient; "none" disables it. */
  vignette:
    "radial-gradient(80% 70% at 50% 55%, rgba(0,0,0,0.38), rgba(0,0,0,0.14) 60%, rgba(0,0,0,0) 100%)",
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
  keyDepthFactor: 1,

  /** Gap between keys as a fraction of one key-unit width. [0.04 … 0.25]
   *  0.04 = nearly touching, 0.1 = classic keyboard, 0.2+ = floating tiles. */
  keyGapFactor: 0.1,

  /** Keycap corner radius as a fraction of the key's smaller side.
   *  [0.05 … 0.5] — 0.05 = sharp slabs, 0.2 = softened squares,
   *  0.5 = fully pill-shaped. */
  keyRadiusFactor: 0.24,

  /** How far a pressed key sinks, as a fraction of key depth. [0.2 … 0.9]
   *  0.2 = shallow tap, 0.5 = satisfying travel, 0.9 = nearly bottoms out. */
  pressTravelFactor: 0.6,

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
    ior: 9,

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
    distortion: .6,

    /** Size of those waves. [0.1 … 2] — 0.1-0.3 = fine ripple texture,
     *  0.5-1 = broad undulations, 2 = one slow wave across the key. */
    distortionScale: 0.05,

    /** Animates the distortion over time. [0 … 0.5] — 0 = frozen,
     *  0.05-0.1 = barely-alive shimmer, 0.2-0.4 = heat-haze wobble,
     *  0.5 = actively liquid. */
    temporalDistortion: .1,

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

    // --- Geometry (relative to the key grid) ---

    /** Plate width as a fraction of the key grid's width. [1 … 1.2] */
    widthFactor: 1.03,
    /** Plate height as a fraction of the key grid's height. [1 … 1.2] */
    heightFactor: 1.06,
    /** Plate thickness as a fraction of key depth. [0.2 … 1.5] */
    depthScale: 0.5,
    /** Plate corner radius as a fraction of key depth. [0.1 … 0.5] */
    radiusFactor: 0.3,
    /** How far behind the keys the plate sits, as a fraction of key depth.
     *  [0.4 … 1.5] — larger = a visible air gap under floating keys. */
    zOffsetFactor: 0.6,
  },

  /** Glass slab behind the typed sentence. Same knobs and ranges as `key`. */
  textSlab: {
    /** Surface polish. [0 … 0.6] */
    roughness: .05,

    /** Index of refraction. [1 … 2.4] */
    ior: 9,

    /** RGB fringe at refracted edges. [0 … 0.3] */
    chromaticAberration: 0.1,

    /** Blur of whatever is seen through the glass. [0 … 2] */
    anisotropicBlur: 2,

    /** Wavy warping of the refracted image. [0 … 1.5] */
    distortion: .5,

    /** Size of those waves. [0.1 … 2] */
    distortionScale: .005,

    /** Animates the distortion over time. [0 … 0.5] */
    temporalDistortion: 0,

    /** Tint color — lighter = clearer glass. Alpha = tint strength. */
    color: "rgba(89, 91, 226, 0.86)",

    /** Refraction (optical) thickness, px. [4 … 40] */
    thickness: 10,

    /** Physical depth of the slab geometry, px. [6 … 30] */
    depth: 10,

    /** Corner radius of the slab, px. [2 … 20] */
    radius: 40.
  },

  /** Glass slabs behind the link labels (github/linkedin/email).
   *  Same knobs as textSlab. Set to null to disable link glass. */
  linkSlab: {
    /** Surface polish. [0 … 0.6] */
    roughness: 0,

    /** Index of refraction. [1 … 2.4] */
    ior: 0,

    /** RGB fringe at refracted edges. [0 … 0.3] */
    chromaticAberration: 0.34,

    /** Blur of whatever is seen through the glass. [0 … 2] */
    anisotropicBlur: 1.0,

    /** Wavy warping of the refracted image. [0 … 1.5] */
    distortion: 0,

    /** Size of those waves. [0.1 … 2] */
    distortionScale: 0.05,

    /** Animates the distortion over time. [0 … 0.5] */
    temporalDistortion: 0,

    /** Tint color — lighter = clearer glass. Alpha = tint strength. */
    color: "rgb(0, 0, 0)",

    /** Refraction (optical) thickness, px. [4 … 40] */
    thickness: 3,

    /** Physical depth of the slab geometry, px. [6 … 30] */
    depth: 10,

    /** Corner radius of the slab, px. [2 … 20] */
    radius: 15,
  },

  /** Key legends (labels drawn onto the keycaps).
   *  ink = main labels, soft = the small shift-symbols. Adjust the alpha
   *  (last rgba number) to fade legends into the glass. */
  legend: {
    ink: "rgba(255,255,255,0.92)",
    soft: "rgba(255,255,255,0.5)",
    /** Main label size as a fraction of key height. [0.25 … 0.6] */
    mainScale: 0.42,
    /** Size of wide-key labels (Shift, Enter, …), fraction of key height.
     *  [0.2 … 0.45] */
    smallScale: 0.3,
    /** Size of the little shift-symbols (!, @, …), fraction of key height.
     *  [0.15 … 0.35] */
    shiftScale: 0.22,
  },

  /** Cursor-tracking tilt applied to the keyboard and glass slabs. */
  cursorTilt: {
    /** Max tilt angle for the keyboard, radians. [0 … 0.2]
     *  0.06 = subtle, 0.1 = noticeable, 0.15 = dramatic. */
    strength: 0.12,
    /** Smoothing factor per frame at 60fps. [0.02 … 0.2]
     *  Lower = smoother/laggier, higher = more responsive. */
    smoothing: 0.08,
    /** Tilt multiplier for text/link slabs relative to keyboard. [0 … 1] */
    slabFactor: 0.5,
  },

  /** Strength of the environment HDR reflections on the glass.
   *  [0 … 1.5] — 0 = no specular streaks at all (glass goes invisible over
   *  dark footage), 0.3-0.7 = believable sheen, 1+ = showroom lighting. */
  envIntensity: .1,

  /** Which HDR environment provides those reflections. The streaks' shape
   *  and color come from this. */
  envPreset: "forest" as
    | "city" | "sunset" | "dawn" | "night" | "warehouse"
    | "forest" | "apartment" | "studio" | "lobby" | "park",

  /** Scene lights. */
  lights: {
    /** Ambient fill intensity. [0 … 2] */
    ambient: 0.8,
    /** Key light intensity. [0 … 3] — drives the bright top-edge specular. */
    directional: 1.0,
    /** Key light position [x, y, z] in px-ish scene units. Move it to move
     *  the highlights (e.g. negative x = light from the left). */
    directionalPosition: [200, 400, 600] as readonly [number, number, number],
  },

  /** Render resolution cap as a devicePixelRatio clamp. [1 … 2]
   *  Higher = crisper glass on hi-dpi screens, at real GPU cost. */
  maxDpr: 1.6,
} as const;

// ---------------------------------------------------------------------------
// Assembly animation, scrubbed by scroll: the keyboard builds itself as you
// scroll down and un-builds as you scroll back up. The "ms" durations below
// are virtual timeline units — the scroll range maps linearly onto the whole
// timeline, so only their ratios to each other matter.
// ---------------------------------------------------------------------------
export const ASSEMBLY = {
  /** Master switch. Set to false to show the keyboard fully assembled. */
  enabled: true,

  /** Scroll distance that plays the full assembly, as a fraction of the
   *  viewport height. [0.5 … 3] Higher = a slower, more deliberate scrub. */
  scrollRange: 2,

  /** Duration of the base plate rising animation, timeline ms. [400 … 2000] */
  baseDuration: 1200,

  /** How far below (as fraction of viewport height) the base starts. [0.3 … 1.5] */
  baseRiseHeight: 0.9,

  /** Duration of each key's drop animation, timeline ms. [300 … 1500] */
  keyDuration: 1000,

  /** How far above (as fraction of viewport height) keys start. [0.3 … 1.5] */
  keyDropHeight: 0.6,

  /** Max stagger spread across all keys, timeline ms. [100 … 1200]
   *  Each key gets a random delay in this window, so the order they land
   *  in is shuffled. Higher = fewer keys animating at once. */
  keyStagger: 900,

  /** Fraction of baseDuration at which keys start falling. [0 … 1]
   *  0.5 = keys start falling when the base is halfway up. */
  keyStartOffset: 1,

  /** Ease-out exponent for every assembly motion (pieces and board tilt).
   *  [1 … 5] — 1 = linear (mechanical), 2 = gentle, 3 = classic cubic,
   *  4-5 = pieces rush in and brake hard at the end. */
  easePower: 3,

  /** Random rotation range for tumbling keys, degrees. [0 … 45]
   *  0 = keys fall straight, 15 = subtle wobble, 45 = dramatic tumble. */
  tumbleRange: 30,

  // --- Board rotation during & after assembly ---

  /** Starting X tilt during assembly, radians. [-0.8 … 0]
   *  More negative = more tilted back (showing the top face).
   *  Eases to GLASS.tiltX as keys land. */
  startTiltX: -0.55,

  /** Starting Y rotation during assembly, radians. [-0.5 … 0.5]
   *  Nonzero = keyboard starts angled from the side. Eases to 0. */
  startRotateY: 0.25,

  /** Continuous idle float amplitude after settling, radians. [0 … 0.01]
   *  0 = perfectly still, 0.004 = barely perceptible, 0.01 = gentle sway. */
  idleAmplitude: 0.01,

  /** Idle float speed, oscillations per second. [0.1 … 1] */
  idleSpeed: 0.3,
} as const;

// ---------------------------------------------------------------------------
// "Liquid" DOM glass (SVG displacement filter, after reactbits' GlassSurface).
// Only used by the alternate DOM keyboard (LiquidGlassKeyboard.tsx), which is
// currently not mounted anywhere — safe to ignore unless you bring it back.
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
