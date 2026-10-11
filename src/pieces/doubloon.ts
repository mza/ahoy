/*
 * doubloon: one fat gold coin with a skull struck on it, turning about its
 * upright axis the way a coin turns in an old arcade game: face on, narrowing,
 * edge on, widening to the cross on its back, and round again. Each time the
 * skull comes to the front it holds a beat and a sparkle pops on the rim.
 *
 * Pixel art in block elements, two square pixels a cell, in three flat
 * colours. Both faces are drawn once, face on, and squeezed sideways for the
 * turned poses. Black gaps keep the stamp off the gold, so it reads in one ink.
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
const SKULL = [
  "..#######..",
  ".#########.",
  "###########",
  "#___###___#",
  "#___###___#",
  "#####_#####",
  ".#########.",
  "..#_#_#_#..",
  "..#######..",
];
const CROSS = [
  "....#####....",
  "....#####....",
  ".....###.....",
  ".....###.....",
  "##...###...##",
  "#############",
  "#############",
  "#############",
  "##...###...##",
  ".....###.....",
  ".....###.....",
  "....#####....",
  "....#####....",
];
const SPARKLE = [
  ["...#...", "...#...", "..###..", "#######", "..###..", "...#...", "...#..."],
  ["..#..", "..#..", "#####", "..#..", "..#.."],
  [".#.", "###", ".#."],
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

// One face of the coin, face on: a raised rim, a groove inside it, and the stamp.
const face = (back: boolean) => {
  const p = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - CX, dy = y + 0.5 - CY, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      let k = GOLD;
      if (d >= 24 && d < 26) k = 0; // the groove
      else if (d >= 26 && dx + dy > 22) k = DARK; // the rim in shade, down and to the right
      else if (d >= 27 && d < 29 && dx + dy < -34) k = BONE; // and its shine
      p[y * W + x] = k;
    }
  if (back) stamp(p, CX - 13, CY - 13, CROSS, { "#": DARK }, 2);
  else stamp(p, CX - 16, CY - 14, SKULL, { "#": DARK }, 3);
  return p;
};

// A face squeezed to `w` of its width, its thickness showing as a sliver of shade on one side.
const turned = (src: Uint8Array, w: number, edge: number) => {
  const p = new Uint8Array(W * H);
  if (w === 0) {
    // edge on: a bar with rounded ends
    rect(p, CX - 3, CY - R + 1, 6, 2 * R - 2, DARK);
    rect(p, CX - 2, CY - R, 4, 2 * R, DARK);
    rect(p, CX - 2, CY - R + 2, 2, 2 * R - 4, GOLD);
    return p;
  }
  const mid = CX - edge * 2;
  for (let y = 0; y < H; y++) {
    const dy = y + 0.5 - CY;
    if (Math.abs(dy) >= R) continue;
    const half = Math.sqrt(R * R - dy * dy) * w;
    for (let x = 0; x < W; x++) {
      const fx = x + 0.5 - mid;
      if (Math.abs(fx - edge * 4) < half) p[y * W + x] = DARK;
      if (Math.abs(fx) < half) p[y * W + x] = src[y * W + Math.min(W - 1, Math.max(0, Math.floor(CX + fx / w)))];
    }
  }
  return p;
};

export default function doubloon(): Frame {
  // every pose is drawn once, here
  const faces = [face(false), face(true)];
  const poses = POSES.map((q) => (q.w === 1 ? faces[q.back ? 1 : 0] : turned(faces[q.back ? 1 : 0], q.w, q.edge)));

  return (t, { color } = {}) => {
    let u = ((t % LOOP) + LOOP) % LOOP, i = 0;
    while (i < POSES.length - 1 && u >= POSES[i].hold) u -= POSES[i++].hold;
    const p = new Uint8Array(poses[i]);
    // facing front: a sparkle on the rim, big, then smaller, then gone
    if (i === 0 && u < 0.45) {
      const s = u < 0.2 ? 0 : u < 0.33 ? 1 : 2, n = SPARKLE[s].length;
      stamp(p, CX - 21 - n, CY - 21 - n, SPARKLE[s], { "#": BONE }, 2, 1);
    }
    return emit(p, color);
  };
}
