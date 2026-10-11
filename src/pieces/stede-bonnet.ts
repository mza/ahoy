/*
 * stede-bonnet: the flag of Stede Bonnet, "the Gentleman Pirate": a skull over
 * a single bone, between a dagger and a heart. The heart beats and lets a drop
 * fall now and then, and a glint runs down the dagger.
 *
 * Drawn from the flag credited to Bonnet in the early 1700s (public domain),
 * as pixel art in block elements, two square pixels a cell, in flat colour.
 * Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "stede bonnet",
  category: "scenes",
  note: "the gentleman pirate's flag: a skull and bone between dagger and heart",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, steel, blood, and blood as the heart beats
  palette: ["#e8e2d0", "#8a94a6", "#e23a2e", "#ff5a4d"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, STEEL = 2, BLOOD = 3, HOT = 4;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
};
const disc = (p: Uint8Array, cx: number, cy: number, rx: number, ry: number, k: number) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) set(p, x, y, k);
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

// ---- the flag

const SKULL = [
  "....#######....",
  "..###########..",
  ".#############.",
  "###############",
  "###############",
  "##___#####___##",
  "##____###____##",
  "##____###____##",
  "###__##_##__###",
  ".#####___#####.",
  "..###########..",
  "...#_#_#_#_#...",
  "...#########...",
];
const HEART = [
  ".##.##.",
  "#######",
  "#######",
  ".#####.",
  "..###..",
  "...#...",
];
const SX = 18, SY = 3; // the skull's top left pixel, three pixels to each of its own
const HX = 65, HY = 18; // the heart's, two to each
const DX = 8; // the dagger's middle column
const BEAT_EVERY = 1.2; // seconds between heartbeats, the first of them a little way in
const SWELL = [[0, 0.12], [0.24, 0.36]]; // when in a beat the heart is swollen: lub, dub
const LOOP = 4 * BEAT_EVERY;
const GLINT = [1.5, 2.3]; // when in the loop the glint runs down the blade

export default function stedeBonnet(): Frame {
  // what never moves: the skull, the bone under it and the dagger
  const still = new Uint8Array(W * H);
  sprite(still, SX, SY, SKULL, { "#": BONE }, 3);
  // the bone: a shaft with two knuckles at each end
  rect(still, 12, 50, 57, 5, BONE);
  for (const x of [12, 68]) for (const y of [49, 55]) disc(still, x, y, 4.5, 4.5, BONE);
  // the dagger, point up: a blade narrowing to its tip, a guard, a grip and a pommel
  for (let y = 6; y < 30; y++) {
    const half = Math.min(2, Math.floor((y - 6) / 2));
    rect(still, DX - half, y, 2 * half + 1, 1, STEEL);
  }
  rect(still, DX - 6, 30, 13, 2, BONE);
  rect(still, DX - 1, 33, 3, 5, BONE);
  disc(still, DX, 40, 2.6, 2.6, BONE);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, b = (u + 0.6) % BEAT_EVERY;
    const p = new Uint8Array(W * H);
    p.set(still);

    // the heart, a pixel bigger all round when it swells
    const swollen = SWELL.some(([a, z]) => b >= a && b < z);
    if (swollen) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) sprite(p, HX + dx, HY + dy, HEART, { "#": HOT }, 2);
    sprite(p, HX, HY, HEART, { "#": swollen ? HOT : BLOOD }, 2);
    rect(p, HX + 2, HY + 3, 2, 2, BONE);

    // a drop from its point, every other beat: it gathers, falls faster and faster, and is gone
    const d = u % (2 * BEAT_EVERY);
    if (d > 0.5 && d < 0.9) rect(p, HX + 6, HY + 13, 2, 2, BLOOD);
    else if (d >= 0.9 && d < 1.7) {
      const k = (d - 0.9) / 0.8;
      rect(p, HX + 6, HY + 13 + Math.round(30 * k * k), 2, 3, BLOOD);
    }

    // the glint: two bone pixels running down the blade from its tip
    if (u >= GLINT[0] && u < GLINT[1]) {
      const y = 8 + Math.round(((u - GLINT[0]) / (GLINT[1] - GLINT[0])) * 19);
      for (let j = 0; j < 4; j++) if (p[(y + j) * W + DX] === STEEL) set(p, DX - (j >> 1), y + j, BONE);
    }
    return emit(p, color);
  };
}
