import type { Section } from "./types";

// Everything the landscape says, in one file — the same split the room uses
// (navContent.ts / visualConfig.ts): this module says *what* stands in the
// field and where, the components only know how to draw it. /3d/text/ reads
// the same list, so editing it here changes both on reload.
//
// >>> Placeholder copy. Rewrite every `lines` entry in your own words. <<<
//
// Layout: ground level is y = 0 and the player spawns at the origin, facing
// −z. The blocks run a loose loop from there — `me` just ahead, then
// round clockwise — about 20 m apart, a few seconds' walk each. Every block
// turns (in quarter turns) to read the right way up from spawn, so moving
// one to the other side of the field needs no other change.
//
// `children` are smaller blocks; their `position` is relative to the
// parent's, and their ids must be unique across the whole list.

export const SECTIONS: Section[] = [
  {
    id: "me",
    title: "me",
    lines: [
      "Placeholder. Hi — I'm Cason. I build small, odd, hand-made things for the web.",
      "You're standing on my name, more or less. Jump on the rest.",
    ],
    links: [{ label: "email", href: "mailto:cason@axlemobility.com" }],
    position: [0, 0, -9],
    color: "#ff8a5c",
  },
  {
    id: "projects",
    title: "projects",
    lines: [
      "Placeholder. Things I've built and kept. The little blocks behind this one are the highlights.",
      "Climb any of them for the one-line version.",
    ],
    links: [{ label: "github", href: "https://github.com/casonshep" }],
    position: [-14, 0, -18],
    color: "#7b8cff",
    children: [
      {
        id: "projects-room",
        title: "dark room",
        lines: ["Placeholder. The home page: a keyboard under a spotlight that types the nav for you."],
        links: [{ label: "visit", href: "/" }],
        position: [-12, 0, -8],
        color: "#a3afff",
      },
      {
        id: "projects-wall",
        title: "art wall",
        lines: ["Placeholder. ASCII plates that resolve into the real piece under your cursor."],
        links: [{ label: "visit", href: "/art/" }],
        position: [0, 0, -10],
        color: "#9d8bff",
      },
      {
        id: "projects-presence",
        title: "presence",
        lines: ["Placeholder. Everyone on the site at once, as a little row of sprites."],
        position: [12, 0, -8],
        color: "#8fc4ff",
      },
    ],
  },
  {
    id: "art",
    title: "art",
    lines: [
      "Placeholder. Pictures I've made, hung on a wall that pretends to be a terminal.",
      "Better in person than in 3D — the link's below.",
    ],
    links: [{ label: "the wall", href: "/art/" }],
    position: [12, 0, -28],
    color: "#ff6fa8",
  },
  {
    id: "music",
    title: "music",
    lines: [
      "Placeholder. What's on repeat this month, and a few things I've recorded badly on purpose.",
    ],
    links: [{ label: "playlist", href: "https://open.spotify.com" }],
    position: [28, 0, -10],
    color: "#ffc93c",
  },
  {
    id: "blog",
    title: "blog",
    lines: [
      "Placeholder. Notes from building this site, mostly about things that didn't work the first time.",
      "Posts land here when they're finished, which is rarely.",
    ],
    position: [28, 0, 12],
    color: "#4fd1c5",
  },
  {
    id: "minecraft",
    title: "minecraft",
    lines: [
      "Placeholder. A survival world that's been running longer than some friendships.",
      "Ask for the address and I'll probably let you in.",
    ],
    position: [12, 0, 28],
    color: "#6ccf5a",
  },
  {
    id: "pokemon",
    title: "pokemon",
    lines: [
      "Placeholder. The whole dex by name — and the sprites wandering the home page are visitors.",
      "Favourite changes weekly. Currently: whoever I lost to last.",
    ],
    links: [{ label: "say hi", href: "/" }],
    position: [-12, 0, 26],
    color: "#ff5b5b",
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
    position: [-28, 0, 6],
    color: "#b77bff",
  },
];
