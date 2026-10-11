/*
 * walk-the-plank: the side of a ship at the left, a plank run out over the sea,
 * and a small pirate with a peg leg at the end of it, teetering with his arms
 * going round. He loses his nerve and shuffles back, a cutlass from the ship
 * prods him, and he shuffles out again. Below, a shark's fin circles.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat colours.
 * The pirate is a sprite three pixels to each of its own, leant by sliding his
 * upper rows; the fin is drawn first and the waves over its base, so it cuts the
 * surface of the sea.
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

// The pirate, facing the sea: hat, face, shirt, then three ways of holding his arms and two of standing.
const HEAD = ["...rrr...", "..rrrrr..", ".rrrrrrr.", "..bbbbb..", "..bb_b_..", "..bbbbb.."];
const ARMS = [
  ["..rrrrr..", "bbrrrrrbb", "..rrrrr.."],
  ["b.rrrrr..", ".brrrrrbb", "..rrrrr.."],
  ["..rrrrr.b", "bbrrrrrb.", "..rrrrr.."],
];
const LEGS = [
  ["..bb.w...", "..bb.w..."],
  ["..bb..w..", ".bb...w.."],
];
// The fin, swimming to the right.
const FIN = ["....#..", "...##..", "..###..", ".####..", ".#####.", "#######"];
const WAVE = ["..####..", "########", "##....##"];
const PLANK = 38, PLANK_END = 62, SEA_TOP = 54;
const OUT = 40, BACK = 28;
const HULL = 16;
const LOOP = 10;

export default function walkThePlank(): Frame {
  // what never moves: the ship's side as one slab of hull under an overhanging rail,
  // three plank seams across it, a gun port with its muzzle, and the plank run out at deck level
  const still = new Uint8Array(W * H);
  rect(still, 0, 6, HULL, H - 6, WOOD);
  rect(still, 0, 2, HULL + 4, 4, WOOD);
  for (const y of [13, 33, 45]) rect(still, 0, y, HULL, 1, 0);
  rect(still, 4, 18, 8, 8, 0);
  rect(still, 7, 20, 2, 4, IRON);
  rect(still, HULL, PLANK, PLANK_END - HULL, 2, WOOD);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // where he is, how he leans and what his arms and legs are doing
    let x = OUT, lean = 0, arms = 0, legs = 0, prod = 0;
    if (u < 3 || u >= 8) {
      const k = Math.floor(u * 3) % 4;
      lean = [1, 0, -1, 0][k], arms = [1, 0, 2, 0][k];
    } else if (u < 5) {
      const step = Math.floor((u - 3) * 3);
      x = Math.max(BACK, OUT - 3 * step - 3), legs = x > BACK ? step % 2 : 0;
    } else if (u < 6) {
      x = BACK, prod = 1 + (Math.floor(u * 4) % 2) * 2;
      arms = prod > 1 ? 2 : 0, lean = prod > 1 ? 1 : 0;
    } else {
      const step = Math.floor((u - 6) * 3);
      x = Math.min(OUT, BACK + 3 * step + 3), legs = x < OUT ? step % 2 : 0;
    }
    const top = PLANK - 33;
    sprite(p, x + 4 * lean, top, HEAD, { r: RED, b: BONE }, 3);
    sprite(p, x + 2 * lean, top + 18, ARMS[arms], { r: RED, b: BONE }, 3);
    sprite(p, x, top + 27, LEGS[legs], { b: BONE, w: WOOD }, 3);
    // the cutlass that sends him out again
    if (prod) rect(p, HULL + 1, PLANK - 10, 5 + prod, 2, BONE);

    // the sea closes over the hull: a black gap, then rows of waves
    rect(p, 0, SEA_TOP - 2, W, H - SEA_TOP + 2, 0);
    // the shark goes round under the plank's end: away to the left at the back, home to the right at the front
    const a = (u / 5) * 2 * Math.PI, near = Math.sin(a) < 0;
    const fx = Math.round(50 + 20 * Math.cos(a)) - 7, fy = near ? 44 : 47;
    // the fin goes down first and the waves over its base, so it cuts the surface
    FIN.forEach((row, j) =>
      [...row].forEach((c, i) => {
        if (c === "#") rect(p, fx + (near ? i : 6 - i) * 2, fy + j * 2, 2, 2, IRON);
      }),
    );
    for (let r = 0; r < 3; r++) {
      const off = Math.floor(u * [4, -3, 6][r]) + r * 4;
      for (let x = 0; x < W; x++)
        for (let j = 0; j < 3; j++) if (WAVE[j][(((x + off) % 8) + 8) % 8] === "#") set(p, x, SEA_TOP + r * 4 + j, SEA);
    }
    // what is left of the fin below the surface is sea: a swell where it breaks through
    for (let i = SEA_TOP * W; i < p.length; i++) if (p[i] === IRON) p[i] = i < (SEA_TOP + 3) * W ? SEA : 0;
    return emit(p, color);
  };
}
