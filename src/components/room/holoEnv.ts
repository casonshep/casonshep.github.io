import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ROOM } from "../keyboard/visualConfig";

// A small procedural environment map — bands of saturated color around a
// bright top — that the glass alone reflects. It is applied per material
// (envMap prop), so the room's walls and floor stay lit by the spotlight
// only. This is what gives the glass its holographic sheen: iridescence
// and dispersion need colorful reflections to work with.

export function useHoloEnv(): THREE.Texture {
  const gl = useThree((s) => s.gl);
  const tex = useMemo(() => {
    const H = ROOM.glass.holo;
    // Paint an equirectangular gradient: bright glare at the zenith fading
    // through soft, blended color bands at the horizon into dark below.
    // Blended gradients (not flat panels) are what keep the reflections from
    // reading as flat patches of color on the caps.
    const W = 1024;
    const Hh = 512;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = Hh;
    const ctx = canvas.getContext("2d")!;
    // Vertical base: white top → dark bottom.
    const vert = ctx.createLinearGradient(0, 0, 0, Hh);
    vert.addColorStop(0, "#ffffff");
    vert.addColorStop(0.22, "#d8dde6");
    vert.addColorStop(0.5, "#3a3f4a");
    vert.addColorStop(0.75, "#0c0d12");
    vert.addColorStop(1, "#000000");
    ctx.fillStyle = vert;
    ctx.fillRect(0, 0, W, Hh);
    // Color bands wrapping the horizon, blended into each other.
    const bands = H.colors;
    const horiz = ctx.createLinearGradient(0, 0, W, 0);
    bands.forEach((c, i) => horiz.addColorStop(i / bands.length, c));
    horiz.addColorStop(1, bands[0]);
    ctx.globalAlpha = H.saturation;
    ctx.fillStyle = horiz;
    ctx.fillRect(0, Hh * 0.28, W, Hh * 0.42);
    // Feather the band edges into the base gradient.
    ctx.globalAlpha = 1;
    const feather = ctx.createLinearGradient(0, Hh * 0.2, 0, Hh * 0.78);
    feather.addColorStop(0, "rgba(216,221,230,1)");
    feather.addColorStop(0.25, "rgba(216,221,230,0)");
    feather.addColorStop(0.75, "rgba(12,13,18,0)");
    feather.addColorStop(1, "rgba(12,13,18,1)");
    ctx.fillStyle = feather;
    ctx.fillRect(0, Hh * 0.2, W, Hh * 0.58);
    // A few soft highlight streaks so reflections have structure.
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < H.streaks; i++) {
      const x = ((i + 0.5) / H.streaks) * W;
      const g = ctx.createRadialGradient(x, Hh * 0.3, 0, x, Hh * 0.3, W * 0.09);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, Hh);
    }
    ctx.globalCompositeOperation = "source-over";

    const equirect = new THREE.CanvasTexture(canvas);
    equirect.mapping = THREE.EquirectangularReflectionMapping;
    equirect.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromEquirectangular(equirect);
    pmrem.dispose();
    equirect.dispose();
    return rt.texture;
  }, [gl]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
