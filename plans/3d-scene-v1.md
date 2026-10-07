# 3D Landscape Route — Build Plan (v1)

Oct 6, 2026 · @Cason · branch `3d-scene-v1`

Adapted from *Traversable Landscape Portfolio — Build Plan*. That plan assumed
a fresh Vite scaffold; this one adds the walkable landscape as **one new
route on the existing site**, built by **three subagents working in
parallel**.

## Scope

A visitor clicks a new `world` item in the home page's typed nav, lands on
`/3d/`, and walks a character across a flat landscape, climbing onto 3D text
blocks that hold the site's content. `/3d/text/` serves the same content as
plain HTML.

Success criteria for v1:

- Walk, jump, and climb onto every content block — keyboard on desktop,
  virtual joystick on touch.
- All content comes from one data file and renders as walkable 3D text plus
  a readable panel.
- `/3d/text/` renders the same data as semantic HTML; WebGL-less visitors
  are sent there.
- 60 fps on a mid-range laptop, 30+ on a recent phone.
- `npm run build` (static export) passes and the route works on GitHub Pages.

Out of scope for v1 (later phases, see the end): Blender art pass,
character model, terrain heightfield, analytics.

## What changes from the old plan

| Old plan | This plan | Why |
| --- | --- | --- |
| Vite + React scaffold | Next.js 16 app router, already in the repo | The site exists; we add a route |
| React Router `/text` | `src/app/3d/text/page.tsx`, statically rendered | Fits `output: "export"`; real HTML for SEO, no JS needed |
| Route `/3D` | **`/3d/`** (lowercase, trailing slash) | GitHub Pages paths are case-sensitive; matches `/art/` and `trailingSlash: true`; the typed nav presses real keys, and `3` and `d` exist without needing shift |
| `src/content/sections.ts` | `src/components/landscape/sections.ts` | Repo convention: each feature's manifest lives with it (`art/pieces.ts`, `room/navContent.ts`) |
| Capsule → Blender character later | A walking Pokémon `.glb` from the web, capsule as fallback | Your call; see "Character" below |
| Vercel / Netlify | Existing GitHub Pages workflow | Merging to `main` deploys |
| `fiber`, `drei` to install | Already installed (fiber 9.7, drei 10.7, three 0.185) | Only rapier, ecctrl, and leva are new |
| "Pin versions" via lock file | Pin **exact versions in `package.json`** | CI runs `rm package-lock.json && npm install`, so the lock file does not protect the deploy |
| Phases 6–7 (art, ship) | Deferred past v1 | Blocked on Blender assets; not parallelizable yet |

Rules carried over: check current library docs before using an API; no
hard-coded copy in components; strict TypeScript; if a physics or controller
bug survives two attempts, stop and report options. New rule from
`AGENTS.md`: **read `node_modules/next/dist/docs/` before writing Next.js
code** — this Next version differs from training data.

## How the work splits

```
Step 0  Foundation (main session, serial, ~short)
          deps + contracts + stubs + commit
            │
   ┌────────┼────────┐
Step 1  A          B          C        three subagents, in parallel,
        World &    Content    Pages &  same working tree,
        movement   blocks     overlay  disjoint files
   └────────┼────────┘
            │
Step 2  Integration (main session, serial)
          wire, playtest, tune, build, commit
```

Step 0 matters most. Parallel agents only stay out of each other's way if
the shared types, the file ownership, and the stubs exist **before** they
start.

### Same tree, not worktrees

Agents work in the main checkout with strictly disjoint files rather than
`isolation: "worktree"`:

- Worktrees have no `node_modules` (gitignored); each would need its own
  install.
- The dev server already running on `localhost:3000` hot-reloads the main
  tree, so all three agents and you can watch `/3d/` change live.
- Disjoint ownership (below) means no collisions to isolate.

Rules for agents sharing the tree:

