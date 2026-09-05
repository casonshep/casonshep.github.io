# cason.dev

A single-page site: a glass keyboard on a podium in a dark 3D room, slowly
turning, lit by the spectral glow under its own plate. Click the keys or type
on your real keyboard to press them (with sound).

Built with Next.js (static export), React Three Fiber, drei and three.js.

## Develop

```bash
npm install
npm run dev
```

On macOS, if `next dev` fails with a missing `lightningcss.darwin-arm64.node`,
run `npm install --no-save lightningcss-darwin-arm64` once after installing.

## Tune the look

Every knob lives in `src/components/keyboard/visualConfig.ts` under `ROOM`:
camera, podium, glass materials, keycap shape, the glow pattern, and the
(optional) spotlight. Edit and save; the dev server hot-reloads.

## Layout

- `src/components/room/DarkRoom.tsx` — the scene: room, camera, capture pass
  the glass refracts, optional spotlight/beam/dust.
- `src/components/room/SpotlightKeyboard.tsx` — the glass keyboard.
- `src/components/room/HoloPanel.tsx` — the animated glow under the plate.
- `src/components/room/holoEnv.ts` — procedural reflection map (glass only).
- `src/components/room/keyLayout.ts` — key geometry and legend textures.
- `src/components/keyboard/Keyboard.ts` — key layout data, sound engine,
  physical-keyboard input.

## Deploy

Pushes to `main` build and publish to GitHub Pages via
`.github/workflows/deploy.yml`.
