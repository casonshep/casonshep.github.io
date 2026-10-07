import type { Section } from "./types";

// Everything the page says, in one file — the same split the room uses
// (navContent.ts / visualConfig.ts): this module says *what* is on the page,
// Layout.tsx only knows how to draw each kind of section. /3d/text/ reads
// the same list, so editing it here changes both on reload.
//
// >>> Placeholder copy. Rewrite it in your own words. <<<
//
// Layout: the page is a dark site lying flat (see worldConfig.ts and
// Page.tsx). The content column runs from x = −13 to 13; the player spawns
// under the header at z ≈ 1 and walks "down" the page toward −z. Each
// section's `position` is its heading's left edge; its content (rows,
// cards, paragraph) runs from there back toward the player, so on screen
// it reads heading-above-body like any web page. Leave ~14 m between
// headings for a list or grid, ~12 m for a short text block.

export const SECTIONS: Section[] = [
  {
    id: "me",
    kind: "hero",
    title: "I'm Cason.",
    meta: "hello, world —",
    lines: [
      "I build small, odd, hand-made things for the web, and I'm currently making this one walkable.",
      "Off the clock: coffee, keyboards, and drawing things I can't code.",
    ],
    links: [
      { label: "email", href: "mailto:cason@axlemobility.com" },
      { label: "github", href: "https://github.com/casonshep" },
    ],
    position: [-13, 0, -10],
    children: [
      {
        id: "me-now",
        title: "Building a site you can walk on",
        meta: "now · october 2026",
        lines: ["Placeholder. This page, as it happens — a personal site laid flat and given a floor."],
        tags: ["three.js", "r3f", "rapier"],
      },
    ],
  },
  {
    id: "writing",
    kind: "list",
    title: "Writing",
    lines: ["Placeholder. Notes from building things, mostly about what didn't work the first time."],
    links: [{ label: "all posts", href: "/3d/text/#writing" }],
    position: [-13, 0, -27],
    children: [
      {
        id: "post-walkable",
        title: "Making a website you can walk on",
        meta: "Oct 06",
        lines: ["Placeholder. Physics, a Pokémon, and why the letters lie on their backs."],
        tags: ["#3d", "#react"],
      },
      {
        id: "post-keyboard",
        title: "A glass keyboard that types the nav",
        meta: "Sep 05",
        lines: ["Placeholder. The home page, and the spotlight that refuses to be subtle."],
        tags: ["#three", "#design"],
      },
      {
        id: "post-ascii",
        title: "Art as ASCII, resolved on hover",
        meta: "Sep 06",
        lines: ["Placeholder. Turning pictures into glyphs and back again."],
        tags: ["#canvas"],
      },
      {
        id: "post-presence",
        title: "Everyone on the site at once",
        meta: "Aug 31",
        lines: ["Placeholder. Realtime presence with sprites, on a static host."],
        tags: ["#supabase", "#realtime"],
      },
    ],
  },
  {
    id: "projects",
    kind: "cards",
    title: "Projects",
    lines: ["Placeholder. Things I've built and kept. Hop onto one."],
    links: [{ label: "github", href: "https://github.com/casonshep" }],
    position: [-13, 0, -43],
    children: [
      {
        id: "projects-room",
        title: "Dark room",
        meta: "projects · 2026",
        lines: ["The home page: a glass keyboard under a spotlight."],
        links: [{ label: "visit", href: "/" }],
        tags: ["r3f", "audio"],
      },
      {
        id: "projects-wall",
        title: "Art wall",
        meta: "projects · 2026",
        lines: ["ASCII plates that resolve into the real piece."],
        links: [{ label: "visit", href: "/art/" }],
        tags: ["canvas"],
      },
      {
        id: "projects-presence",
        title: "Presence",
        meta: "projects · 2026",
        lines: ["Everyone on the site at once, as sprites."],
        tags: ["realtime"],
      },
    ],
  },
  {
    id: "art",
    kind: "gallery",
    title: "Art",
    lines: ["Placeholder. Pictures I've made. Better on the wall — the link's below."],
    links: [{ label: "the wall", href: "/art/" }],
    position: [-13, 0, -59],
    children: [
      { id: "art-fold", title: "fold", meta: "art · 2026", lines: ["Placeholder piece."], image: "/artwork/01-fold.png" },
      { id: "art-tide", title: "tide", meta: "art · 2026", lines: ["Placeholder piece."], image: "/artwork/02-tide.png" },
      { id: "art-arch", title: "arch", meta: "art · 2026", lines: ["Placeholder piece."], image: "/artwork/05-arch.png" },
    ],
  },
  {
    id: "contact",
    kind: "text",
    title: "Say hi",
    lines: [
      "Placeholder. The fastest way to reach me is email; the slowest is standing on this heading.",
    ],
    links: [
      { label: "email", href: "mailto:cason@axlemobility.com" },
      { label: "github", href: "https://github.com/casonshep" },
    ],
    position: [-13, 0, -71],
  },
];
