/*
 * jolly-roger: a friendly skull and crossbones in a polka-dot bandana and an
 * eyepatch. Its one good eye glances about, and now and then it winks.
 *
 * Drawn in box-drawing lines, with block elements for the patch.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "jolly roger",
  category: "objects",
  note: "a grinning skull and crossbones in an eyepatch, winking now and then",
  cols: 52,
  rows: 24,
  fps: 12,
} satisfies Meta;

const ART = `
    ╭─╮                                      ╭─╮
  ╭─╯ │                                      │ ╰─╮
  │    ╲                                    ╱    │
  ╰─╮   ╲         ╭──────────────╮         ╱   ╭─╯
     ╲   ╲    ╭───╯     °     °  ╰───╮    ╱   ╱
      ╲   ╲ ╭─╯°     °     °     °   ╰─╮ ╱   ╱
       ╲   ╭╯     °     °     °     °  ╰╮   ╱
        ╲  │════════════════════════════│  ╱
         ╲╭╯ ╲          ╱               ╰╮╱
          │   ╲        ╱      ╭────╮     │
          │    ▄██████▄      ╭╯ ▄▄ ╰╮    │
          │   ▐████████▌     ╰╮ ▀▀ ╭╯    │
          │    ▀██████▀       ╰────╯     │
          ╰╮                            ╭╯
          ╱│             ╱╲             │╲
         ╱ ╰╮           ╰──╯           ╭╯ ╲
        ╱   │   ╶╮╭──┬──┬──┬──┬──╮╭╴   │   ╲
       ╱   ╱╰╮   ╰┤  │  │  │  │  ├╯   ╭╯╲   ╲
      ╱   ╱  ╰─╮  ╰──┴──┴──┴──┴──╯  ╭─╯  ╲   ╲
     ╱   ╱     ╰────────────────────╯     ╲   ╲
  ╭─╯   ╱                                  ╲   ╰─╮
  │    ╱                                    ╲    │
  ╰─╮ │                                      │ ╭─╯
    ╰─╯                                      ╰─╯
`;

const LOOP = 8;
const EYE = [29, 9]; // where the good eye sits: column, row
// The eye looking left, ahead and right, half shut, and winking.
const LOOK = (dx: number) => [" ╭────╮ ", `╭╯${" ".repeat(1 + dx)}▄▄${" ".repeat(1 - dx)}╰╮`, `╰╮${" ".repeat(1 + dx)}▀▀${" ".repeat(1 - dx)}╭╯`, " ╰────╯ "];
const HALF = [" ╭────╮ ", "╭╯────╰╮", "╰╮ ▀▀ ╭╯", " ╰────╯ "];
const SHUT = ["        ", " ╭────╮ ", "╭╯    ╰╮", "        "];
// Where it looks, as [from, to, sideways] in seconds, and when it winks.
const GLANCES: [number, number, number][] = [[1.6, 2.6, -1], [3.6, 4.6, 1]];
const WINK = 5.6;

export default function jollyRoger(): Frame {
  const { cols } = meta;
  const base = ART.slice(1, -1).split("\n").map((line) => line.padEnd(cols));
  const looks = [-1, 0, 1].map(LOOK);
  const eyeAt = (u: number) => {
    const d = u - WINK;
    if (d >= 0 && d < 0.85) return d < 0.1 || d >= 0.75 ? HALF : SHUT;
    for (const [a, b, dx] of GLANCES) if (u >= a && u < b) return looks[dx + 1];
    return looks[1];
  };

  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const eye = eyeAt(u);
    const [x, y] = EYE;
    return base.map((line, r) => (r >= y && r < y + 4 ? line.slice(0, x) + eye[r - y] + line.slice(x + 8) : line)).join("\n");
  };
}
