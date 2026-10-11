/*
 * parrot: a pirate's parrot in a polka-dot bandana, perched on a cutlass,
 * shaded in blocks like a halftone print. It bobs its head, squawks, blinks
 * and ruffles its wing now and then.
 *
 * On a light page the shading flips, so the bandana stays dark and the beak
 * light.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "parrot",
  category: "creatures",
  note: "a pirate parrot in a bandana on a cutlass, bobbing and squawking",
  cols: 56,
  rows: 30,
  fps: 12,
} satisfies Meta;

const BASE = `
                            ░░░░░░░░
         ░░░            ░░░░░░░██░░░▄▄░░
          ░░░░░░      ░░░░▀▀░░░░░░░░▀▀░░░░
              ░░░░░░░░░░░░░░░██░░░░░░░░██░░
                  ░░░░░▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄ ▄████▄
              ░░░░ ░░░▓▓▓▓▓▓▓▓▓███▀▄  ▀██ ███████▄
          ░░░░░░      ▓▓▓▓▓▓▓▓▓███     ██ █████████▄
           ░░         ▓▓▓▓▓▓▓▓▓████▄▄▄███ █████████
                       ▓▓▓▓▓▓▓▓▓█████████ ▒▒▒▀▀████
                        ▓▓▓▓▓▓▓▓▓▓█████▓  ▒▒▒▒▒ ▀██
                     ▒▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓    ▒▒▒    ▀
               ░░░░░░░░░░░▒▒▓▓▓▓▓▓▓▓▓▓
               ░░░░░░░░░░░░▀▓▓▓▓▓▓▓▓▓▓
               ░▄▄░░░░░░░░▄▄▀▓▓▓▓▓▓▓▓▓▓
                ░░▀▀▀▀▀▀▀▀░░░▓▓▓▓▓▓▓▓▓▓▓
                ░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓
                ▀▀▄▄▄▄▄▄▄▄▀▀▄▓▓▓▓▓▓▓▓▓▓▓
                ░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓
                ▄▄░░░░░░░░▄▄▓▓▓▓▓▓▓▓▓▓▓▀
                 ░▀▀▀▀▀▀▀▀░▄▓▓▓▓▓▓▓▓▓▓▀
            ▓▓   ░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▀             ▄▄██
    ▄▄      ▓▓    ░░░░░░░▒▒▒░░░▓▓░░░        ▄▄▄▄▄███▀▀
   ████▓░▓░▓▓▓██████████████▄▄▄██▄▄▄█████▀▀▀▀▄▄▄▄█▀
   ████▓░▓░▓▓▓██▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▀▀▀▀▀
    ▀▀      ▓▓    ▒▒▒▓▓▓░░░░
            ▓▓    ▒▒▒▓▓▓░░░
                 ▒▒▒▓▓▓▀░░░
                 ▒▒▒▓▓▓░░░░
                 ▒▒▒▀▓▓░░░

`;
// its head dipped, from row 0
const BOB = `

         ░                ░░░░░▄▄░░░░░
         ░░░░░         ░░░▄▄░░░▀▀░░░██░░░
          ░░░░░░░░ ░░░░░░░░░░▄▄░░░░░░░░▄▄░
                  ░░░░░░░░░░░▀▀░░░░░░░░▀▀░░▄▄▄▄
                 ░░░░░▄▓▓▓▓▓▓▓▓▓███▀▀▀███ ██████▄
           ░░░░░░     ▓▓▓▓▓▓▓▓▓███ ▀   ██ ████████▄
          ░░░░        ▓▓▓▓▓▓▓▓▓███▄   ▄██ █████████▀
                      ▀▓▓▓▓▓▓▓▓██████████ ▀▀▀██████
                       ▀▓▓▓▓▓▓▓▓▓███████▀ ▒▒▒▒▒▀███
                     ▒▒▒▀▓▓▓▓▓▓▓▓▓▓▓▓▓▓▀   ▒▒▒▒  ▀█
               ░░░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▓▀
`;
// its eye shut, from row 5
const BLINK = `
              ░░░░ ░░░▓▓▓▓▓▓▓▓▓██████████ ███████▄
          ░░░░░░      ▓▓▓▓▓▓▓▓▓███▄▄▄▄▄██ █████████▄
           ░░         ▓▓▓▓▓▓▓▓▓██████████ █████████
`;
// its beak open, head up, from row 0
const SQUAWK = `
         ░                ░░░░░▄▄░░░░░
         ░░░░░         ░░░▄▄░░░▀▀░░░██░░░
          ░░░░░░░░ ░░░░░░░░░░▄▄░░░░░░░░▄▄░
                  ░░░░░░░░░░░▀▀░░░░░░░░▀▀░░▄▄▄▄
                 ░░░░░▄▓▓▓▓▓▓▓▓▓███▀▀▀███ ██████▄
           ░░░░░░     ▓▓▓▓▓▓▓▓▓███ ▀   ██ ████████▄
          ░░░░        ▓▓▓▓▓▓▓▓▓███▄   ▄██ █████████▀
                      ▀▓▓▓▓▓▓▓▓██████████ ▀▀▀██████
                       ▀▓▓▓▓▓▓▓▓▓███████▀      ▀███
                        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▀  ▒▒▒▒▒  ▀█
                     ▒▒▒▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓    ▒▒▒▒
`;
// its wing lifted, from row 9
const RUFFLE = `
           ▒▒ ▒▒ ▒▒   ░░▓▓▓▓▓▓▓▓▓▓█████▓  ▒▒▒▒▒ ▀██
             ▒▒░▒▒░▒▒░░░░▀▓▓▓▓▓▓▓▓▓▓▓▓▓    ▒▒▒    ▀
               ░░░░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓
               ░░░░░░░░░░░░▀▓▓▓▓▓▓▓▓▓▓
               ▀█▄▄░░░░░░▄▄█▀▓▓▓▓▓▓▓▓▓▓
                ░░░▀▀▀▀▀▀░░░░▓▓▓▓▓▓▓▓▓▓▓
`;

const LOOP = 6;
// When each pose shows, as [start, end, pose, first row], in seconds.
const POSES: [number, number, string, number][] = [
  [0.8, 1.1, BOB, 0],
  [1.4, 1.7, BOB, 0],
  [2.3, 3.1, SQUAWK, 0],
  [3.9, 4.05, BLINK, 5],
  [4.9, 5.5, RUFFLE, 9],
];
// On a light page dense means dark, so the ramp turns over; a half block, a
// bright edge on a dark page, goes to the lightest shade.
const PAPER: Record<string, string> = { "█": "░", "▓": "▒", "▒": "▓", "░": "█", "▀": "░", "▄": "░" };

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function parrot(): Frame {
  const base = lines(BASE);
  const poses = POSES.map(([a, b, art, at]) => ({ a, b, at, rows: lines(art) }));
  const flip = (line: string) => [...line].map((c) => PAPER[c] || c).join("");
  const paperBase = base.map(flip);
  const paperPoses = poses.map((p) => ({ ...p, rows: p.rows.map(flip) }));

  return (t, { paper = false } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const out = (paper ? paperBase : base).slice();
    for (const p of paper ? paperPoses : poses) if (u >= p.a && u < p.b) p.rows.forEach((row, j) => (out[p.at + j] = row));
    return out.join("\n");
  };
}
