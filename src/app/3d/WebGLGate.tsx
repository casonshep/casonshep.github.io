"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { hasWebGL } from "@/components/landscape/webgl";

// Mounts the landscape only once the browser has shown it can draw it.
// The Canvas creates its renderer in a layout effect — earlier than anything
// a sibling could do about it — so a browser without WebGL would hit
// three's context error before a redirect landed. Gating here means the
// Canvas never mounts there at all; the visitor goes to the text version.
//
// Support can't change while the page is open, so the store never notifies;
// the server (and hydration) see "unknown" and render nothing.

let probed: boolean | undefined;
const support = () => (probed ??= hasWebGL());
const subscribe = () => () => {};

export default function WebGLGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ok = useSyncExternalStore<boolean | null>(
    subscribe,
    support,
    () => null,
  );

  useEffect(() => {
    if (ok === false) router.replace("/3d/text/");
  }, [ok, router]);

  return ok ? children : null;
}
