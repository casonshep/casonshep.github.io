import type { Vec3 } from "./types";

// Every shared tuning knob for the landscape, the way visualConfig.ts holds
// the room's. Units are metres; the player capsule is ~1.6 tall.
export const WORLD = {
  /** Side length of the square ground. */
  groundSize: 100,
  spawn: [0, 2, 0] as Vec3,
  /** Peak jump height; the controller's jump velocity is tuned to reach it. */
  jumpHeight: 1.0,
  /** Title letter height — ≈ 0.6 × jumpHeight: climbable, not trivial. */
  letterHeight: 0.6,
  /** The player counts as standing on a block up to this far above its top. */
  standHeadroom: 1.5,
  dpr: [1, 1.5] as [number, number],
};
