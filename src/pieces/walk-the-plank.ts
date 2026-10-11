/*
 * walk-the-plank: the side of a ship at the left, a plank run out over the sea,
 * and a small pirate with a peg leg at the end of it, teetering with his arms
 * going round. He loses his nerve and shuffles back, a cutlass from the ship
 * prods him, and he shuffles out again. Below, a shark's fin circles.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours: the hull with its rail, seams, nail heads and
 * a gun port; the pirate in profile under a tricorn, bearded, belted, leant by
 * sliding his upper rows; the fin a curved blade drawn before the swell, so it
 * cuts the surface. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "walk the plank",
  category: "scenes",
  note: "a pirate teetering at the end of the plank, a shark fin circling",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sea blue, iron, wood, blood red, bone
  palette: ["#3a7ca5", "#8a94a6", "#a8703a", "#e23a2e", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const SEA = 1, IRON = 2, WOOD = 3, RED = 4, BONE = 5;

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

// ---- the pirate, the shark and the ship

// The pirate, facing the sea. His head: a tricorn with a bone badge, an eye, a nose, a beard, a neck.
const HEAD = [
  "...rrrrr......",
  "..rrrrrrrr....",
  ".rrrrrrrrrr...",
  ".rrrrrrrrrr..r",
  "rrrrrrrrrrrrrr",
  ".rrrrrrrrrrrr.",
  "...bbbbbbbb...",
  "...bbbbb_bbb..",
  "...bbbbbbbbbb.",
  "...bbbbbbbbb..",
  "...bbbbbwwww..",
  "....bbwwwwww..",
  "......wwwww...",
  ".....bbbw.....",
];
// His coat, buttoned and belted.
const COAT = [
  "...rrrrrrrr...",
  "..rrrrrrrrrr..",
  "..rrrrrrr_rr..",
  "..rrrrrrrrrr..",
  "..rrrrrrr_rr..",
  "..rrrrrrrrrr..",
  "..rrrrrrr_rr..",
  "..rrrrrrrrrr..",
  "..rrrrrrrrrr..",
  "..wwwwwbbwww..",
  "..wwwwwbbwww..",
  ".rrrrrrrrrrrr.",
];
// His legs, grey breeches over a stocking and shoe and over a peg: standing, and mid-shuffle.
const LEGS = [
  ["..iiiii.iiii..", "..iiiii.iiii..", "..iiii...iii..", "..bbbb...ww...", "..bbbb...ww...", "..bbbb...ww...", "..bbbb...ww...", "..wwwww..ww...", "..wwwwww.ww..."],
  ["..iiiii.iiii..", "..iiiii.iiii..", ".iiii....iii..", ".bbbb....ww...", ".bbbb....ww...", ".bbbb....ww...", "bbbb.....ww...", "wwwww....ww...", "wwwwww...ww..."],
];
// Where each hand is from its shoulder, the arm behind him then the arm before: at ease, flung forward, flung back.
const ARMS = [
  [[-3, 7], [3, 7]],
  [[-5, -4], [6, 1]],
  [[-5, 3], [5, -5]],
];
// A swell, twenty pixels long: how far below its crest the water is at each pixel.
const SWELL = Array.from({ length: 20 }, (_, i) => Math.round(1 - Math.cos((i / 20) * 2 * Math.PI)));
const PLANK = 38, PLANK_END = 55, SEA_TOP = 54;
const OUT = 40, BACK = 28;
const HULL = 16;
const LOOP = 10;

export default function walkThePlank(): Frame {
  // what never moves: the ship's side as one slab of hull under an overhanging rail, plank seams
  // with nail heads at their ends, a gun port with its muzzle, and the plank on its brace
  const still = new Uint8Array(W * H);
  rect(still, 0, 6, HULL, H - 6, WOOD);
  rect(still, 0, 2, HULL + 4, 3, WOOD);
  rect(still, 0, 5, HULL + 2, 1, WOOD);
  for (const y of [13, 33, 45]) {
    rect(still, 0, y, HULL, 1, 0);
    for (const x of [2, HULL - 3]) set(still, x, y - 3, 0), set(still, x, y + 3, 0);
  }
  rect(still, 3, 17, 10, 1, 0), rect(still, 4, 18, 8, 8, 0);
  rect(still, 6, 20, 4, 4, IRON), rect(still, 7, 21, 2, 2, 0);
  rect(still, HULL, PLANK, PLANK_END - HULL, 2, WOOD);
  for (let i = 0; i < 6; i++) set(still, HULL + i, PLANK + 7 - i, WOOD), set(still, HULL + i, PLANK + 8 - i, WOOD);
  for (const x of [HULL + 2, HULL + 4]) set(still, x, PLANK, 0);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // where he is, how he leans and what his arms and legs are doing
    let x = OUT, lean = 0, arms = 0, legs = 0, prod = 0;
    if (u < 3 || u >= 8) {
      const k = Math.floor(u * 3) % 4;
      lean = [2, 0, -2, 0][k], arms = [1, 0, 2, 0][k];
    } else if (u < 5) {
      x = OUT - Math.floor((u - 3) * 6), legs = Math.floor((u - 3) * 3) % 2;
    } else if (u < 6) {
      x = BACK, prod = 1 + (Math.floor(u * 4) % 2) * 2;
      arms = prod > 1 ? 2 : 0, lean = prod > 1 ? 1 : 0;
    } else {
      x = Math.min(OUT, BACK + Math.floor((u - 6) * 6) + 1), legs = x < OUT ? Math.floor((u - 6) * 3) % 2 : 0;
    }
    const top = PLANK - 35, keys = { r: RED, b: BONE, w: WOOD, i: IRON };
    sprite(p, x + lean, top, HEAD, keys);
    COAT.forEach((row, j) => sprite(p, x + Math.round((lean * (11 - j)) / 11), top + 14 + j, [row], keys));
    sprite(p, x, top + 26, LEGS[legs], keys);
    // his arms, out from the shoulders, a hand at the end of each
    ARMS[arms].forEach(([ax, ay], i) => {
      const sx = x + lean + (i ? 11 : 2), sy = top + 16;
      line(p, sx, sy, sx + ax, sy + ay, RED, 2);
      rect(p, sx + ax - (ax < 0 ? 1 : 0), sy + ay - (ay < 0 ? 1 : 0), 2, 2, BONE);
    });
    // the cutlass that sends him out again: a blade with an upturned point
    if (prod) {
      rect(p, HULL + 1, PLANK - 13, 4 + prod, 2, BONE);
      rect(p, HULL + 5 + prod, PLANK - 14, 1, 2, BONE), set(p, HULL + 6 + prod, PLANK - 15, BONE);
    }

    // the sea closes over the hull: a black gap, then the swell
    rect(p, 0, SEA_TOP - 1, W, H - SEA_TOP + 1, 0);
    // the shark goes round under the plank's end: away to the left at the back, home to the right at the front.
    // Its fin is a curved blade, raked back, drawn first so that the swell closes over its base.
    const a = (u / 5) * 2 * Math.PI, near = Math.sin(a) < 0;
    const fx = Math.round(50 + 20 * Math.cos(a)) - 6, fy = near ? 44 : 47;
    for (let j = 0; j < 14; j++) {
      const k = Math.min(1, j / 11);
      const l = Math.round(2 - 2 * k + 2.5 * Math.sin(Math.PI * k)), r = 2 + Math.round(10 * k ** 0.75);
      for (let i = l; i <= r; i++) set(p, fx + (near ? i : 12 - i), fy + j, IRON);
    }
    for (let r = 0; r < 4; r++) {
      const off = Math.floor(u * [4, -2, 6, -4][r]) + r * 7;
      for (let x = 0; x < W; x++) {
        const i = (((x + off) % 20) + 20) % 20, y = SEA_TOP + r * 3 + (r > 0 ? 2 + (SWELL[i] >> 1) : SWELL[i]);
        const foam = i < 3 && (Math.floor((x + off) / 20) + r) % 3 === 0;
        if (r === 0) {
          // above the surface the fin stands; below it there is only sea
          for (let j = y; j < H; j++) if (p[j * W + x] === IRON) p[j * W + x] = 0;
          set(p, x, y + 1, SEA);
          set(p, x, y, foam ? BONE : SEA);
        } else if (y < H) set(p, x, y, foam ? BONE : SEA);
      }
    }
    return emit(p, color);
  };
}
