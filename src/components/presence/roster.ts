// The avatars visitors can pick from, and where their sprites come from.

/** Animated sprites only exist for Gen 1–5 (national dex ≤ 649), so every
 *  entry here must stay under that or it renders as a broken image. */
export const MAX_ANIMATED_ID = 649;

export type Avatar = { id: number; name: string };

/** The pickable roster. Order is the order of the picker grid. */
export const ROSTER: readonly Avatar[] = [
  { id: 25, name: "Pikachu" },
  { id: 1, name: "Bulbasaur" },
  { id: 4, name: "Charmander" },
  { id: 7, name: "Squirtle" },
  { id: 133, name: "Eevee" },
  { id: 143, name: "Snorlax" },
  { id: 94, name: "Gengar" },
  { id: 131, name: "Lapras" },
  { id: 129, name: "Magikarp" },
  { id: 132, name: "Ditto" },
  { id: 54, name: "Psyduck" },
  { id: 39, name: "Jigglypuff" },
  { id: 52, name: "Meowth" },
  { id: 150, name: "Mewtwo" },
  { id: 196, name: "Espeon" },
  { id: 197, name: "Umbreon" },
  { id: 245, name: "Suicune" },
  { id: 249, name: "Lugia" },
  { id: 282, name: "Gardevoir" },
  { id: 359, name: "Absol" },
  { id: 448, name: "Lucario" },
  { id: 445, name: "Garchomp" },
  { id: 479, name: "Rotom" },
  { id: 493, name: "Arceus" },
  { id: 570, name: "Zorua" },
  { id: 571, name: "Zoroark" },
  { id: 637, name: "Volcarona" },
  { id: 643, name: "Reshiram" },
];

// jsDelivr mirrors the PokeAPI sprite repo behind a real CDN. Hitting
// raw.githubusercontent.com directly gets throttled once the picker asks
// for a couple of dozen images at once, and the misses render as blanks.
const SPRITES =
  "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon";

/** Animated Gen-V sprite, with the static one as the fallback for anything
 *  past Gen 5 that slips into the roster. */
export function spriteUrl(id: number) {
  return id <= MAX_ANIMATED_ID
    ? `${SPRITES}/versions/generation-v/black-white/animated/${id}.gif`
    : `${SPRITES}/${id}.png`;
}

export function avatarById(id: number): Avatar {
  return ROSTER.find((a) => a.id === id) ?? ROSTER[0];
}

/** A random starting avatar, so a first-time visitor is never a blank. */
export function randomAvatarId() {
  return ROSTER[Math.floor(Math.random() * ROSTER.length)].id;
}
