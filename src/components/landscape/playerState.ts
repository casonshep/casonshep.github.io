import { Box3, Vector3 } from "three";

// Per-frame state shared outside React, so nothing re-renders at 60 Hz.
// The player writes `position` every frame; each block registers its
// world-space bounds once its geometry exists; the overlay reads both to
// work out which block the player is standing on.

export const playerState = { position: new Vector3(), ready: false };

/** Section id → world-space bounds of its block. */
export const sectionBounds = new Map<string, Box3>();
