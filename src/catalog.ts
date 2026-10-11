/*
 * Every piece ahoy can play: its own (see own.ts), then the
 * ascii.rest library, by category. Only season one and the logo are listed
 * unless more is asked for, ahoy's prototypes or the library, but any piece
 * or group can still be named. Each is
 * loaded once, up front, so the picker can show names and notes straight away.
 */
import { load as library, names as libraryNames } from "ascii.rest";
import { OWN_PIECES, PACKS } from "./own.ts";
import type { Piece } from "./types.ts";

export interface Entry {
  slug: string;
  /** The group it is listed under: "pirate", "aws" or a library category. */
  pack: string;
  piece: Piece;
}

/** The packs ahoy brings, before the library's categories. */
export const OWN = PACKS.map(([pack]) => pack);
/** Those of them that are prototypes, listed only when asked for. */
export const PROTOTYPES = PACKS.filter(([, , prototype]) => prototype).map(([pack]) => pack);
// Other names a pack answers to.
const ALIASES: Record<string, string> = { voyages: "season-one", "season-1": "season-one", s1: "season-one" };

/** What is listed beside season one and the logo: ahoy's prototypes, and the ascii.rest library. */
export interface Shown {
  prototypes: boolean;
  library: boolean;
}

/** The heading the picker gives a group. */
export const heading = (pack: string) => PACKS.find(([p]) => p === pack)?.[1] ?? pack;

/** The pieces a screensaver plays when it is not told which: every listed one. */
export const DEFAULT_SAVER = "all";

export async function catalog(): Promise<Entry[]> {
  // ahoy's own, in the order of their packs
  const own: Entry[] = OWN_PIECES.map(([slug, pack, piece]) => ({ slug, pack, piece })).sort((a, b) => OWN.indexOf(a.pack) - OWN.indexOf(b.pack));
  const lib = await Promise.all(
    libraryNames.map(async (slug): Promise<Entry> => {
      const piece = (await library[slug]()) as Piece;
      return { slug, pack: piece.meta.category, piece };
    }),
  );
  lib.sort((a, b) => a.pack.localeCompare(b.pack) || a.slug.localeCompare(b.slug));
  return [...own, ...lib];
}

/** The pieces listed: season one and the logo, and with them whatever else is shown. */
export const listed = (entries: Entry[], shown: Shown) =>
  entries.filter((e) => (OWN.includes(e.pack) ? shown.prototypes || !PROTOTYPES.includes(e.pack) : shown.library));

/**
 * The pieces a list of words picks, in order and without repeats: "all" (the
 * listed pieces), "prototypes" (ahoy's prototype packs), a pack ("season-one",
 * "aws", "rogers", "scenes", ...), or a piece's slug. A piece or a pack can be
 * named whether or not it is listed. Unknown words are returned apart so the
 * caller can say which.
 */
export function select(entries: Entry[], words: string[], shown: Shown) {
  const picked: Entry[] = [], unknown: string[] = [];
  const add = (e: Entry) => picked.includes(e) || picked.push(e);
  for (const typed of words.flatMap((w) => w.split(",")).map((w) => w.trim().toLowerCase()).filter(Boolean)) {
    const word = ALIASES[typed] ?? typed;
    if (word === "all") listed(entries, shown).forEach(add);
    else if (word === "prototypes") entries.filter((e) => PROTOTYPES.includes(e.pack)).forEach(add);
    else if (entries.some((e) => e.pack === word)) entries.filter((e) => e.pack === word).forEach(add);
    else {
      const e = entries.find((e) => e.slug === word || e.piece.meta.name === word);
      if (e) add(e);
      else unknown.push(typed);
    }
  }
  return { picked, unknown };
}
