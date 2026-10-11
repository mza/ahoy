/*
 * powder keg: a stout barrel of gunpowder, a skull and crossbones painted on
 * its staves and POWDER stencilled on a hoop. A fuse snakes out of its bung
 * and burns down, spitting sparks, until the keg goes up in a fireball that
 * shouts KA-BOOM, rolls away as smoke, and a fresh keg settles in its place.
 *
 * The keg is drawn from a painting at 80 by 32: each cell holds the character
 * whose shape best matches the edge through it, # where the wood is solid, =
 * the iron and 8 the painted bone. The fuse, the sparks and the blast are
 * worked out each frame.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "powder keg",
  category: "scenes",
  note: "a keg of gunpowder with a burning fuse that goes up in a ka-boom",
  cols: 80,
  rows: 32,
  fps: 20,
  palette: [
    // bone, lit and shaded; wood, lit to dark; iron, lit to dark; the fuse
    "#ece4d0", "#b8ac92", "#b88448", "#8c5e30", "#63401e", "#c4ced8", "#8a96a4", "#5c6672", "#9c8c6c",
    // fire, white-hot to embers; smoke; the stencilled word
    "#fff8e0", "#f6c84c", "#f08424", "#d23c1c", "#7a1c10", "#6a6460", "#36322f", "#e0442c",
  ],
  ground: "#000000",
} satisfies Meta;

// The keg, and what each cell is made of: 1 wood, 2 iron, 3 bone, 4 the stencilled word.
const ART = [
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                               __________________                               ",
  "                     __pppp##########################pqqq__                     ",
  "                    ,==################pq################==_                    ",
  "                    p######################################q                    ",
  "                   ,#=======########################=======#_                   ",
  "                   d====########=##=########=##=########====b                   ",
  "                   d#########=====PYbpppqqqdPP=====#########b                   ",
  "                  ,##Pdp\"Y#####P'p888888888888q\"Y#####P'qbP##                   ",
  "                  ,#bd888pbP##'p8888888888888888q\"##Pdq888bd#'                  ",
  "                  d##qd\"8888q_d88PPPP888888PPPY88b_q8888\"\"p##b                  ",
  "                  d####bpdPP8888b     Y88P     d8888PYbqd####b                  ",
  "                  ##########q\"88b    ,d888_    d88'p##########                  ",
  "                  ###########q\"888qpp888888qqp888'p###########                  ",
  "                  ############b_P888888'\"888888P,d############                  ",
  "                  ##############bd88888pp88888bd##############                  ",
  "                  d##########PYpp888P88PY88P888qqPP##########b                  ",
  "                  d######PP'pp88PY88'd8',8b 88PY88qp\"PPY#####b                  ",
  "                  ,###P'p8888PYqq_\"P'\"P'\"P' P'_ppPP8888q\"P###'                  ",
  "                   #P,p888P'pp####################qq\"Y8888_Y#                   ",
  "                   db/Y8P,p##########################qqP8P'db                   ",
  "                   \"##qp################################qp##'                   ",
  "                    =######################################='                   ",
  "                    d============[ P O W D E R ]===========b                    ",
  "                     Y===========#============#===========P'                    ",
  "                      \"\"\"\"\"PPPPPPPPPPPPPPPPPPPPPPPPPP'\"\"\"\"                      ",
];
const MAT = [
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000002222222222222222220000000000000000000000000000000",
  "00000000000000000000022222111111111111111111111111111222222000000000000000000000",
  "00000000000000000000122111111111111111111111111111111111122100000000000000000000",
  "00000000000000000000211111111111111111111111111111111111111200000000000000000000",
  "00000000000000000002122222221111111111111111111111112222222120000000000000000000",
  "00000000000000000001222211111111211211111111211211111111222210000000000000000000",
  "00000000000000000001111111111222222223333332222222211111111110000000000000000000",
  "00000000000000000011113311111111133333333333333111111111331111000000000000000000",
  "00000000000000000011133333311113333333333333333331111333333111000000000000000000",
  "00000000000000000011113333333333333333333333333333333333331111000000000000000000",
  "00000000000000000011111113333333300000333300000333333331111111000000000000000000",
  "00000000000000000011111111111333300003333330000333311111111111000000000000000000",
  "00000000000000000011111111111133333333333333333333111111111111000000000000000000",
  "00000000000000000011111111111111333333333333333311111111111111000000000000000000",
  "00000000000000000011111111111111133333333333333111111111111111000000000000000000",
  "00000000000000000011111111111113333333333333333331111111111111000000000000000000",
  "00000000000000000011111111113333333333333333333333331111111111000000000000000000",
  "00000000000000000011111133333331113333333333331113333333111111000000000000000000",
  "00000000000000000011133333331111111111111111111111113333333111000000000000000000",
  "00000000000000000001133331111111111111111111111111111113333110000000000000000000",
  "00000000000000000001111111111111111111111111111111111111111110000000000000000000",
  "00000000000000000002211111111111111111111111111111111111111220000000000000000000",
  "00000000000000000000222222222222244444444444444422222222222200000000000000000000",
  "00000000000000000000112222222222212222222222221222222222221100000000000000000000",
  "00000000000000000000001111111111111111111111111111111111110000000000000000000000",
];

const LOOP = 7;
const BOOM = 4; // seconds the fuse takes to burn down
const BACK = 6.1; // when the new keg starts to settle in
const CX = 40, CY = 19; // the middle of the blast
const BANNER = [
  ["██╗  ██╗", "██║ ██╔╝", "█████╔╝ ", "██╔═██╗ ", "██║  ██╗", "╚═╝  ╚═╝"],
  [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  ["      ", "      ", "█████╗", "╚════╝", "      ", "      "],
  ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██████╔╝", "╚═════╝ "],
  [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  ["███╗   ███╗", "████╗ ████║", "██╔████╔██║", "██║╚██╔╝██║", "██║ ╚═╝ ██║", "╚═╝     ╚═╝"],
  ["██╗", "██║", "██║", "╚═╝", "██╗", "╚═╝"],
].reduce((rows, glyph) => rows.map((r, i) => r + glyph[i]), ["", "", "", "", "", ""]);
const RAMP = " .:-=+*#%@";

const hash = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// value noise on a grid, for the fireball's churn
const noise = (x: number, y: number) => {
  const i = Math.floor(x), j = Math.floor(y), u = smooth(x - i), v = smooth(y - j);
  const at = (a: number, b: number) => hash(a * 7919 + b * 104729);
  return at(i, j) * (1 - u) * (1 - v) + at(i + 1, j) * u * (1 - v) + at(i, j + 1) * (1 - u) * v + at(i + 1, j + 1) * u * v;
};

// The fuse, from its free end down to the bung: the cells it passes through and the character for each.
function fuse(): [number, number, string][] {
  const path: [number, number][] = [];
  for (let i = 0; i <= 400; i++) {
    const s = i / 400;
    // an S that rises from the bung, leans right and curls back
    const x = 40 + 17 * s + 3 * Math.sin(Math.PI * 2 * s);
    const y = 7.6 - 6.4 * s + 1.2 * Math.sin(Math.PI * 3 * s) * s;
    const c: [number, number] = [Math.round(x), Math.round(y)];
    const last = path[path.length - 1];
    if (!last || last[0] !== c[0] || last[1] !== c[1]) path.push(c);
  }
  path.reverse();
  return path.map(([x, y], i) => {
    const [px, py] = path[Math.max(0, i - 1)], [nx, ny] = path[Math.min(path.length - 1, i + 1)];
    const dx = nx - px, dy = ny - py;
    const ch = dy === 0 ? "~" : dx === 0 ? "|" : dx * dy < 0 ? "/" : "\\";
    return [x, y, ch];
  });
}

export default function powderKeg(): Frame {
  const { cols, rows } = meta;
  const wire = fuse();
  // the banner's cells and a ring a cell wide round them, kept clear of fire
  const bx = Math.round(CX - BANNER[0].length / 2), by = 13;
  const clear = new Uint8Array(cols * rows);
  for (let j = 0; j < 6; j++)
    for (let i = 0; i < BANNER[0].length; i++)
      if (BANNER[j][i] !== " ")
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) clear[(by + j + dy) * cols + bx + i + dx] = 1;
  // each keg cell's colour at rest
  const rest = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const m = MAT[y][x], k = (x - CX) / 22;
      rest[y * cols + x] =
        m === "1" ? (k < -0.4 ? 2 : k > 0.45 || (x + 2) % 6 === 0 ? 4 : 3)
        : m === "2" ? (k < -0.35 ? 5 : k > 0.5 ? 7 : 6)
        : m === "3" ? (k > 0.35 ? 1 : 0)
        : m === "4" ? 16 : 0;
    }

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, age = u - BOOM;
    const ch = new Array<string>(cols * rows).fill(" ");
    const ink = new Uint8Array(cols * rows);
    const put = (x: number, y: number, c: string, i: number) => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      ch[y * cols + x] = c;
      ink[y * cols + x] = i;
    };

    if (u < BOOM + 0.12 || u >= BACK) {
      // the keg, white for an instant as it goes, settling back in grain by grain
      const settle = u >= BACK ? (u - BACK) / (LOOP - BACK) : 1;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const c = ART[y][x];
          if (c === " " || hash(y * cols + x) > settle * 1.2 - 0.1) continue;
          put(x, y, c, age >= 0 ? 9 : rest[y * cols + x]);
        }
      // the fuse, burnt back to the spark
      const burnt = u < BOOM ? Math.floor((u / BOOM) * wire.length) : u >= BACK ? 0 : wire.length;
      for (let i = burnt; i < wire.length; i++) {
        const [x, y, c] = wire[i];
        if (u >= BACK && hash(i * 31) > settle * 1.2 - 0.1) continue;
        put(x, y, c, 8);
      }
      if (u < BOOM) {
        const [hx, hy] = wire[Math.min(burnt, wire.length - 1)];
        const step = Math.floor(u * 20);
        // sparks thrown off the burning head
        for (let k = 0; k < 9; k++) {
          const h1 = hash(step * 97 + k * 13), h2 = hash(step * 53 + k * 29 + 7), h3 = hash(step * 11 + k);
          const life = h3;
          const sx = Math.round(hx + (h1 - 0.5) * 7 * life), sy = Math.round(hy - (0.2 + h2) * 2.6 * life + life * life * 1.5);
          put(sx, sy, "*+.'`"[Math.floor(life * 5)], life < 0.25 ? 9 : life < 0.6 ? 10 : 11);
        }
        put(hx - 1, hy, "+", 10);
        put(hx + 1, hy, "+", 10);
        put(hx, hy, u * 20 % 2 < 1 ? "*" : "@", 9);
      }
    }

    if (age >= 0 && u < BACK + 0.4) {
      // the fireball, then the smoke it leaves
      const r = 38 * (1 - Math.exp(-age / 0.17)) + 2;
      const cool = age / 1.7;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const k = y * cols + x;
          if (clear[k] && age > 0.1 && age < 1.5) continue;
          // billows: the edge pushed out and pulled in round the ball
          const a = Math.atan2((y - CY) * 2.1, x - CX);
          const lobe = 0.78 + 0.44 * noise(3 + Math.cos(a) * 2.2 + age * 0.8, 3 + Math.sin(a) * 2.2);
          const dist = Math.hypot(x - CX, (y - CY) * 2.1) / (r * lobe);
          if (dist > 1.05) continue;
          const n = noise(x / 5 + age * 2, y / 2.5 - age * 3);
          const heat = (1.1 - dist * 0.85 + (n - 0.5) * 0.7) * (1 - cool);
          const dense = 1.15 - dist * 0.75 + (n - 0.5) * 0.6 - Math.max(0, age - 1.3) * 0.9;
          if (dense <= 0.08) continue;
          const c = RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.round(dense * (RAMP.length - 1))))];
          const i = heat > 0.72 ? 9 : heat > 0.52 ? 10 : heat > 0.34 ? 11 : heat > 0.18 ? 12 : heat > 0.06 ? 13 : dense > 0.45 ? 14 : 15;
          put(x, y, c, i);
        }
      // splinters of the keg flying out
      if (age < 0.9)
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2 + hash(k) * 0.6, v = 26 + hash(k + 99) * 22;
          const x = Math.round(CX + Math.cos(a) * v * age), y = Math.round(CY + (Math.sin(a) * v * age) / 2.1 + age * age * 6);
          const dir = Math.abs(Math.cos(a)) > 0.8 ? "-" : Math.abs(Math.sin(a)) > 0.8 ? "|" : Math.cos(a) * Math.sin(a) > 0 ? "\\" : "/";
          put(x, y, dir, age < 0.4 ? 11 : 3);
        }
      // KA-BOOM, shaking as it lands
      if (age > 0.1 && age < 1.5) {
        const shake = Math.round(Math.sin(age * 70) * 1.5 * Math.max(0, 1 - (age - 0.1) / 0.35));
        for (let j = 0; j < 6; j++)
          for (let i = 0; i < BANNER[0].length; i++) {
            const c = BANNER[j][i];
            if (c === " ") continue;
            put(bx + i + shake, by + j, c, c === "█" ? (age < 0.3 ? 9 : 10) : 11);
          }
      }
    }

    if (color) color.set(ink);
    const out: string[] = [];
    for (let y = 0; y < rows; y++) out.push(ch.slice(y * cols, (y + 1) * cols).join(""));
    return out.join("\n");
  };
}
