// The ten avatars the picker offers, and where every sprite comes from.
//
// The picker used to hold sixty, which made it a wall to scroll rather than
// a choice to make. It is ten now — the ones almost everyone recognises —
// and the other thousand are reachable by name from the chat console
// (`/gengar`, `/mimikyu`), which is both a shorter list and a bigger roster
// than before. pokedex.ts holds the names.

import { MAX_DEX, pokemonName } from "./pokedex";

/** Animated sprites only exist for Gen 1–5 (national dex ≤ 649); past that
 *  spriteUrl falls back to the static artwork, which covers the rest. */
export const MAX_ANIMATED_ID = 649;

export type Avatar = { id: number; name: string };

/** The picker grid, in the order it draws. Ten icons, no deep cuts: anyone
 *  who wants a deep cut can type its name. */
export const PICKER: readonly Avatar[] = [
  25, // Pikachu
  1, // Bulbasaur
  4, // Charmander
  7, // Squirtle
  133, // Eevee
  94, // Gengar
  143, // Snorlax
  131, // Lapras
  448, // Lucario
  151, // Mew
].map((id) => ({ id, name: pokemonName(id) }));

const SPRITES =
  "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon";

/** Animated Gen-V sprite where one exists, the static artwork otherwise —
 *  everything on the dex has one or the other, in both palettes. */
export function spriteUrl(id: number, shiny = false) {
  if (id <= MAX_ANIMATED_ID) {
    const variant = shiny ? "animated/shiny" : "animated";
    return `${SPRITES}/versions/generation-v/black-white/${variant}/${id}.gif`;
  }
  return `${SPRITES}/${shiny ? "shiny/" : ""}${id}.png`;
}

export function avatarById(id: number): Avatar {
  return { id, name: pokemonName(id) || PICKER[0].name };
}

/** A first-time visitor's Pokémon: from the picker, so the sprite they are
 *  handed is one they can place. */
export function randomAvatarId() {
  return PICKER[Math.floor(Math.random() * PICKER.length)].id;
}

/** `/random`, which is asking for a surprise — the whole dex is fair game. */
export function randomDexId() {
  return 1 + Math.floor(Math.random() * MAX_DEX);
}
