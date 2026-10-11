/*
 * jolly-boat: a ship's rowing boat seen side-on, one pirate at the oars with
 * his back to the bow. He rows in four poses: reach, pull, finish, and the oar
 * swung back clear of the water. The boat nudges forward on every pull and the
 * waves scroll under it.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * The pirate is a sprite two pixels to each of its own; the oar is cut out of
 * the hull with a black gap, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "jolly boat",
  category: "scenes",
  note: "a pirate rowing a jolly boat over scrolling waves, stroke by stroke",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sea blue, wood, blood red, bone
  palette: ["#3a7ca5", "#a8703a", "#e23a2e", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const SEA = 1, WOOD = 2, RED = 3, BONE = 4;

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

// ---- the boat, the pirate and the oar

// The pirate from his hat to his belt, facing the stern: a red tricorn, a striped shirt.
const PIRATE = [
  "...rrrr...",
  "r.rrrrrr.r",
  "rrrrrrrrrr",
  "..bbbbbb..",
  "..b_bb_b..",
  "..bbbbbb..",
  "...bbbb...",
  "..........",
  ".rrrrrrrr.",
  ".bbbbbbbb.",
  ".rrrrrrrr.",
  ".bbbbbbbb.",
  ".rrrrrrrr.",
];
const SEAT = 44, GUNWALE = 37, LOCK = 34;
// The four poses: how far the pirate leans, where the oar's blade is from the rowlock, and how far the boat has run.
const POSES = [
  { lean: -2, bx: 15, by: 20, run: 0 },
  { lean: 0, bx: 0, by: 24, run: 2 },
  { lean: 2, bx: -15, by: 20, run: 3 },
  { lean: 0, bx: -3, by: 10, run: 1 },
];
const WAVE = ["..####..", "########", "##....##"];
const SEA_TOP = 53;
const LOOP = 8;

export default function jollyBoat(): Frame {
  // what never changes shape: the hull, a plank of gunwale over a rounded body
  const boat = new Uint8Array(W * H);
  poly(boat, [[4, GUNWALE - 3], [9, GUNWALE], [69, GUNWALE], [76, GUNWALE - 3], [76, GUNWALE + 2], [4, GUNWALE + 2]], WOOD);
  poly(boat, [[8, GUNWALE + 4], [72, GUNWALE + 4], [64, 56], [15, 56]], WOOD);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const pose = POSES[Math.floor(u * 2) % 4];
    const p = new Uint8Array(W * H);
    const dx = pose.run - 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (boat[y * W + x]) set(p, x + dx, y, boat[y * W + x]);
    // the pirate, sat amidships and leaning into his stroke
    const px = SEAT + dx + pose.lean;
    sprite(p, px, GUNWALE - 3 - PIRATE.length * 2, PIRATE, { r: RED, b: BONE }, 2);
    // the oar: from his hands, through the rowlock, down to the blade
    const lx = LOCK + dx, ly = GUNWALE - 2;
    const hx = lx - pose.bx * 0.45, hy = ly - 7;
    const ex = lx + pose.bx, ey = ly + pose.by;
    line(p, lx, ly + 2, ex, ey, 0, 6);
    line(p, px + 2, GUNWALE - 13, hx, hy, 0, 4);
    line(p, px + 2, GUNWALE - 13, hx, hy, BONE, 2);
    line(p, hx, hy, ex, ey, BONE, 2);
    line(p, lx + pose.bx * 0.7, ly + pose.by * 0.7, ex, ey, BONE, 4);
    // the sea closes over the keel: a black gap, then rows of waves, each sliding astern at its own pace
    for (let r = 0; r < 3; r++) {
      const y0 = SEA_TOP + r * 4;
      for (let x = 0; x < W; x++) {
        const c = (((x + Math.floor(u * [4, 7, 10][r]) + r * 4) % 8) + 8) % 8;
        for (let j = -2; j < 4; j++) if (r === 0 && !(p[(y0 + j) * W + x] === BONE)) set(p, x, y0 + j, 0);
        for (let j = 0; j < 3; j++) if (WAVE[j][c] === "#" && p[(y0 + j) * W + x] !== BONE) set(p, x, y0 + j, SEA);
      }
    }
    return emit(p, color);
  };
}
