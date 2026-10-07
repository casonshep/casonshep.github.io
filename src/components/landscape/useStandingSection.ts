"use client";

import { useEffect, useState } from "react";
import type { Vector3 } from "three";
import { playerState, sectionBounds } from "./playerState";
import { SECTIONS } from "./sections";
import type { Section } from "./types";
import { WORLD } from "./worldConfig";

// Which block the player is standing on, worked out from the two shared
// singletons rather than physics contacts: once a frame, the player's
// position against every block's registered bounds. React only hears about
// it when the answer changes.
//
// "On" means: inside the block's x/z footprint (plus a small margin, so the
// panel doesn't drop at a letter's edge), and vertically between just under
// its top face and WORLD.standHeadroom above it. The player may write its
// feet or its body centre — the capsule is ~1.6 tall, so the centre of a
// player standing on top sits ≈ 0.8 above the face. The window spans both
// conventions; if Player.tsx ever writes something else (the camera, say),
// re-check the headroom. Mid-jump the player is still inside it up to
// headroom, and the grace below covers the rest.

/** How far outside the footprint still counts, m. */
const MARGIN = 0.15;
/** How far below the top face still counts, m — sinking into the collider. */
const BELOW_TOP = 0.3;
/** How long a section outlives leaving its block, ms — no flicker mid-jump. */
const GRACE_MS = 400;

/** The id of the highest block under `p`, or null. */
function standingOn(p: Vector3): string | null {
  let best: string | null = null;
  let bestTop = -Infinity;
  for (const [id, box] of sectionBounds) {
    const top = box.max.y;
    if (
      p.x >= box.min.x - MARGIN &&
      p.x <= box.max.x + MARGIN &&
      p.z >= box.min.z - MARGIN &&
      p.z <= box.max.z + MARGIN &&
      p.y >= top - BELOW_TOP &&
      p.y <= top + WORLD.standHeadroom &&
      top > bestTop
    ) {
      best = id;
      bestTop = top;
    }
  }
  return best;
}

/** Every section by id, children included. */
function index(list: readonly Section[], into = new Map<string, Section>()) {
  for (const s of list) {
    into.set(s.id, s);
    if (s.children) index(s.children, into);
  }
  return into;
}

/** The section whose block the player is standing on, or null. */
export function useStandingSection(): Section | null {
  const [section, setSection] = useState<Section | null>(null);

  useEffect(() => {
    const byId = index(SECTIONS);
    let current: string | null = null;
    let lastSeen = 0;
    let raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const hit = playerState.ready ? standingOn(playerState.position) : null;
      let next = current;
      if (hit) {
        // Block to block is immediate; only leaving waits out the grace.
        next = hit;
        lastSeen = now;
      } else if (current && now - lastSeen > GRACE_MS) {
        next = null;
      }
      if (next === current) return;
      current = next;
      setSection(next ? (byId.get(next) ?? null) : null);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return section;
}
