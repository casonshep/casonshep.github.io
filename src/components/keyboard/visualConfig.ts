// ============================================================================
// visualConfig.ts — every knob for the site's look, in one place.
//
// Edit and save; the dev server hot-reloads.
// Colors: use "rgba(r,g,b,a)" (or hex) everywhere. For the glass tints the
// alpha channel means TINT STRENGTH — 1 = full color, 0 = no tint (neutral)
// — since those materials have no real transparency.
// Each knob lists a practical range as [min … max] — values outside won't
// break anything, they just stop looking better.
//
// The whole site is one scene (ROOM): the glass keyboard on a podium in a
// dark room, lit by its own glow (and optionally a spotlight).
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
// The room
// ---------------------------------------------------------------------------
export const ROOM = {
  /** Width of the keyboard in world units. Everything else scales off it.
   *  [20 … 40] — only changes the relationship to the fog/room size. */
  boardWidth: 30,

  /** Key layout and legends. */
  board: {
    /** Board proportions, width / height in key units. Wider = flatter. */
    aspect: "15 / 5.6",
    /** Speed of the press animation. [8 … 40] — 8-12 soft, 20-25
     *  mechanical, 40 instant. */
    pressSpeed: 26,
    /** Plate footprint relative to the key grid. */
    plateWidthFactor: 1.03,
    plateHeightFactor: 1.06,
    /** Plate thickness relative to key height. [0.2 … 1] */
    plateDepthScale: 0.5,
    /** Legend ink: main labels and the small shift-symbols. */
    legend: {
      ink: "rgba(255,255,255,0.92)",
      soft: "rgba(255,255,255,0.5)",
      /** Label sizes as a fraction of the cap's depth. */
      mainScale: 0.42,
      smallScale: 0.3,
      shiftScale: 0.22,
    },
  },

  /** How the board is framed in the viewport. The camera pulls back until
   *  the board fits both limits, so the same scene reads on a desktop
   *  window and on a phone held either way. */
  fit: {
    /** Fraction of the viewport width the board spans on a wide viewport
     *  (aspect ≥ `wideAspect`). [0.3 … 0.85] */
    wide: 0.4,
    /** Same, on a narrow one (aspect ≤ `narrowAspect`) — a portrait phone
     *  needs most of its width or the board reads as a stamp.
     *  [0.6 … 1] */
    narrow: 0.94,
    /** Aspect ratios the two figures above belong to; in between, the
     *  fraction is interpolated. [0.4 … 0.8] and [1.1 … 2] */
    narrowAspect: 0.65,
    wideAspect: 1.4,
    /** Fraction of the viewport height the board may span. Binds on short
     *  viewports (a landscape phone), where width is no longer the tight
     *  dimension — and where the presence bar along the bottom edge is what
     *  the board has to clear. [0.4 … 0.9] */
    height: 0.58,
    /** The board's on-screen height as a fraction of its width, once the
     *  tilt and camera elevation have foreshortened its depth. [0.4 … 0.9] */
    heightRatio: 0.72,
  },

  /** How the keyboard is presented on the podium. */
  display: {
    /** Tilt, degrees: the back edge is raised so the caps face the camera,
     *  like a keyboard propped on a stand. 0 = flat. [0 … 25] */
    tilt: 28,
    /** Seconds for one full turn of the slow turntable spin. 0 disables.
     *  [20 … 120] */
    spinSeconds: 35,
  },

  camera: {
    /** Vertical field of view, degrees. [25 … 50] */
    fov: 30,
    /** Elevation above the board, degrees. 0 = table-level, 90 = top-down.
     *  [10 … 70] — low (~16) reads like a product shot of a pedestal. */
    elevation: 30,
    /** Yaw offset around the board, degrees. 0 = straight on. [-30 … 30] */
    yaw: 0,
    /** Point the camera looks at, relative to the podium top [x, y, z]. */
    lookAt: [0, 3, 0] as const,
    /** Cursor parallax: how far (degrees) the camera orbits when the
     *  pointer reaches the viewport edge. 0 disables. [0 … 8] */
    parallaxYaw: 4,
    parallaxPitch: 2,
    /** Smoothing of the parallax. [0.02 … 0.3] — lower = heavier camera. */
    smoothing: 0.4,
  },

  /** The single spotlight. */
  spot: {
    /** Off: no spotlight, beam or dust — the room is lit only by the
     *  keyboard's own glow (plateGlow) and the tiny ambient fill. */
    enabled: false,
    /** Height above the floor, world units. [20 … 60] — keep it above the
     *  camera so the lamp itself stays out of frame and only the beam shows. */
    height: 50,
    /** Horizontal offset [x, z] from the board center. */
    offset: [0, 0] as const,
    /** Half-angle of the cone, radians. [0.3 … 0.7] — the pool's radius
     *  on the floor is tan(angle) × height: 0.5 at height 34 gives ~19,
     *  a little past the 30-wide board's corners; 0.65 lights much more
     *  of the floor. */
    angle: 0.3,
    /** Edge softness. [0 … 1] */
    penumbra: 0.9,
    /** Brightness (candela). Physically-based falloff, so scale with the
     *  square of height. [800 … 6000] */
    intensity: 2000,
    /** Light color. Neutral white for a studio look. */
    color: "#ffffff",
    /** Shadow map resolution. [1024 … 4096] */
    shadowMapSize: 2048,
    /** Shadow softness (PCFSoft radius). [1 … 6] */
    shadowRadius: 3,

    /** Visible beam (volumetric cone). */
    beam: {
      enabled: true,
      /** Beam opacity. [0 … 0.6] */
      opacity: 0.2,
      /** How fast the beam fades along its length. [10 … 60] */
      attenuation: 45,
      /** Edge falloff of the cone. [2 … 12] — higher = sharper edge. */
      anglePower: 5,
    },

    /** Dust motes drifting through the beam. */
    dust: {
      enabled: true,
      /** Particle count. [0 … 1500] */
      count: 500,
      /** Particle size, world units. [0.03 … 0.15] */
      size: 0.1,
      /** Opacity. [0.1 … 1] */
      opacity: 0.7,
      /** Fall speed, units/second. [0.05 … 0.6] */
      speed: 0.30,
      /** Sideways wander. [0 … 0.5] */
      wander: 0.25,
    },
  },

  /** Identity-disc stand under the keyboard (Tron). Replaces the podium. */
  disc: {
    enabled: false,
    /** Outer radius, world units. The board is 30 wide, so ~13 tucks the
     *  disc mostly under it as a base. [10 … 22] */
    radius: 13,
    /** Radius of the centre hole. [3 … 0.6 × radius] */
    holeRadius: 5.4,
    /** Thickness. [0.8 … 2.5] */
    thickness: 1.25,
    /** Edge chamfer. [0.05 … 0.3] */
    chamfer: 0.16,
    /** Body: dark glossy plastic. */
    bodyColor: "#1b1c21",
    bodyRoughness: 0.32,
    /** Clear-coat gloss on the body. [0 … 1] */
    clearcoat: 0.7,
    /** Reflection strength (same holographic env as the glass). [0 … 1] */
    envMapIntensity: 0.35,
    /** LED colour and emissive strength (tone-mapped: >1 blooms softly). */
    ledColor: "#ff4fc3",
    ledIntensity: 2.6,
    /** Radius and width of the LED groove in the top face. */
    bandRadius: 9.2,
    bandWidth: 0.42,
    /** Depth of that groove. [0.05 … 0.4] */
    grooveDepth: 0.16,
    /** How many arcs the ring is split into, and the gap between them. */
    segments: 4,
    gapDegrees: 10,
    /** Rim slot: height as a fraction of thickness, and its depth. */
    rimBand: 0.34,
    slotDepth: 0.14,
    /** How much the LEDs light the keyboard above. 0 disables. [0 … 200] */
    lightIntensity: 30,
  },


  /** The round pedestal the keyboard is displayed on. */
  podium: {
    enabled: false,
    /** Radius, world units. The 30-wide board's half-diagonal is ~15.7. */
    radius: 19,
    /** Height, world units. [1 … 8] */
    height: 3.2,
    /** Concrete grey; the top catches the light, the side falls off. */
    color: "#3a3a3a",
    roughness: 0.92,
  },

  room: {
    /** Render the floor, walls and ceiling. Off leaves the keyboard and
     *  its stand floating in the dark. */
    geometry: false,
    /** Floor color. Neutral dark grey so the light pool stays colorless. */
    floorColor: "#1a1a1a",
    /** Floor material. Lower roughness = glossier reflection of the pool. */
    floorRoughness: 0.8,
    floorMetalness: 0.0,
    /** Wall color. */
    wallColor: "#0a0a0a",
    /** Distance from board center to the back wall / side walls / ceiling. */
    backWall: 40,
    sideWall: 55,
    ceiling: 48,
    /** Fog: everything past `far` fades to black. */
    fogColor: "#000000",
    fogNear: 55,
    fogFar: 190,
    /** Barely-there fill so the room isn't a pure void. [0 … 0.08] */
    ambient: 0,
  },

  /** Glass materials (MeshTransmissionMaterial knobs). */
  glass: {
    key: {
      roughness: 0,
      /** Higher = light bends more through the cap. Water is 1.33, but the
       *  watery *look* wants heavy bending: 1.8–2.2. [1.2 … 2.4] */
      ior: 3,
      thicknessFactor: 2,
      /** Color splitting through the glass. [0 … 1.5] — the holographic
       *  look wants a lot. */
      chromaticAberration: 0.19,
      anisotropicBlur: 0,
      /** Liquid warping of what's seen through the cap. [0 … 1.5] */
      distortion: 0.4,
      /** Scale of the waves: small = fine ripples, large = broad slow
       *  swells, which read as water. [0.2 … 2] */
      distortionScale: .6,
      /** How fast the warping flows. [0 … 0.6] */
      temporalDistortion: 0.05,
      /** Tint; alpha = strength. Kept light so the caps read as clear glass. */
      color: "rgba(235, 242, 255, 0)",
      /** Clear-coat gives the spotlight a crisp highlight on every cap.
       *  [0 … 1] */
      clearcoat: 0,
      clearcoatRoughness: 0.08,
      /** Thin-film iridescence (soap-bubble rainbow) on the surface.
       *  [0 … 1] */
      iridescence: 0.1,
      /** IOR of the film. [1 … 2.33] — higher = stronger color shift. */
      iridescenceIOR: 2,
      /** Film thickness range, nm. Wider = more hue variation. */
      iridescenceThicknessRange: [0, 300] as const,
      /** Strength of the holographic reflections. [0 … 3] */
      envMapIntensity: 0.12,
    },
    plate: {
      roughness: 0,
      ior: 1.7,
      thicknessFactor: 0.8,
      chromaticAberration: 0.1,
      anisotropicBlur: 0,
      distortion: 0.65,
      distortionScale: 1,
      temporalDistortion: 0.8,
      iridescence: 0.3,
      iridescenceIOR: 1.5,
      iridescenceThicknessRange: [200, 800] as const,
      envMapIntensity: 0.1,
      /** Lightly smoked glass tray. */
      color: "rgba(160, 172, 205, 0.12)",
      clearcoat: 0.0,
      clearcoatRoughness: 0.25,
    },
    /** Glowing spectral-flow panel under the glass plate (a thin emissive
     *  sheet; the plate and caps refract it). */
    plateGlow: {
      enabled: true,
      /** Brightness of the emitted light. [0.2 … 3] */
      intensity: 2,
      /** Animation speed. [0 … 1] */
      speed: 0.55,
      /** Zoom of the pattern: bigger = more, smaller swirls. [1 … 8] */
      scale: 18.6,
      /** How many rainbow cycles the field spans — the density of the
       *  colour stripes. [2 … 16] */
      stripes: 6,
      /** Dark-to-bright contrast of the streaks. [0.5 … 4] — higher =
       *  thinner bright lines on a dark ground. */
      contrast: 14,
      /** Elongation along the plate's length. [1 … 4] */
      stretch: 2.5,
      /** Colour saturation. [0 … 1] */
      saturation: 1,
      /** The flow takes its colour from the sprite you picked in the
       *  presence bar. */
      tint: {
        enabled: true,
        /** How much of the colour wheel one cycle of the flow covers.
         *  1 = the full rainbow, merely rotated so your sprite's hue leads.
         *  Lower narrows it to a band around that hue — 0.3 reads clearly
         *  as "Charmander is orange" while keeping some spectral life.
         *  [0.12 … 1] */
        spread: 0.3,
        /** Crossfade to a new pick, per frame at 60fps. [0.01 … 0.2] */
        smoothing: 0.04,
      },
    },

    /** The colors the glass reflects (procedural env map, glass only).
     *  Saturated warm/cool alternation gives the holographic bands. */
    holo: {
      colors: ["#ff8a3d", "#37c6ff", "#ff5fd2", "#ffd36a", "#4f7dff", "#7dffd8"],
      /** How strongly the color bands show against the neutral gradient.
       *  [0 … 1] — 1 = fully saturated bands, 0.4 = a tinted sheen. */
      saturation: 0.15,
      /** Soft white highlight streaks around the horizon. [0 … 8] */
      streaks: 0,
    },

    /** Legends are lit by the spotlight; this adds self-glow so they stay
     *  readable against the bright glass. [0 … 1] */
    legendGlow: 2,
    /** Pixels of legend texture per world unit. [48 … 160] */
    legendResolution: 96,
    /** Corner rounding of the caps, as a fraction of the cap's smaller
     *  side.
     *  [0.02 … 0.5] — 0.05 = crisp machined edges, 0.24 = soft pillows. */
    keyRadiusFactor: 0.05,
    /** Corner rounding of the plate, relative to key height. [0.02 … 0.5] */
    plateRadiusFactor: 0.08,

    /** Press travel as a fraction of key height. The cap floats this far
     *  above the plate (the switch housing fills the gap) and bottoms out
     *  flush with it when pressed. [0.15 … 0.5] */
    pressTravel: 0.22,

    /** Keycap shaping and the parts visible inside the clear glass. */
    detail: {
      /** Top face size relative to the base. 1 = straight block,
       *  0.85 = classic sculpted keycap. [0.7 … 1] */
      taper: 0.72,
      /** Depth of the dish scooped into the top, as a fraction of key
       *  height. 0 = flat. [0 … 0.2] — SA-style caps sit around 0.12. */
      dish: 0.2,
      /** Key height as a multiple of one key unit . [0.5 … 1.4] — SA-style is tall, ~1.1. */
      height: 0.85,
      /** Gap between caps as a fraction of a key unit . [0.03 … 0.2] */
      gap: 0.0,
      /** Show a switch housing + stem under each cap (seen through the
       *  glass; the stem travels with the cap when pressed). Off: the caps
       *  simply float a press-travel above the plate. */
      switches: false,
      /** Switch housing: a dark block on the plate. */
      housingColor: "#1c1d22",
      /** Housing footprint relative to the cap. [0.4 … 0.8] */
      housingSize: 0.6,
      /** Stem color — the accent seen through every cap. */
      stemColor: "#e0a33b",
      /** Stem self-glow. [0 … 1] */
      stemGlow: 0.05,
    },
  },

  /** Top-right nav, typed in one character at a time on load — the
   *  matching keys press on the 3D keyboard as it types. */
  nav: {
    items: [
      { label: "me", href: "#me" },
      { label: "projects", href: "#projects" },
      { label: "art", href: "#art" },
    ] as readonly { label: string; href: string }[],
    /** Delay before typing starts, ms. [0 … 3000] */
    startDelayMs: 900,
    /** Time per character, ms. [40 … 200] */
    charMs: 95,
    /** Small random jitter added per character so it feels human. [0 … 80] */
    jitterMs: 45,
    /** Pause between items, ms. [0 … 1500] */
    gapMs: 420,
    /** CSS font size. */
    fontSize: "clamp(0.8rem, 1.1vw, 0.95rem)",
  },

  /** Renderer exposure. The board is lit only by its own glow, and the
   *  ASCII backdrop used to add most of the visible light; this brings it
   *  back without touching the materials. [0.5 … 6] */
  exposure: 3.2,

  /** Pointer cap for device-pixel-ratio: 3 render passes per frame. */
  maxDpr: 1.,
} as const;
