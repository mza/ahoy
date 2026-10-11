/*
 * tortuga: a badge for the pirates' haven, a ringed seal with a palm on the
 * island and the moon rising over the sea, TORTUGA lettered on a plate across
 * it. The moon's road shimmers on the water, the waves roll, the palm leans in
 * the breeze, stars come and go, and a glint runs round the ring.
 *
 * Tortuga, off the north coast of Hispaniola, was a haven for buccaneers from
 * the 1630s.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "tortuga",
  category: "scenes",
  note: "a badge for the pirates' haven: palm, rising moon and the sea, ringed",
  cols: 80,
  rows: 31,
  fps: 15,
  ground: "#000000",
  // bone, dim and glinting; gold, dim and bright; the waves
  palette: ["#ece6d6", "#8d877a", "#ffffff", "#f2b33d", "#8a6420", "#ffe08a", "#5d6a73"],
} satisfies Meta;

const BONE = 0, BONE_DIM = 1, GLINT = 2, GOLD = 3, GOLD_DIM = 4, GOLD_BRIGHT = 5, WAVE = 6;

// The ring and the moon, each cell the character that best follows their edge; r ring, m moon. A
// ring of dots inside it is drawn as it plays.
const SEAL = `
                                _oopooooooooqoo_
                           _opo8888YYYYYYYYYY8888oqo_
                         oo888Y'""            """Y888oo
                       p888Y"                      "Y888q
                     p888Y"                          "Y888q
                   ,p88P"                              "Y88q
                  ,d88'                                  "88b_
                  d88'                                    "88b
                 d88'                                      (88b
                ,88b                         ___            Y88
                (88)                     ,po88888o_         (88)
                d88'                    ,8888888888q        (88b
                d88)                    d88888888888)       (88b
                (88)                    d88888888888'       (88)
                (88b                     YYYYYYYYYY'        d88'
                 d88)                                      (88b
                  Y88_                                    ,88P
                  "Y88q                                  p88P'
                    Y88q_                              ,p88P
                     "888q_                          ,p888'
                       "YY--                        --YY'
`.slice(1, -1).split("\n");
const INK = `
                                rrrrrrrrrrrrrrrr
                           rrrrrrrrrrrrrrrrrrrrrrrrrr
                         rrrrrrrrr            rrrrrrrrr
                       rrrrrr                      rrrrrr
                     rrrrrr                          rrrrrr
                   rrrrrr                              rrrrr
                  rrrrr                                  rrrrr
                  rrrr                                    rrrr
                 rrrr                                      rrrr
                rrrr                         mmm            rrr
                rrrr                     mmmmmmmmmm         rrrr
                rrrr                    mmmmmmmmmmmm        rrrr
                rrrr                    mmmmmmmmmmmmm       rrrr
                rrrr                    mmmmmmmmmmmmm       rrrr
                rrrr                     mmmmmmmmmmm        rrrr
                 rrrr                                      rrrr
                  rrrr                                    rrrr
                  rrrrr                                  rrrrr
                    rrrrr                              rrrrr
                     rrrrrr                          rrrrrr
                       rrrrr                        rrrrr
`.slice(1, -1).split("\n");

// The palm on its island, its fronds above row 4 of it swaying.
const PALM = [
  "       _.--._   _.--._",
  "   _.-'  _  '.-'  _  '-._",
  " .'  _.-' '-./|\\.-' '-._ '.",
  "    '      / | \\      '",
  "          |  /",
  "           \\ \\",
  "            ) )",
  "           / /",
  "          ( (",
  "   ___.--'   '--.___",
];
const FRONDS = 4;
const PALM_AT = [21, 5]; // column and row of its top left

// The plate across the bottom, TORTUGA in shadowed blocks.
const NAME = [
  "████████╗ ██████╗ ██████╗ ████████╗██╗   ██╗ ██████╗  █████╗ ",
  "╚══██╔══╝██╔═══██╗██╔══██╗╚══██╔══╝██║   ██║██╔════╝ ██╔══██╗",
  "   ██║   ██║   ██║██████╔╝   ██║   ██║   ██║██║  ███╗███████║",
  "   ██║   ██║   ██║██╔══██╗   ██║   ██║   ██║██║   ██║██╔══██║",
  "   ██║   ╚██████╔╝██║  ██║   ██║   ╚██████╔╝╚██████╔╝██║  ██║",
  "   ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝",
];
const EST = "  EST.  1630  ";
const PLATE = [7, 72, 21, 29]; // left, right, top and bottom of the plate

const LOOP = 8;
const HORIZON = 15;
const CX = 40, CY = 12, INNER = 18.6; // the ring's middle, and the radius inside it in columns
const MOON = 46; // the column under the moon

const hash = (a: number, b: number) => {
  let h = Math.imul(a * 374761393 + b * 668265263, 1274126177);
  h ^= h >>> 13;
  h = Math.imul(h, 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export default function tortuga(): Frame {
  const { cols, rows } = meta;
  const grid: string[][] = [], ink: number[][] = [];
  const blank = () => {
    for (let y = 0; y < rows; y++) (grid[y] = new Array(cols).fill(" ")), (ink[y] = new Array(cols).fill(BONE));
  };
  // inside the ring, in columns, with cells twice as tall as wide
  const inside = (x: number, y: number) => Math.hypot(x + 0.5 - CX, (y + 0.5 - CY) * 2) < INNER;
  const stars: [number, number][] = [];
  for (let i = 0; i < 400 && stars.length < 14; i++) {
    const x = Math.floor(hash(i, 1) * cols), y = 2 + Math.floor(hash(i, 2) * (HORIZON - 3));
    const clear = stars.every(([sx, sy]) => Math.abs(sx - x) > 4 || Math.abs(sy - y) > 2);
    if (clear && inside(x - 1, y) && inside(x + 1, y) && Math.hypot(x - 46, (y - 12) * 2) > 9 && !(x > 18 && x < 44 && y > 4)) stars.push([x, y]);
  }
  const angles = SEAL.map((line, y) => [...line].map((_, x) => Math.atan2((y + 0.5 - CY) * 2, x + 0.5 - CX)));
  const lines = new Array<string>(rows);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, phase = (u / LOOP) * 2 * Math.PI;
    blank();
    // the ring and the moon, with a glint going round the ring
    const glint = -Math.PI / 2 + phase;
    SEAL.forEach((line, y) =>
      [...line].forEach((c, x) => {
        if (c === " ") return;
        grid[y][x] = c;
        if (INK[y][x] === "m") ink[y][x] = GOLD;
        else {
          let d = Math.abs(angles[y][x] - glint) % (2 * Math.PI);
          if (d > Math.PI) d = 2 * Math.PI - d;
          ink[y][x] = d < 0.18 ? GLINT : d < 0.4 ? BONE : c === "8" ? BONE : BONE_DIM;
        }
      }),
    );
    // the ring of dots inside the band
    for (let y = 0; y < PLATE[2]; y++)
      for (let x = 0; x < cols; x++) {
        const r = Math.hypot(x + 0.5 - CX, (y + 0.5 - CY) * 2);
        if (Math.abs(r - (INNER + 0.4)) < 0.55 && grid[y][x] === " " && (x + y) % 2 === 0) {
          let d = Math.abs(angles[y][x] - glint) % (2 * Math.PI);
          if (d > Math.PI) d = 2 * Math.PI - d;
          (grid[y][x] = "·"), (ink[y][x] = d < 0.3 ? GOLD_BRIGHT : GOLD_DIM);
        }
      }
    // stars, coming and going out of step
    stars.forEach(([x, y], i) => {
      const s = Math.sin(phase * (1 + (i % 3)) + i * 1.7);
      if (s > -0.3) (grid[y][x] = s > 0.7 ? "*" : s > 0.2 ? "+" : "."), (ink[y][x] = s > 0.7 ? BONE : BONE_DIM);
    });
    // the sea: waves rolling, and the moon's road shimmering on it
    for (let y = HORIZON; y < PLATE[2]; y++)
      for (let x = 0; x < cols; x++) {
        if (!inside(x, y)) continue;
        const depth = y - HORIZON, half = 2 + depth * 0.9;
        const road = Math.abs(x - MOON) < half && Math.sin(x * 1.3 + y * 2.1 - phase * 3) > -0.35;
        if (road) {
          const w = Math.sin(x * 0.9 - phase * 4 + y);
          grid[y][x] = w > 0.4 ? "=" : w > -0.3 ? "-" : "~";
          ink[y][x] = w > 0.4 ? GOLD_BRIGHT : depth > 3 ? GOLD_DIM : GOLD;
        } else {
          const w = Math.sin((x + (depth % 2 ? 1 : -1) * phase * (6 - depth) * 0.6) * 0.7 + depth * 1.9);
          if (w > 0.55) (grid[y][x] = w > 0.85 ? "~" : "-"), (ink[y][x] = WAVE);
        }
      }
    // the horizon
    for (let x = 0; x < cols; x++) if (inside(x, HORIZON - 1) && grid[HORIZON - 1][x] === " ") (grid[HORIZON - 1][x] = "_"), (ink[HORIZON - 1][x] = BONE_DIM);
    // the palm, its fronds leaning with the breeze
    const lean = Math.round(0.8 * Math.sin(phase));
    PALM.forEach((line, j) =>
      [...line].forEach((c, i) => {
        const x = PALM_AT[0] + i + (j < FRONDS ? lean : 0), y = PALM_AT[1] + j;
        if (c !== " " && x >= 0 && x < cols) (grid[y][x] = c), (ink[y][x] = j < FRONDS ? BONE : BONE);
      }),
    );
    // the plate, over the bottom of the ring
    const [l, r, top, bottom] = PLATE;
    for (let y = top; y <= bottom; y++)
      for (let x = l; x <= r; x++) {
        const edge = y === top || y === bottom, side = x === l || x === r;
        grid[y][x] = edge && side ? (y === top ? (x === l ? "╔" : "╗") : x === l ? "╚" : "╝") : edge ? "═" : side ? "║" : " ";
        ink[y][x] = GOLD_DIM;
      }
    NAME.forEach((line, j) => {
      const x0 = Math.floor((l + r + 1 - line.length) / 2);
      [...line].forEach((c, i) => c !== " " && ((grid[top + 1 + j][x0 + i] = c), (ink[top + 1 + j][x0 + i] = c === "█" ? GOLD : GOLD_DIM)));
    });
    // a rule either side of the date
    const ey = bottom - 1, ex = Math.floor((l + r + 1 - EST.length) / 2);
    for (let x = l + 4; x <= r - 4; x++) (grid[ey][x] = "─"), (ink[ey][x] = GOLD_DIM);
    [...EST].forEach((c, i) => ((grid[ey][ex + i] = c), (ink[ey][ex + i] = BONE)));
    for (let y = 0; y < rows; y++) {
      lines[y] = grid[y].join("");
      if (color) for (let x = 0; x < cols; x++) color[y * cols + x] = ink[y][x];
    }
    return lines.join("\n");
  };
}
