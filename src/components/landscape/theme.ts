// The page's design tokens — the 3D world's equivalent of a stylesheet.
// A hand-made personal site on paper: warm off-white page, black ink for
// headings and borders, square corners, hard offset shadows instead of soft
// ones, a serif for display, sans for reading, mono for dates and labels,
// and one oxblood red for anything you'd click. Every component under
// landscape/ reads from here.

export const INK = {
  /** The floor far below the page. */
  void: "#e7e3da",
  /** The page itself. */
  page: "#fbfaf7",
  /** The page's cut edge, a shade down so the drop is visible. */
  pageSide: "#d6d1c6",
  /** Card faces. */
  card: "#ffffff",
  /** Borders and hard shadows. */
  line: "#151515",
  /** Hairlines between rows and sections. */
  rule: "#d9d5cc",
  text: "#151515",
  dim: "#4a4a4a",
  faint: "#8a867d",
  accent: "#a3231c",
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
