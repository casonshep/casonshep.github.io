// The content model shared by the /3d/ world, its reader panel, and the
// /3d/text/ page. A Section is one block of the page; its `children` are the
// entries inside it — posts in a list, cards in a grid, pictures on a wall.

export type Vec3 = [number, number, number];

/** How a section lays itself out on the page (see Layout.tsx). */
export type SectionKind =
  /** Big serif intro: a kicker, the climbable name, a paragraph, and a
   *  featured card (the first child) in the right-hand column. */
  | "hero"
  /** Dated rows with tag pills, like a blog index. */
  | "list"
  /** A grid of raised cards. */
  | "cards"
  /** A grid of picture cards; children carry `image`. */
  | "gallery"
  /** A heading, a paragraph and a row of links. */
  | "text";

export type Section = {
  /** Stable key, unique across the whole list (children included). */
  id: string;
  /** The heading — climbable 3D type for sections, a card or row title for children. */
  title: string;
  /** Body paragraphs; the reader panel and /3d/text/ draw one per line. */
  lines: string[];
  links?: readonly { label: string; href: string }[];
  /** Sections only: how the block lays out. Defaults to "text". */
  kind?: SectionKind;
  /** Sections only: where the heading's left edge sits on the page. The
   *  section's content runs from there toward the player (+z). */
  position?: Vec3;
  /** Small mono line: a post's date, a card's "projects · 2026". */
  meta?: string;
  /** Tag pills. */
  tags?: string[];
  /** A picture, path under public/. */
  image?: string;
  children?: Section[];
};
