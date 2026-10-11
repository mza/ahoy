/*
 * ship-in-a-bottle: a corked bottle lying on its side on a little wooden stand,
 * a tiny three-masted ship inside it on a strip of sea. The ship rocks, her
 * masts swaying a pixel or two either way, and a glint slides along the glass.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * The glass is an outline two pixels thick; the ship is a sprite two pixels to
 * each of its own, with black between every sail, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ship in a bottle",
  category: "scenes",
  note: "a three-master rocking inside a corked bottle, a glint on the glass",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // ghost cyan glass, sea blue, wood, bone
  palette: ["#5fd7c9", "#3a7ca5", "#a8703a", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const GLASS = 1, SEA = 2, WOOD = 3, BONE = 4;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
};
const line = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number, thick = 1) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) rect(p, Math.round(x0 + ((x1 - x0) * i) / n - (thick - 1) / 2), Math.round(y0 + ((y1 - y0) * i) / n - (thick - 1) / 2), thick, thick, k);
};
// Rows of characters as pixels `scale` across: "." leaves the pixel alone, "_" empties it, others are looked up in `keys`.
const sprite = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>, scale = 1) => {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== ".") rect(p, x + i * scale, y + j * scale, scale, scale, c === "_" ? 0 : keys[c]);
    }),
  );
};
// A filled polygon, by scanline.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) set(p, x, y, k);
  }
};
// Whether every pixel within `m` of this one is filled: the shape, shrunk by `m`.
const within = (p: Uint8Array, x: number, y: number, m: number) => {
  for (let j = -m; j <= m; j++)
    for (let i = -m; i <= m; i++) if (x + i < 0 || x + i >= W || y + j < 0 || y + j >= H || !p[(y + j) * W + x + i]) return false;
  return true;
};
// The canvas as half blocks. A cell has one ink: where its two pixels differ, the one further down the palette.
const emit = (p: Uint8Array, color?: Uint8Array) => {
  const out: string[] = [];
  for (let y = 0; y < meta.rows; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      const a = p[2 * y * W + x], b = p[(2 * y + 1) * W + x];
      row += a && b ? "█" : a ? "▀" : b ? "▄" : " ";
      if (color) color[y * W + x] = Math.max(a, b, 1) - 1;
    }
    out.push(row);
  }
  return out.join("\n");
};

// ---- the bottle and the ship

// The ship, bow to the right: three masts, two sails on each, a bowsprit.
const SHIP = [
  "..........w..........",
  "....w...sssss...w....",
  "..sssss.sssss.sssss..",
  "..sssss.sssss.sssss..",
  "....w.....w.....w....",
  "..sssss.sssss.sssss..",
  "..sssss.sssss.sssss..",
  "..sssss.sssss.sssss..",
  "....w.....w.....w...w",
  "ww..w.....w.....w.ww.",
  "wwwwwwwwwwwwwwwwwwww.",
  ".wwwwwwwwwwwwwwwwww..",
  "..wwwwwwwwwwwwwwww...",
];
const SHIP_X = 8, SHIP_Y = 14;
const WAVE = ["..####..", "########"];
const LOOP = 6;

export default function shipInABottle(): Frame {
  // the bottle's whole shape: a body with its flat base to the left, a shoulder, a neck and a lip
  const shape = new Uint8Array(W * H);
  rect(shape, 4, 6, 46, 44, 1);
  rect(shape, 2, 8, 2, 40, 1);
  poly(shape, [[50, 6], [64, 21], [64, 34], [50, 49]], 1);
  rect(shape, 64, 21, 10, 14, 1);
  rect(shape, 70, 19, 4, 18, 1);
  // what never moves: the glass as an outline, the cork, the stand, and the sea inside
  const still = new Uint8Array(W * H);
  const glass = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (shape[y * W + x] && !within(shape, x, y, 2)) still[y * W + x] = glass[y * W + x] = GLASS;
      if (y >= 42 && x < 58 && within(shape, x, y, 4)) still[y * W + x] = SEA;
    }
  // the cork: a plug in the mouth and a head outside it
  rect(still, 68, 23, 6, 10, WOOD);
  rect(still, 74, 22, 4, 12, WOOD);
  // the stand: two cradles on a plank with feet
  for (const x of [10, 40]) {
    rect(still, x, 52, 8, 4, WOOD);
    rect(still, x + 2, 52, 4, 2, 0);
  }
  rect(still, 4, 56, 50, 4, WOOD);
  rect(still, 6, 60, 6, 2, WOOD);
  rect(still, 46, 60, 6, 2, WOOD);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the sea's crests, sliding under the ship
    const off = Math.floor(u * 4);
    for (let x = 0; x < W; x++)
      for (let j = 0; j < 2; j++) if (within(shape, x, 40 + j, 4) && x < 58 && WAVE[j][(x + off) % 8] === "#") set(p, x, 40 + j, SEA);
    // the ship, her upper sails leaning further than her lower ones
    const s = [0, 1, 0, -1][Math.floor(u / 0.75) % 4];
    SHIP.forEach((row, j) => sprite(p, SHIP_X + (j < 4 ? 2 * s : j < 8 ? s : 0), SHIP_Y + j * 2, [row], { w: WOOD, s: BONE }, 2));
    // the glint: a slanted band of bone crossing the glass from end to end, twice a loop
    const g = (30 + u * 40) % 120 - 10;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) if (glass[y * W + x] && x + y / 2 >= g && x + y / 2 < g + 8) p[y * W + x] = BONE;
    return emit(p, color);
  };
}