- **Never** run `npm install`, `next dev`, or `next build`. Two builds
  clobber `.next/`, and only the integrator builds.
- Verify with `npx tsc --noEmit`, `npx eslint <your files>`, and by loading
  `http://localhost:3000/3d/` (or `/3d/text/`) on the running server.
- Edit only the files you own. If you need a change to a contract file
  (`types.ts`, `playerState.ts`) or to another stream's file, stop and report
  instead of editing it.
- Do not commit; the integrator commits.

## Step 0 — Foundation (main session, before forking)

1. Commit the `package-lock.json` that `npm install` rewrote earlier, so the
   branch starts clean.
2. Install the new dependencies and pin exact versions in `package.json` (no
   `^`): `@react-three/rapier` (2.2.x), `ecctrl` (2.0.x), and `leva`
   (required by ecctrl as a peer dependency). Already confirmed: ecctrl
   2.0.2 peer-requires fiber ≥9.4, drei ≥10.7, rapier ≥2.2, three ≥0.184,
   and React ≥19.2.7, all satisfied. Optionally add `r3f-perf` as a
   devDependency.
3. Write the contract files (below) for real, and every other file as a
   compiling stub with its final export signature.
4. Add the route shell so `/3d/` loads a blank canvas.
5. `npx tsc --noEmit` passes → commit "3d: foundation, contracts, stubs".

### Contracts (written in Step 0, then frozen)

`src/components/landscape/types.ts`

```ts
export type Vec3 = [number, number, number];

export type Section = {
  id: string;              // "me", "projects", …
  title: string;           // climbable Text3D
  lines: string[];         // body paragraphs; reader overlay and /3d/text/
  links?: readonly { label: string; href: string }[];
  position: Vec3;          // hand-placed along the path from spawn
  color?: string;          // block colour in the low-poly palette
  height?: number;         // letter extrusion height, default WORLD.letterHeight
  children?: Section[];    // smaller blocks, e.g. individual projects
};
```

The 3D route has **its own copy**, separate from `navContent.ts`. For the
MVP, `sections.ts` holds generated placeholder copy for eight sections:
**me, projects, art, contact, pokemon, minecraft, music, blog**. `art` links
to `/art/`.

`src/components/landscape/worldConfig.ts`: shared tuning numbers, in the
style of `visualConfig.ts`:

```ts
export const WORLD = {
  groundSize: 100,
  spawn: [0, 2, 0] as Vec3,
  jumpHeight: 1.0,        // ecctrl jump velocity is tuned to reach this
  letterHeight: 0.6,      // ≈ 0.6 × jumpHeight: climbable, not trivial
  standHeadroom: 1.5,     // player counts as "on top" up to this far above a block's top face
  dpr: [1, 1.5] as [number, number],
};
```

`src/components/landscape/playerState.ts`: mutable singletons, no React
state. The player writes its position every frame; each block registers its
measured world-space bounds once its text geometry exists; the overlay
combines the two to find the block the player is **standing on**. Neither
the player nor the overlay has to touch physics events.

```ts
export const playerState = { position: new Vector3(), ready: false };
export const sectionBounds = new Map<string, Box3>(); // id → bounds
```

`src/components/landscape/useReducedMotion.ts`: `() => boolean`. The
camera (A) consumes it and C owns it.

### File ownership

| File | Owner |
| --- | --- |
| `package.json`, `package-lock.json`, `types.ts`, `worldConfig.ts`, `playerState.ts` | Step 0 (frozen afterwards) |
| `landscape/Landscape.tsx` (client root: Canvas + Overlay) | A |
| `landscape/World.tsx`, `Ground.tsx`, `Player.tsx`, `Bounds.tsx`, `TouchControls.tsx` | A |
| `landscape/sections.ts`, `SectionBlocks.tsx`, `SectionBlock.tsx`, `Signposts.tsx` | B |
| `public/fonts/*.typeface.json` | B |
| `app/3d/page.tsx`, `app/3d/text/page.tsx` | C |
| `public/models/*.glb` (character) | A |
| `landscape/Overlay.tsx`, `useStandingSection.ts`, `useReducedMotion.ts`, `webgl.ts` | C |
| `keyboard/visualConfig.ts` (one nav line) | C |

