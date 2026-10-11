/*
 * galleon: a pirate galleon under full sail by the light of a crescent moon,
 * its flag streaming from the masthead as it rides the swell.
 *
 * Each cell of the hull and the sails holds the character whose shape best
 * matches its edge through it, and 8 where it is solid; the masts and the
 * rigging are lines of characters, and the sea is three rolling waves.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "galleon",
  category: "objects",
  note: "a pirate galleon under full sail, riding the swell by moonlight",
  cols: 80,
  rows: 32,
  fps: 12,
} satisfies Meta;

// The ship, the moon and the rigging.
const SHIP = String.raw`
                                                                   ,q
                                                                  p8b
                                        |                         88b
                                  .._________                     "88qq__
                            ..--''  d8888888b'-..                   """"
                      |---''        d8888888b    '-..
                 pppppqqqqqq         """|"""         '-..
                ,8888888888b            |                '-|.
               .888888888888b     dpppppqqqqqqb       ___________
             .- 888888888888b    ,888888888888b       p888888888b
           .'   dYY8888888PP'    d8888888888888      d8888888888b
         -'           |           "YYYYYPPPPPP'       YYY88888PPP'.
      .-'      ,______________          |                  |       -
    .-         ,8888888888888_  ,pppppppqqqqqqqq_   ,ppppppqqqqqqq  '.
   pq_        ,88888888888888b  ,888888888888888    ,888888888888b    '.
   "Y8q_      d888888888888888 ,8888888888888888b   d8888888888888b     -
      "Yq_    d888888888888888 d8888888888888888b   888888888888888qq8888b
        "Yqq_ "88888888888888b d8888888888888888b   d8888888888P"Y8P"Y888b
          "88888b"YYPPPPPPP""'  "YYYYYYYPPPPPPPP'    """"""88888qq88qq888
           d88888b_   |                 |                 p8888888888888b
           "888888888888888888888888888888888888888888888888888888888888b
            "8888888888""888""888""888""888""888""888""8888888888888888P
             "Y88888888pp888pp888pp888pp888qq888qq888qq8888888888888888'
               "YY888888888888888888888888888888888888888888PPPPPPPPP"'
                  """"""""YYYYYYYYYYPPPPP'"""""""""""""
`;
// The flag at the masthead through one flutter, as [column, row, picture].
const FLAGS: [number, number, string][] = [
  [30, 0, String.raw`
d888Y'Pqq8b
d88q   p88b
d888pqq888b
""" """"""'
`],
  [30, 0, String.raw`
d888pPqq88b
d88b   d88b
d888qqq888b
  """Y""""'
`],
  [30, 0, String.raw`
d8pppPP888b
d88b   d88b
d888qqp888b
""YY'"""""'
`],
  [30, 0, String.raw`
,ppPY"PY88b
d88q_ ,p88b
d8888qq888b
dYY"""""""'
`],
];

const LOOP = 6; // seconds for the swell to come round again
const W = (2 * Math.PI) / LOOP;
// The waves as [row, pattern, speed]: the one the ship rides in, then two nearer
// and faster. Each pattern is one swell, rolling left a whole number of times a loop.
const WAVES: [number, string, number][] = [[24, "_.-'``'-.____", 1], [27, "__.-'``'-.______", 2], [30, "___.-'``'-._________", 3]];
// Stars as [column, row, phase], set by a hash so they keep their places.
const STARS: [number, number, number][] = [];
for (let i = 0; i < 60; i++) {
  const h = Math.imul(i + 1, 2654435761) >>> 0;
  STARS.push([h % 80, (h >>> 8) % 14, ((h >>> 16) % 628) / 100]);
}

export default function galleon(): Frame {
  const { cols, rows } = meta;
  const ship = SHIP.slice(1, -1).split("\n").map((line) => line.padEnd(cols));
  const flags = FLAGS.map(([x, y, pic]) => ({ x, y, lines: pic.slice(1, -1).split("\n") }));
  const empty = (x: number, y: number) => y < 0 || y >= ship.length || ship[y][x] === " ";
  const clear = (x: number, y: number) => [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => empty(x + dx, y + dy) && empty(x + dx, y + dy - 1)));
  const stars: [number, number, number][] = [];
  for (const [x, y, p] of STARS) {
    const near = stars.some(([a, b]) => Math.abs(a - x) < 4 && Math.abs(b - y) < 2);
    const onFlag = flags.some((f) => y >= f.y - 1 && y <= f.y + f.lines.length && x >= f.x - 1 && x <= f.x + f.lines[0].length);
    if (stars.length < 16 && x > 0 && x < cols - 1 && !near && !onFlag && clear(x, y)) stars.push([x, y, p]);
  }

  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const grid = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
    for (const [x, y, p] of stars) {
      const s = Math.sin(2 * W * u + p);
      if (s > -0.3) grid[y][x] = s > 0.65 ? "°" : "·";
    }
    // The ship rides up and settles back once a swell.
    const dy = Math.sin(W * u) > 0.2 ? 0 : 1;
    ship.forEach((line, y) => {
      for (let x = 0; x < cols; x++) if (line[x] !== " ") grid[y + dy][x] = line[x];
    });
    const flag = flags[Math.floor(u * 4) % flags.length];
    flag.lines.forEach((line, j) => {
      for (let i = 0; i < line.length; i++) if (line[i] !== " ") grid[flag.y + j + dy][flag.x + i] = line[i];
    });
    for (let x = 0; x < cols; x++) for (let y = WAVES[0][0] + 1; y < rows; y++) grid[y][x] = " ";
    WAVES.forEach(([row, pattern, speed], i) => {
      const n = pattern.length, shift = Math.floor((speed * n * u) / LOOP) + i * 5;
      for (let x = 0; x < cols; x++) grid[row][x] = pattern[(((x + shift) % n) + n) % n];
    });
    return grid.map((r) => r.join("")).join("\n");
  };
}
