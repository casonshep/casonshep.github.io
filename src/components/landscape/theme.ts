// The page's design tokens — the 3D world's equivalent of a stylesheet.
// A dark personal site: charcoal page, near-white serif headings, a quiet
// sans for body copy, mono for dates and labels, one coral accent for
// anything you'd click. Every component under landscape/ reads from here.

export const INK = {
  /** The void around the page. */
  void: "#040405",
  /** The page itself. */
  page: "#1b1b20",
  /** The page's cut edge, a shade up so the drop is visible. */
  pageSide: "#2a2a31",
  /** Raised surfaces: cards, the nav pill, tag pills. */
  card: "#24242b",
  cardTop: "#202026",
  /** Hairlines and card outlines. */
  rule: "#35353f",
  text: "#ececf1",
  dim: "#9a9aa6",
  faint: "#62626d",
  accent: "#ff8a7a",
};

export const FONT = {
  /** Flat text faces (troika — any TTF). */
  serif: "/fonts/InstrumentSerif-Regular.ttf",
  sans: "/fonts/Geist-Regular.ttf",
  mono: "/fonts/GeistMono.ttf",
  /** Extruded heading face (three.js typeface JSON, converted from the serif). */
  serif3d: "/fonts/instrument_serif.typeface.json",
};

/** The content column: everything sits between x = −COLUMN and +COLUMN. */
export const COLUMN = 13;
