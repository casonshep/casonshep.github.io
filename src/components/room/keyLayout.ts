import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ROWS, ROW_UNITS, type KeyConfig } from "../keyboard/Keyboard";
import { GLASS } from "../keyboard/visualConfig";

// Key layout in world units, y-up: x runs along the board, z runs from the
// back row (negative) to the front row (positive). Depth (key height) is y.

export interface LayoutKey {
  cfg: KeyConfig;
  x: number;
  z: number;
  w: number;
  /** Footprint along z (front-to-back). */
  h: number;
}

export interface BoardLayout {
  /** Board footprint (x span and z span) in world units. */
  w: number;
  h: number;
  /** Height of a keycap. */
  depth: number;
  unit: number;
  keys: LayoutKey[];
}

/** Board footprint from ROOM.boardWidth and the GLASS.boardAspect ratio. */
export function layoutBoard(
  boardW: number,
  opts: { gapFactor?: number; depthFactor?: number } = {},
): BoardLayout {
  const gapFactor = opts.gapFactor ?? GLASS.keyGapFactor;
  const depthFactor = opts.depthFactor ?? GLASS.keyDepthFactor;
  const [aw, ah] = GLASS.boardAspect.split("/").map((s) => Number(s.trim()));
  const boardH = boardW * (ah / aw);
  const unit = boardW / ROW_UNITS;
  const rowH = boardH / ROWS.length;
  const gap = unit * gapFactor;
  const keys: LayoutKey[] = [];
  ROWS.forEach((row, rowIdx) => {
    let cursor = 0;
    for (const cfg of row) {
      const width = cfg.width ?? 1;
      keys.push({
        cfg,
        x: (cursor + width / 2) * unit - boardW / 2,
        // Row 0 is the back row → most negative z.
        z: (rowIdx + 0.5) * rowH - boardH / 2,
        w: width * unit - gap,
        h: rowH - gap,
      });
      cursor += width;
    }
  });
  return { w: boardW, h: boardH, depth: unit * depthFactor, unit, keys };
}

/** Draws a key's legend into a canvas texture sized for a w×h (world unit)
 *  cap at `pxPerUnit` resolution. Null for blank caps. */
export function makeLegendTexture(
  cfg: KeyConfig,
  w: number,
  h: number,
  pxPerUnit: number,
): THREE.CanvasTexture | null {
  if (!cfg.label && !cfg.shiftLabel) return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(w * pxPerUnit));
  canvas.height = Math.max(2, Math.round(h * pxPerUnit));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const H = canvas.height;

  const font = (px: number, weight: number) =>
    `${weight} ${Math.round(px)}px ui-monospace, Menlo, monospace`;

  if (cfg.label) {
    const px = H * (cfg.small ? GLASS.legend.smallScale : GLASS.legend.mainScale);
    ctx.font = font(px, cfg.small ? 600 : 700);
    ctx.fillStyle = GLASS.legend.ink;
    ctx.textBaseline = "middle";
    if (cfg.align === "left") {
      ctx.textAlign = "left";
      ctx.fillText(cfg.label, H * 0.22, H * 0.62);
    } else {
      ctx.textAlign = "center";
      ctx.fillText(cfg.label, canvas.width / 2, H * 0.58);
    }
  }
  if (cfg.shiftLabel) {
    ctx.font = font(H * GLASS.legend.shiftScale, 500);
    ctx.fillStyle = GLASS.legend.soft;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(cfg.shiftLabel, H * 0.18, H * 0.12);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A keycap: rounded box, tapered toward the top, with a shallow spherical
 *  dish scooped into the top face. `w` along x, `d` (height) along y, `h`
 *  along z. */
export function makeKeycapGeometry(
  w: number,
  d: number,
  h: number,
  radius: number,
  taper: number,
  dish: number,
): THREE.BufferGeometry {
  const r = Math.min(radius, Math.min(w, d, h) / 2);
  const box = new RoundedBoxGeometry(w, d, h, 6, r);
  // Share vertices across faces so the deformed surface gets smooth normals.
  const geo = mergeVertices(box, 1e-4);
  box.dispose();
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const dishDepth = dish * d;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // 0 at the base … 1 at the top.
    const t = Math.min(1, Math.max(0, (y + d / 2) / d));
    const s = 1 + (taper - 1) * t;
    const nx = x * s;
    const nz = z * s;
    let ny = y;
    if (dishDepth > 0 && y > 0) {
      // Only the top face (y near d/2) is scooped; the bevel blends in.
      const top = Math.min(1, Math.max(0, (y - d * 0.35) / (d * 0.15)));
      const rx = nx / ((w / 2) * taper);
      const rz = nz / ((h / 2) * taper);
      const bowl = Math.max(0, 1 - (rx * rx + rz * rz));
      ny -= dishDepth * bowl * top;
    }
    pos.setXYZ(i, nx, ny, nz);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
