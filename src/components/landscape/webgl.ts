// Whether the landscape can draw at all. Asked once on /3d/, by WebGLGate:
// a visitor whose browser can't make a context is sent to the text version
// rather than shown a blank sky.

/** Whether this browser can create a WebGL context. False on the server. */
export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    // Hand the probe's context back straight away — browsers cap live
    // contexts, and the real Canvas is about to want one.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