How the pieces render: `app/3d/page.tsx` (C, server) → `<Landscape/>` (A,
client) → `<World>` renders `<SectionBlocks/>` (B) inside `<Physics>`, and
`<Landscape>` renders `<Overlay/>` (C) beside the Canvas. Every one of these
exists as a stub after Step 0, so each agent sees the others' work appear
live as it lands.

## Step 1 — Three parallel streams

Each agent receives this file plus its own section below. Each finishes
with: files changed, how to see it on `localhost:3000`, measured fps if
relevant, and anything that felt off.

### Agent A — World & movement

Old-plan phases 1 and 5 (the controller side).

- [ ] `Landscape.tsx`: `"use client"`, full-viewport Canvas (globals.css
      already pins `html, body` to the viewport), `dpr={WORLD.dpr}`,
      shadows. Mount it the same way `DarkRoom.tsx` mounts its Canvas.
- [ ] `World.tsx`: bright low-poly look — daylight sky, warm sun with
      shadows, flat-shaded pastel ground, fog to hide the world edge,
      `<Physics>` from rapier, `<Ground/>`, `<Bounds/>`,
      `<Player/>`, `<SectionBlocks/>`.
- [ ] `Ground.tsx`: a `WORLD.groundSize` plane with a fixed cuboid collider.
      `Bounds.tsx`: invisible walls at the edges.
- [ ] `Player.tsx`: ecctrl, WASD/arrows + Space, third-person follow camera.
      Character: a walking Pokémon `.glb` (see "Character" below) with
      idle/walk/run/jump animations via ecctrl's animation support; keep a
      capsule fallback so the scene works without the model. Tune jump to `WORLD.jumpHeight`. Write
      `playerState.position` each frame. Turn off camera lerp and bob when
      `useReducedMotion()` is true.
- [ ] `TouchControls.tsx`: ecctrl's virtual joystick + jump button, touch
      devices only; smaller shadow map on mobile.
- [ ] `r3f-perf` in development only; it must not appear in the production
      bundle.
- [ ] Keyboard focus: WASD on `/3d/` must not leak to anything else, and
      leaving the page must not leave key listeners behind.

Acceptance: on `/3d/` the capsule walks, jumps, can't fall through the floor
or leave the world, and the joystick works in a touch emulator. ~60 fps.

### Agent B — Content blocks

Old-plan phases 2 and 3 (the 3D side).

- [ ] Typeface JSON for `Text3D` in `public/fonts/`. Geist from `next/font`
      can't be used directly; convert a TTF with facetype.js (or start with
      a drei/three stock typeface until open question 2 is answered).
      Remember the `/fonts/…` path is served from the site root.
- [ ] `sections.ts`: generated placeholder copy for me, projects, art,
      contact, pokemon, minecraft, music, blog, laid along a loose loop
      from `WORLD.spawn` (me nearest spawn), each with its own bright
      colour. `projects` has 2–3 child blocks.
- [ ] `SectionBlock.tsx`: `Text3D` title in a fixed `RigidBody` with **one
      cuboid collider sized to the text bounds**, not per-letter colliders,
      so letter gaps don't snag. Body copy as drei `Text` laid flat in front
      of the title. `children` render as smaller blocks. Once the geometry
      exists, register each block's world-space `Box3` in `sectionBounds`
      (and remove it on unmount). Flat-shaded material to fit the low-poly look.
- [ ] `SectionBlocks.tsx`: maps `sections` to blocks.
      `Signposts.tsx`: arrows near spawn pointing to each section.
