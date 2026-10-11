/*
 * Every piece ahoy can play: its own pirate pack and the AWS logo, then the
 * ascii.rest library, by category. Only ahoy's own are listed unless asked
 * for all of them, but any library piece or group can still be named. Each is
 * loaded once, up front, so the picker can show names and notes straight away.
 */
import { load as library, names as libraryNames } from "ascii.rest";
import type { Piece } from "./types.ts";
import * as ahoy from "./pieces/ahoy.ts";
import * as anchor from "./pieces/anchor.ts";
import * as aws from "./pieces/aws.ts";
import * as galleon from "./pieces/galleon.ts";
import * as jollyRoger from "./pieces/jolly-roger.ts";
import * as kraken from "./pieces/kraken.ts";
import * as parrot from "./pieces/parrot.ts";
import * as pirateFlag from "./pieces/pirate-flag.ts";
import * as pirateHeart from "./pieces/pirate-heart.ts";
import * as shipsWheel from "./pieces/ships-wheel.ts";
import * as treasureChest from "./pieces/treasure-chest.ts";
import * as treasureMap from "./pieces/treasure-map.ts";

export interface Entry {
  slug: string;
  /** The group it is listed under: "pirate", "aws" or a library category. */
  pack: string;
  piece: Piece;
}

// In the order the picker lists them.
const PIRATE: [string, Piece][] = [
  ["galleon", galleon],
  ["pirate-flag", pirateFlag],
  ["jolly-roger", jollyRoger],
  ["kraken", kraken],
  ["parrot", parrot],
  ["ships-wheel", shipsWheel],
  ["treasure-map", treasureMap],
  ["treasure-chest", treasureChest],
  ["anchor", anchor],
  ["ahoy", ahoy],
  ["pirate-heart", pirateHeart],
];

/** The packs ahoy brings, before the library's categories. */
export const OWN = ["pirate", "aws"];

/** The pieces a screensaver plays when it is not told which: every listed one. */
export const DEFAULT_SAVER = "all";

export async function catalog(): Promise<Entry[]> {
  const own: Entry[] = [...PIRATE.map(([slug, piece]) => ({ slug, pack: "pirate", piece })), { slug: "aws", pack: "aws", piece: aws }];
  const lib = await Promise.all(
    libraryNames.map(async (slug): Promise<Entry> => {
      const piece = (await library[slug]()) as Piece;
      return { slug, pack: piece.meta.category, piece };
    }),
  );
  lib.sort((a, b) => a.pack.localeCompare(b.pack) || a.slug.localeCompare(b.slug));
  return [...own, ...lib];
}

/** The pieces listed: ahoy's own, or with `everything` the library's too. */
export const listed = (entries: Entry[], everything: boolean) => (everything ? entries : entries.filter((e) => OWN.includes(e.pack)));

/**
 * The pieces a list of words picks, in order and without repeats: "all" (the
 * listed pieces), a pack ("pirate", "aws", "scenes", ...), or a piece's slug.
 * Unknown words are returned apart so the caller can say which.
 */
export function select(entries: Entry[], words: string[], everything: boolean) {
  const picked: Entry[] = [], unknown: string[] = [];
  const add = (e: Entry) => picked.includes(e) || picked.push(e);
  for (const word of words.flatMap((w) => w.split(",")).map((w) => w.trim().toLowerCase()).filter(Boolean)) {
    if (word === "all") listed(entries, everything).forEach(add);
    else if (entries.some((e) => e.pack === word)) entries.filter((e) => e.pack === word).forEach(add);
    else {
      const e = entries.find((e) => e.slug === word || e.piece.meta.name === word);
      if (e) add(e);
      else unknown.push(word);
    }
  }
  return { picked, unknown };
}
