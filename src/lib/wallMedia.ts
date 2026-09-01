export type WallItem = {
  /** Image URL. Drop personal media into /public (e.g. /wall/surf.jpg)
   *  and reference it as "/wall/surf.jpg". Remote URLs must allow CORS
   *  (the image is redrawn into a canvas that feeds the glass refraction). */
  image: string;
  /** Accessible name for the tile. */
  title?: string;
  /** Where clicking the tile goes. Internal ("/projects/foo") or external
   *  ("https://…"). Omit for a non-clickable tile. */
  href?: string;
};

// Placeholder media (generated gradients in /public/wall) — swap these for
// your own photos/clip stills.
export const wallItems: WallItem[] = Array.from({ length: 15 }, (_, i) => ({
  image: `/wall/tile-${String(i + 1).padStart(2, "0")}.svg`,
  title: `Tile ${i + 1}`,
  // href: "/somewhere", // ← make a tile clickable by giving it a destination
}));
