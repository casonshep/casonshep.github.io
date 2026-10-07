import type { Vec3 } from "./types";

// Every shared tuning knob for the landscape, the way visualConfig.ts holds
// the room's. Units are metres; the player capsule is ~1.6 tall.
//
// The world is one web page laid flat and floating in the dark: x runs
// across the page, and the page runs "down" toward −z, the way the player
// faces at spawn. Its top surface is y = 0; off the edge is a fall.
export const WORLD = {
  page: {
    /** Across, x. */
    width: 32,
    /** z of the top edge (behind spawn, under the header) … */
    top: 8,
    /** … and of the bottom edge (past the footer). */
    bottom: -84,
    /** Slab thickness under the surface. */
    thickness: 1.5,
  },
  spawn: [0, 2, 1] as Vec3,
  /** Peak jump height; the controller's jump velocity is tuned to reach it. */
  jumpHeight: 1.0,
  /** Title letter height — ≈ 0.6 × jumpHeight: climbable, not trivial. */
  letterHeight: 0.6,
  /** The player counts as standing on a block up to this far above its top. */
  standHeadroom: 1.5,
  dpr: [1, 1.5] as [number, number],
};
