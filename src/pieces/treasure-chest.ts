/*
 * treasure-chest: a banded chest heaped with gold. It creaks shut, rattles as
 * if the treasure wants out, then springs open again, sparkling.
 *
 * Drawn in box-drawing lines; a "~" in the drawings below leaves whatever is
 * under it, so one part can be laid over another.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "treasure chest",
  category: "objects",
  note: "a chest heaped with gold, creaking shut and springing open, sparkling",
  cols: 56,
  rows: 24,
  fps: 12,
} satisfies Meta;

const BODY = `\
╞════════╪═══╪════════════════════╪═══╪════════╡
│╶──────╴│ ° │╶─────╭──────╮─────╴│ ° │╶──────╴│
│        │   │      │ ╭──╮ │      │   │        │
│ ╶────╴ │   │╶───╴ │ ╰╮╭╯ │ ╶───╴│   │ ╶────╴ │
│        │ ° │      │  ╰╯  │      │ ° │        │
│╶──────╴│   │╶─────╰──────╯─────╴│   │╶──────╴│
│        │   │                    │   │        │
╞════════╧═══╧════════════════════╧═══╧════════╡
~╰────╯~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~╰────╯`;
// The domed lid, shut.
const LID = `\
~~~~~~~~╭┬───┬────────────────────┬───┬╮
~~~~╭───╯│ ° │                    │ ° │╰───╮
~╭──╯    │   │                    │   │    ╰──╮
╭╯       │ ° │                    │ ° │       ╰╮
│╶──────╴│   │╶──────────────────╴│   │╶──────╴│`;
// The lid thrown back on its hinges, seen from inside: its far edge on top,
// its sides leaning out to the back corners of the box, the bands running
// down it. The gold heaped in front of it hides its foot.
const OPEN = `\
~~~~~~~~~~~╭─┬────────────────────┬─╮~~~~~~~~~~~
~~~~~~~╭─┬╯  │                    │  ╰┬─╮~~~~~~~
~~~~~~╱  │ ° │                    │ ° │  ╲~~~~~~
~~~~~╱   │   │ ╶────────────────╴ │   │   ╲~~~~~
~~~~╱ ╶╴ │   │                    │   │ ╶╴ ╲~~~~
~~~╱     │ ° │                    │ ° │     ╲~~~
~~╱      │   │ ╶────────────────╴ │   │      ╲~~
~╱ ╶───╴ │   │                    │   │ ╶───╴ ╲~
│        │   │                    │   │        │
│        │   │                    │   │        │`;
const GOLD = `\
~~~~~~~~~~~~~~~~~~~ .o°O°o. ~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~ .o°O°o(@)o°O°<>°O°o°o. ~~~~~~~~~~~
~~~~ .oO°o(@)°O°o°O°(@)°o°O°o°O(@)°Oo°o. ~~~~
~o°O(@)°o°O°<>°o°O°o(@)°o°O°o°O°<>°o°O°(@)°o~`;
const SPILT = [[0, 23, "o°O"], [1, 22, "°"], [53, 23, "O°o"], [54, 22, "°"]] as const;
const GLOW = "·  °  ·  *  ·  °  ·  *  ·  °  ·  *  ·";

const X = 4, RIM = 15; // the chest's left edge, and the row of its rim
// Sparkles round the open chest: column, row, and where each is in its twinkle.
const SPARKS: [number, number, number][] = [
  [3, 3, 0], [52, 2, 2], [1, 8, 4], [54, 7, 1], [27, 1, 3], [13, 2, 5],
  [42, 0, 2], [18, 0, 4], [34, 3, 1], [8, 0, 3], [47, 4, 0],
];
// The glow off the gold, against the inside of the open lid.
const GLOW_SPARKS: [number, number, number][] = [[22, 9, 2], [27, 10, 0], [32, 9, 4], [25, 7, 1], [30, 7, 3]];
const TWINKLE = "·+*+·  ";
// Coins in the heap that catch the light: column, row.
const GLINTS: [number, number][] = [[23, 11], [31, 12], [16, 13], [40, 13], [11, 14], [36, 14], [27, 14]];

const LOOP = 8;
// The lid as it goes: shut, ajar or open, over the loop in seconds.
const lidAt = (u: number) => {
  if (u < 3.4) return "open";
  if (u < 3.8) return "ajar";
  if (u < 5) return "shut";
  if (u < 5.6) return Math.floor(u * 8) % 3 === 0 ? "rattle" : "shut";
  if (u < 6) return "ajar";
  return "open";
};

export default function treasureChest(): Frame {
  const { cols, rows } = meta;
  const blank = () => Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const stamp = (grid: string[][], x: number, y: number, art: string) =>
    art.split("\n").forEach((line, j) => {
      [...line].forEach((c, i) => {
        if (c !== "~" && y + j >= 0 && y + j < rows && x + i < cols) grid[y + j][x + i] = c;
      });
    });
  const shut = (lift: number) => {
    const grid = blank();
    stamp(grid, X, RIM, BODY);
    stamp(grid, X, RIM - 5 - lift, LID);
    if (lift) stamp(grid, X + 5, RIM - 1, GLOW);
    return grid;
  };
  const open = blank();
  stamp(open, X, RIM - 10, OPEN);
  stamp(open, X + 1, RIM - 4, GOLD);
  stamp(open, X, RIM, BODY);
  for (const [x, y, s] of SPILT) stamp(open, x, y, s);
  const poses: Record<string, string[][]> = { open, ajar: shut(1), shut: shut(0), rattle: shut(1) };
  // A rattle shows no light through the gap, only the lid jumping.
  stamp(poses.rattle, X + 5, RIM - 1, " ".repeat(GLOW.length));

  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const pose = lidAt(u);
    const grid = poses[pose].map((r) => r.slice());
    const step = Math.floor(u * 6);
    if (pose === "open" || pose === "ajar")
      for (const [x, y, p] of SPARKS) {
        const c = TWINKLE[(step + p) % TWINKLE.length];
        if (grid[y][x] === " ") grid[y][x] = c;
      }
    if (pose === "open") {
      for (const [x, y, p] of GLOW_SPARKS) if (grid[y][x] === " ") grid[y][x] = TWINKLE[(step + p) % TWINKLE.length];
      const [x, y] = GLINTS[Math.floor(u * 3) % GLINTS.length];
      grid[y][x] = "*";
    }
    return grid.map((r) => r.join("")).join("\n");
  };
}