- [ ] Until A's player lands, check collider bounds with
      `<Physics debug>` (toggle locally; don't commit it on).

Acceptance: editing `sections.ts` changes the world on reload with no other
code change; debug colliders hug each title.

### Agent C — Pages, overlay, entry point

Old-plan phases 3 and 4 (the HTML side), plus wiring into the existing site.

- [ ] `app/3d/page.tsx`: server component mirroring `app/art/page.tsx`
      (metadata, `sr-only` h1, render `<Landscape/>`). Title, description,
      and Open Graph tags.
- [ ] `app/3d/text/page.tsx`: statically rendered semantic HTML (h1/h2, p,
      links) from `sections.ts`. It needs its own scroll container, as
      `art/Wall.tsx` has, because globals.css sets `overflow: hidden` on body.
      Link back to `/3d/` and `/`.
- [ ] `Overlay.tsx`: controls hint, a permanent "text version" link, and a
      reader panel showing the section the player is **standing on**. Match the existing
      `RoomPanel` look (Geist Mono, translucent).
- [ ] `useStandingSection.ts`: on rAF, checks `playerState.position`
      against each `sectionBounds` box: inside the box's x/z footprint and
      between its top face and `top + WORLD.standHeadroom`. Only set React
      state when the result changes. Add a small exit delay so the panel
      doesn't flicker mid-jump.
- [ ] `webgl.ts`: detect WebGL support; redirect to `/3d/text/` if it's
      missing. `useReducedMotion.ts`.
- [ ] Entry point: add `{ label: "world", href: "/3d/" }` to
      `ROOM.nav.items` in `visualConfig.ts`, the same pattern as `art`.

Acceptance: `/3d/text/` scores 90+ on Lighthouse accessibility; the home nav
types `world` and goes to `/3d/`; with WebGL disabled, `/3d/` lands on the text
version.

## Step 2 — Integration (main session)

1. Review each stream's report; resolve anything an agent flagged instead of
   editing.
2. Playtest at `localhost:3000/3d/`: climb every block, tune
   `WORLD.letterHeight` / `jumpHeight` and section spacing, check camera
   clipping near tall text.
3. Stop the dev server, then run **`npm run build`** — the deploy runs
   `next build` with `output: "export"`, and rapier's WASM loading is the
   main thing `next dev` won't catch. Serve `out/` locally and check
   `/3d/` and `/3d/text/`.
4. `npm run lint`, `npx tsc --noEmit`.
5. Commit "3d: walkable landscape v1". Merging to `main` deploys; that
   needs your go-ahead.

## Later (post-v1, not parallelized yet)

- Art pass: Blender `.glb` via `npx gltfjsx --types`, character model with
  idle/walk/jump, terrain heightfield with a simplified collider, Draco or
  meshopt compression, loading screen, under 5 MB initial download. Once
  assets exist, this splits the same way: character / terrain+props /
  loading+compression.
- Making `/3d/` the home page, if it earns it.

## Character

A walking Pokémon model sourced online, e.g. a downloadable rigged `.glb`
with walk/idle animations. Caveat: Pokémon designs are Nintendo / Game Freak
IP and no model of one is properly licensed for public use, so fan-made
models carry the same risk as the sprites the presence bar already uses.
Prefer a fan-made model whose author allows reuse, credit it, and keep it
swappable (one file in `public/models/`, the capsule as fallback) so it can
be replaced by the Blender character later.

## Decisions (answered Oct 6, 2026)

| Question | Answer |
| --- | --- |
| Content source | Separate copy for `/3d`; generated placeholder copy for the MVP |
| Sections | me, projects, art, contact, pokemon, minecraft, music, blog |
| 3D title font | Stock three.js typeface for now |
| Look | Bright low-poly |
| Character | A walking Pokémon model found online (capsule fallback) |
| Camera | Third-person follow |
| Reader panel | Opens only while standing on top of a block |
| Nav label | `world` (route stays `/3d/`) |

Not decided yet: Blender art pass, analytics.
