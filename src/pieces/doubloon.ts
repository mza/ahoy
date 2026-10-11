/*
 * doubloon: one fat gold coin with a skull struck on it, turning about its
 * upright axis the way a coin turns in an old arcade game: face on, narrowing,
 * edge on, widening to the cross on its back, and round again. Each time the
 * skull comes to the front it holds a beat and a sparkle pops on the rim.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in three flat colours. Every pose is drawn afresh from the coin's
 * geometry, squeezed sideways: a milled rim of one-pixel ticks, a groove, a
 * ring of dots, and the stamp with a black line round it, so it reads in one
 * ink.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "doubloon",
  category: "scenes",
  note: "a gold coin stamped with a skull, spinning, sparkling as it faces you",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // gold, its shade, and bone for the shine
  palette: ["#f2b632", "#a8741a", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const GOLD = 1, DARK = 2, BONE = 3;

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
// A sprite with a black gap `gap` pixels wide cut all round it first.
const stamp = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>, scale = 1, gap = 2) => {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== ".") rect(p, x + i * scale - gap, y + j * scale - gap, scale + 2 * gap, scale + 2 * gap, 0);
    }),
  );
  sprite(p, x, y, rows, keys, scale);
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

// ---- the coin

const CX = 40, CY = 32, R = 30;
const SK = 0.84, SY = -3; // the skull's size, against one 35 pixels wide, and how far its cranium sits from the middle
const SPARKLE = [
  ["......#......", "......#......", "......#......", "......#......", "....#.#.#....", ".....###.....", "#############", ".....###.....", "....#.#.#....", "......#......", "......#......", "......#......", "......#......"],
  ["....#....", "....#....", "....#....", "...###...", "#########", "...###...", "....#....", "....#....", "....#...."],
  ["..#..", "..#..", "#####", "..#..", "..#.."],
];
// The turn: how wide the coin shows (0 is edge on), which face, and which side its thickness shows on.
const POSES = [
  { w: 1, back: false, edge: 0, hold: 0.6 },
  { w: 0.62, back: false, edge: 1, hold: 0.1 },
  { w: 0, back: false, edge: 0, hold: 0.1 },
  { w: 0.62, back: true, edge: -1, hold: 0.1 },
  { w: 1, back: true, edge: 0, hold: 0.2 },
  { w: 0.62, back: true, edge: 1, hold: 0.1 },
  { w: 0, back: false, edge: 0, hold: 0.1 },
  { w: 0.62, back: false, edge: -1, hold: 0.1 },
];
const LOOP = POSES.reduce((s, q) => s + q.hold, 0);

// What is struck at a point of a face, measured from its middle: 0 the flat field, 1 the raised stamp, 2 a hollow in it.
const skullAt = (u: number, v: number) => {
  const x = Math.abs(u) / SK, y = (v - SY) / SK;
  const bone = (x / 17.5) ** 2 + (y / 15.5) ** 2 < 1 || ((x - 12) / 3.6) ** 2 + ((y - 9) / 3.2) ** 2 < 1 || (x < 10.5 && y >= 10 && y < 24);
  if (!bone) return 0;
  // the sockets, each under a brow that slants down towards the nose, and the nose
  const out = x - 8;
  if ((out / 5.7) ** 2 + ((y - 3) / 5.3) ** 2 < 1 && y >= -2.5 + 0.3 * (5.7 - out)) return 2;
  if (y >= 10 && y < 15.5 && x < (y - 10) * 0.55 + 0.6 && !(y >= 13 && x < 0.6)) return 2;
  return 1;
};
const crossAt = (u: number, v: number) => {
  const a = Math.abs(u), b = Math.abs(v), along = Math.max(a, b), across = Math.min(a, b);
  // four arms flaring to their ends, and a pellet in each corner between them
  if (along < 16 && across < 2.5 + Math.max(0, along - 8) * 0.55) return 1;
  if (Math.hypot(a - 9.5, b - 9.5) < 2.3) return 1;
  return 0;
};

// The coin turned to show `w` of its width, its thickness a sliver of shade on one side.
const coin = (w: number, back: boolean, edge: number) => {
  const p = new Uint8Array(W * H);
  if (w === 0) {
    // edge on: a bar with rounded ends, milled across
    rect(p, CX - 3, CY - R + 1, 6, 2 * R - 2, DARK);
    rect(p, CX - 2, CY - R, 4, 2 * R, DARK);
    rect(p, CX - 2, CY - R + 2, 2, 2 * R - 4, GOLD);
    for (let y = CY - R + 3; y < CY + R - 2; y += 3) rect(p, CX - 3, y, 6, 1, 0);
    return p;
  }
  const mid = CX - edge * 2;
  // zones: 0 off the coin, 1 the milled edge, 2 the rim, 3 the field, 4 the stamp, 5 a hollow in the stamp
  const zone = new Uint8Array(W * H);
  const at = (x: number, y: number) => {
    const u = (x + 0.5 - mid) / w, v = y + 0.5 - CY, d = Math.hypot(u, v);
    if (d >= R) return 0;
    if (d >= 26.8) return 1;
    if (d >= 23.5) return 2;
    const k = back ? crossAt(u, v) : skullAt(u, v);
    return k ? 3 + k : 3;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) zone[y * W + x] = at(x, y);
  const z = (x: number, y: number) => (x < 0 || x >= W || y < 0 || y >= H ? 0 : zone[y * W + x]);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - mid) / w, v = y + 0.5 - CY, k = z(x, y);
      if (!k) {
        // the thickness, behind the face
        const d = Math.hypot((x + 0.5 - mid - edge * 4) / w, v);
        if (edge && d < R) p[y * W + x] = y % 3 === 0 && d > 27.5 && d < 29 ? 0 : DARK;
        continue;
      }
      const lit = u + v < 24;
      let ink = lit ? GOLD : DARK;
      if (k === 1) {
        // one-pixel ticks all the way round
        const a = (Math.atan2(v, u) / (2 * Math.PI)) * 64;
        if (a - Math.floor(a) < 0.34 && Math.hypot(u, v) < 29) ink = 0;
      } else if (k === 2) {
        const d = Math.hypot(u, v);
        if (d >= 24.5 && d < 26 && u + v < -29 && u < v + 14) ink = BONE; // the shine
        ink = lit || ink === BONE ? ink : DARK;
      } else if (k === 3) {
        ink = GOLD;
        // the groove inside the rim, the line round the stamp, and a ring of dots
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([i, j]) => z(x + i, y + j) === 2 || z(x + i, y + j) === 4)) ink = 0;
        const d = Math.hypot(u, v), a = (Math.atan2(v, u) / (2 * Math.PI)) * 24;
        if (Math.abs(d - 21.2) < 0.75 && Math.abs(a - Math.round(a)) < 0.13) ink = DARK;
      } else if (k === 4) ink = DARK;
      else ink = 0;
      p[y * W + x] = ink;
    }
  if (!back) {
    // the mouth, the gaps between the teeth, and a crack in the crown: one pixel each, whatever the turn
    const X = (u: number) => Math.floor(mid + u * SK * w), Y = (v: number) => Math.floor(CY + SY + v * SK);
    for (let x = X(-8); x <= X(8); x++) set(p, x, Y(16.5), 0);
    for (const g of [-6, -2, 2, 6]) for (let y = Y(16.5); y < Y(24); y++) set(p, X(g), y, 0);
    for (const [u, v] of [[6, -15], [6, -14], [5, -13], [6, -12], [7, -11], [6, -10]]) set(p, X(u), Y(v), 0);
  }
  return p;
};

export default function doubloon(): Frame {
  // every pose is drawn once, here
  const poses = POSES.map((q) => coin(q.w, q.back, q.edge));

  return (t, { color } = {}) => {
    let u = ((t % LOOP) + LOOP) % LOOP, i = 0;
    while (i < POSES.length - 1 && u >= POSES[i].hold) u -= POSES[i++].hold;
    const p = new Uint8Array(poses[i]);
    // facing front: a sparkle on the rim, big, then smaller, then gone
    if (i === 0 && u < 0.45) {
      const s = u < 0.2 ? 0 : u < 0.33 ? 1 : 2, n = SPARKLE[s].length >> 1;
      stamp(p, CX - 20 - n, CY - 20 - n, SPARKLE[s], { "#": BONE }, 1, 1);
    }
    return emit(p, color);
  };
}
