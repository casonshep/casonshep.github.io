// What the nav opens. Everything a visitor reads on this site lives here —
// the panel component below only knows how to draw it.
//
// >>> Placeholder copy. Rewrite the three panels below in your own words. <<<

export type Panel = {
  title: string;
  /** Body paragraphs, drawn one per line. */
  lines: string[];
  /** Optional list of links under the body. */
  links?: readonly { label: string; href: string }[];
};

/** Keyed by nav label, so `ROOM.nav.items` stays the single list of what
 *  the nav says and in what order. */
const PANELS: Record<string, Panel> = {
  me: {
    title: "me",
    lines: [
      "Placeholder. A line or two about who you are and what you build.",
      "Keep it short — the room is the first impression, this is the caption.",
    ],
    links: [{ label: "email", href: "mailto:cason@axlemobility.com" }],
  },
  projects: {
    title: "projects",
    lines: [
      "Placeholder. Two or three things worth showing, one line each.",
    ],
    links: [{ label: "github", href: "https://github.com" }],
  },
  art: {
    title: "art",
    lines: ["Placeholder. What you make when it isn't code."],
  },
};

export function panelFor(id: string | null): Panel | null {
  if (!id) return null;
  return PANELS[id] ?? null;
}
