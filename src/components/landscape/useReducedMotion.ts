"use client";

import { useSyncExternalStore } from "react";

// prefers-reduced-motion as a live value. An external store rather than
// state + effect, so the first client render already has the real answer
// and a change in OS settings applies without a reload. The server has no
// media queries and says no.

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True when the visitor prefers reduced motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
