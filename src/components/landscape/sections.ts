import type { Section } from "./types";

// Everything the landscape says, in one file — the same split the room uses
// (navContent.ts / visualConfig.ts): this module says *what* is on the page
// and where, the components only know how to draw it. /3d/text/ reads the
// same list, so editing it here changes both on reload.
//
// >>> Placeholder copy. Rewrite every `lines` entry in your own words. <<<
//
// Layout: the world is a web page lying flat (see worldConfig.ts). The page
// is 36 m across (x from −18 to 18) and runs from the header at z = 8 down
// to the footer at z = −92; the player spawns just under the header, facing
// down the page. Sections stack down it like a scrolling site — hero, a row
// of project cards, two columns, a closing block — between the hairline
// dividers drawn in Page.tsx (DIVIDERS). Keep blocks inside x ±16, or
// they'll hang off the edge.
//
// `children` are smaller blocks; their `position` is relative to the
// parent's, and their ids must be unique across the whole list.

export const SECTIONS: Section[] = [
  {
    id: "me",
    title: "me",
    lines: [
      "Placeholder. Hi — I'm Cason. I build small, odd, hand-made things for the web.",
      "This is my site, laid flat. Walk down the page; mind the edges.",
    ],
    links: [{ label: "email", href: "mailto:cason@axlemobility.com" }],
    position: [0, 0, -9],
    color: "#ff9f6e",
  },
  {
    id: "projects",
    title: "projects",
    lines: [
      "Placeholder. Things I've built and kept. The row below is the highlights.",
      "Climb any of them for the one-line version.",
    ],
    links: [{ label: "github", href: "https://github.com/casonshep" }],
    position: [0, 0, -26],
    color: "#8c9bff",
    children: [
      {
        id: "projects-room",
        title: "dark room",
        lines: ["Placeholder. The home page: a keyboard under a spotlight that types the nav for you."],
        links: [{ label: "visit", href: "/" }],
        position: [-11.5, 0, -11],
        color: "#aab4ff",
      },
      {
        id: "projects-wall",
        title: "art wall",
        lines: ["Placeholder. ASCII plates that resolve into the real piece under your cursor."],
        links: [{ label: "visit", href: "/art/" }],
        position: [0, 0, -11],
        color: "#b9a6ff",
      },
      {
        id: "projects-presence",
        title: "presence",
        lines: ["Placeholder. Everyone on the site at once, as a little row of sprites."],
        position: [11.5, 0, -11],
        color: "#9fd0ff",
      },
    ],
  },
  {
    id: "art",
    title: "art",
    lines: [
      "Placeholder. Pictures I've made, hung on a wall that pretends to be a terminal.",
    ],
    links: [{ label: "the wall", href: "/art/" }],
    position: [-9, 0, -54],
    color: "#ff7eb6",
  },
  {
    id: "blog",
    title: "blog",
    lines: [
      "Placeholder. Notes from building this site, mostly about what didn't work the first time.",
    ],
    position: [9, 0, -54],
    color: "#5fd4c8",
  },
  {
    id: "contact",
    title: "contact",
    lines: [
      "Placeholder. The fastest way to reach me is email; the slowest is standing on this block.",
    ],
    links: [
      { label: "email", href: "mailto:cason@axlemobility.com" },
      { label: "github", href: "https://github.com/casonshep" },
    ],
    position: [0, 0, -75],
    color: "#c19bff",
  },
];
