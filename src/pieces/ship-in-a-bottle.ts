/*
 * ship-in-a-bottle: a corked bottle lying on its side on a little wooden stand,
 * a tiny three-masted ship inside it on a strip of sea. The ship rocks, her
 * masts swaying a pixel or two either way, the sea slides under her, and a
 * glint runs along the glass.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours: the glass a rounded outline with a thin
 * highlight inside it, the ship with her sails shaded down their right-hand
 * edges, stays between her mastheads, a jib and a seam along her hull. It
 * reads in one ink too.
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
  // ghost cyan glass, sea blue, wood, bone's shade, bone
  palette: ["#5fd7c9", "#3a7ca5", "#a8703a", "#b9b2a0", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const GLASS = 1, SEA = 2, WOOD = 3, SHADE = 4, BONE = 5;

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

const CY = 27.5; // the bottle's axis
// Half the bottle's height at each column: a base with rounded corners, a long body, a shoulder curving in to the neck, a lip.
const half = (x: number) => {
  if (x < 2 || x > 73) return 0;
  if (x < 9) return 14 + Math.sqrt(49 - (9 - x) ** 2);
  if (x < 46) return 21;
  if (x < 62) return 6 + 15 * (0.5 + 0.5 * Math.cos(((x - 46) / 16) * Math.PI));
  return x < 70 ? 6 : 8;
};
// The masts, from the stern: where each stands, where it tops out, and how wide its topsail and course are.
const MASTS = [
  { x: 17, top: 15, w: 3 },
  { x: 28, top: 11, w: 4 },
  { x: 39, top: 14, w: 3 },
];
const DECK = 35;
// A swell, sixteen pixels long: how far below its crest the water is at each pixel.
const SWELL = Array.from({ length: 16 }, (_, i) => Math.round(0.5 - 0.5 * Math.cos((i / 16) * 2 * Math.PI)));
const LOOP = 6;

export default function shipInABottle(): Frame {
  const shape = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.abs(y + 0.5 - CY) < half(x)) shape[y * W + x] = 1;
  // what never moves: the glass as an outline, the highlight inside it, the cork, the stand
  const still = new Uint8Array(W * H);
  const glass = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (shape[y * W + x] && !within(shape, x, y, 2) && !(x > 71 && Math.abs(y + 0.5 - CY) < 6)) still[y * W + x] = glass[y * W + x] = GLASS;
  rect(still, 10, 10, 12, 1, GLASS);
  rect(still, 34, 10, 4, 1, GLASS);
  rect(still, 5, 14, 1, 8, GLASS);
  // the cork: a plug in the mouth and a wider head outside it, pitted
  rect(still, 67, 24, 7, 8, WOOD);
  rect(still, 74, 22, 4, 12, WOOD);
  rect(still, 78, 23, 1, 10, WOOD);
  for (const [x, y] of [[69, 26], [72, 29], [76, 25], [75, 30], [77, 28]]) set(still, x, y, 0);
  // the stand: two cradles cut to the bottle's round, on a plank with feet
  for (const x0 of [4, 45])
    for (let y = 40; y < 56; y++)
      for (let x = x0; x < x0 + 9; x++) {
        let clear = true;
        for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (shape[(y + j) * W + x + i]) clear = false;
        if (clear) still[y * W + x] = WOOD;
      }
  rect(still, 2, 56, 54, 3, WOOD);
    rect(still, 4, 60, 50, 1, WOOD);
  rect(still, 5, 61, 6, 2, WOOD);
  rect(still, 47, 61, 6, 2, WOOD);

  // the ship, upright, on a canvas of her own
  const ship = new Uint8Array(W * H);
  for (const m of MASTS) {
    // a topsail and a course, each a little fuller at the foot, a pixel of black between them and the mast showing through
    for (let j = 0; j < 6; j++) rect(ship, m.x - m.w + (j < 1 ? 1 : 0), m.top + 2 + j, 2 * m.w + 1 - (j < 1 ? 2 : 0), 1, BONE);
    for (let j = 0; j < 9; j++) rect(ship, m.x - m.w - 1 + (j < 1 ? 1 : 0), m.top + 9 + j, 2 * m.w + 3 - (j < 1 ? 2 : 0), 1, BONE);
    rect(ship, m.x, m.top + 4, 1, 3, SHADE);
    rect(ship, m.x, m.top + 11, 1, 6, SHADE);
  }
  // the jib, down to the bowsprit
  poly(ship, [[45, 19], [45, 31], [51, 31]], BONE);
  for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) if (ship[y * W + x] === BONE && !ship[y * W + x + 1]) ship[y * W + x] = SHADE;
  for (const m of MASTS) {
    rect(ship, m.x, m.top, 1, 2, WOOD);
    rect(ship, m.x, m.top + 8, 1, 1, WOOD);
    rect(ship, m.x, m.top + 18, 1, DECK - m.top - 18, WOOD);
  }
  // stays: masthead to masthead, down to the stern, and out to the bowsprit's tip
  line(ship, 18, 15, 27, 11, SHADE), line(ship, 29, 11, 38, 14, SHADE);
  line(ship, 16, 16, 10, 31, SHADE), line(ship, 40, 14, 52, 32, SHADE);
  // the hull: a high stern, a seam along her side, a row of ports, the bowsprit
  for (let y = 31; y < 42; y++)
    for (let x = 8; x < 49; x++) if (y >= (x < 14 ? 32 : x > 43 ? 34 : DECK) && x >= 8 + Math.max(0, y - 36) && x <= 48 - Math.max(0, y - 34) * 1.2) set(ship, x, y, WOOD);
  rect(ship, 10, 37, 34, 1, 0);
  for (let x = 14; x < 44; x += 5) set(ship, x, 39, 0);
  line(ship, 47, 34, 53, 32, WOOD);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the ship, leaning from her waterline: the higher the row, the further it slides
    const s = [0, 1, 0, -1][Math.floor(u / 0.75) % 4];
    for (let y = 8; y < 42; y++) {
      const dx = Math.round((s * (40 - y)) / 11);
      for (let x = 6; x < 56; x++) if (ship[y * W + x]) set(p, x + dx, y, ship[y * W + x]);
    }
    // the sea inside: a crest line sliding along, foam on it here and there, water below
    const off = Math.floor(u * 8);
    for (let x = 0; x < 62; x++) {
      const i = (x + off) % 16, top = 41 + SWELL[i];
      for (let y = top; y < 48; y++) if (within(shape, x, y, 3)) set(p, x, y, y === top && i > 13 && Math.floor((x + off) / 16) % 2 ? BONE : SEA);
    }
    // the glint: a slanted band of bone crossing the glass from end to end, twice a loop
    const g = (30 + u * 40) % 120 - 10;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) if (glass[y * W + x] && x + y / 2 >= g && x + y / 2 < g + 8) p[y * W + x] = BONE;
    return emit(p, color);
  };
}
