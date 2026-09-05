// The avatars visitors can pick from, and where their sprites come from.

/** Animated sprites only exist for Gen 1–5 (national dex ≤ 649), so every
 *  entry here must stay under that or it renders as a broken image. */
export const MAX_ANIMATED_ID = 649;

export type Avatar = { id: number; name: string };

/** The pickable roster. Order is the order of the picker grid.
 *
 *  Curation rules:
 *  - Base forms only (a Pokémon that evolves *into* something), or ones
 *    that never evolve at all — no final or middle evolutions.
 *  - No Pokémon with alternate forms (so no Rotom, Deoxys, Giratina).
 *  - Dex <= 649, the limit of the animated Gen-V sprites.
 *  - Popular ones. Every starter's first stage is here, which is both the
 *    tidiest rule and the most-wanted set.
 *
 *  Two deliberate exceptions, both because they are too iconic to omit:
 *  Umbreon is an Eevee evolution, and Pikachu has Pichu as a baby form. */
export const ROSTER: readonly Avatar[] = [
  // Icons and the non-negotiables.
  { id: 25, name: "Pikachu" },
  { id: 1, name: "Bulbasaur" },
  { id: 4, name: "Charmander" },
  { id: 7, name: "Squirtle" },
  { id: 58, name: "Growlithe" },
  { id: 155, name: "Cyndaquil" },
  { id: 158, name: "Totodile" },
  { id: 197, name: "Umbreon" },
  { id: 133, name: "Eevee" },
  // Fan favourites and the remaining starters, in dex order.
  { id: 54, name: "Psyduck" },
  { id: 92, name: "Gastly" },
  { id: 129, name: "Magikarp" },
  { id: 131, name: "Lapras" },
  { id: 132, name: "Ditto" },
  { id: 147, name: "Dratini" },
  { id: 150, name: "Mewtwo" },
  { id: 151, name: "Mew" },
  { id: 152, name: "Chikorita" },
  { id: 252, name: "Treecko" },
  { id: 255, name: "Torchic" },
  { id: 258, name: "Mudkip" },
  { id: 387, name: "Turtwig" },
  { id: 390, name: "Chimchar" },
  { id: 393, name: "Piplup" },
  { id: 447, name: "Riolu" },
  { id: 495, name: "Snivy" },
  { id: 498, name: "Tepig" },
  { id: 501, name: "Oshawott" },
];

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

/** Whether an id is still on the roster. Curating the list strands anyone
 *  whose stored choice was dropped: without this check their sprite still
 *  rendered from the old id while the label fell back to another name. */
export function isRosterId(id: number) {
  return ROSTER.some((a) => a.id === id);
}

/** A random starting avatar, so a first-time visitor is never a blank. */
export function randomAvatarId() {
  return ROSTER[Math.floor(Math.random() * ROSTER.length)].id;
}
