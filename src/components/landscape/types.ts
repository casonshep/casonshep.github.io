// Contract shared by every part of the /3d/ landscape. Frozen after the
// foundation commit — change it in one place, deliberately.

export type Vec3 = [number, number, number];

export type Section = {
  /** Stable key: "me", "projects", … */
  id: string;
  /** Rendered as climbable Text3D. */
  title: string;
  /** Body paragraphs — the reader overlay and /3d/text/ draw one per line. */
  lines: string[];
  links?: readonly { label: string; href: string }[];
  /** Hand-placed along the path from spawn. */
  position: Vec3;
  /** Block colour in the low-poly palette. */
  color?: string;
  /** Letter extrusion height; defaults to WORLD.letterHeight. */
  height?: number;
  /** Smaller blocks, e.g. individual projects. */
  children?: Section[];
};
