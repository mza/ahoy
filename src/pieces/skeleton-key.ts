/*
 * skeleton-key: a big old iron key lying on its side, its bow (the handle) a
 * skull, a long shank with turned collars on it, and a toothed bit hanging
 * from the far end. It bobs a pixel up and down, a glint runs along the iron
 * from the skull to the teeth, and a sparkle winks in one eye socket.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in three flat colours. The key is drawn once, all in iron so it
 * reads as one thing, shaded down its right-hand edges; the glint is a
 * slanted band of bone that crosses it.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "skeleton key",
  category: "scenes",
  note: "an old iron key with a skull for a handle, a glint running along it",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // iron, its shade, and bone for the glint
  palette: ["#8a94a6", "#59616f", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, SHADE = 2, BONE = 3;

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

// ---- the key

const SX = 17, SY = 27, SK = 0.8; // the middle of the skull's cranium, and its size against one 35 pixels wide
const MID = 30; // the pixel row down the middle of the shank
// The shank, column by column from the skull's cheek: how far it reaches either side of its middle row.
const TURNED = "224555422222222222455422222222222222222222222332";
const BIT = [
  "###############",
  "####..####..###",
  "####..####..###",
  "####..####..###",
  "####..####..###",
  "####..####..#..",
  "..##..####..#..",
  "..##..####..###",
  "..##..####..###",
  "####........###",
  "####........###",
  "####........###",
  "####........###",
];
const SPARKLE = [
  ["..#..", "..#..", "#####", "..#..", "..#.."],
  ["...#...", "...#...", "...#...", "#######", "...#...", "...#...", "...#..."],
  ["....#....", "....#....", "..#.#.#..", "...###...", "#########", "...###...", "..#.#.#..", "....#....", "....#...."],
  ["...#...", "...#...", "...#...", "#######", "...#...", "...#...", "...#..."],
  ["..#..", "..#..", "#####", "..#..", "..#.."],
];
const LOOP = 3.6, RUN = 1.5; // seconds a loop, and seconds the glint takes to cross

// The skull, face on, drawn a pixel at a time from its curves.
const skull = (p: Uint8Array) => {
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const x = Math.abs(px + 0.5 - SX) / SK, y = (py + 0.5 - SY) / SK;
      if (!((x / 17.5) ** 2 + (y / 15.5) ** 2 < 1 || ((x - 12) / 3.6) ** 2 + ((y - 9) / 3.2) ** 2 < 1 || (x < 10.5 && y >= 10 && y < 24))) continue;
      // the sockets, each under a brow that slants down towards the nose, and the nose
      const out = x - 8;
      if ((out / 5.7) ** 2 + ((y - 3) / 5.3) ** 2 < 1 && y >= -2.5 + 0.3 * (5.7 - out)) continue;
      if (y >= 10 && y < 15.5 && x < (y - 10) * 0.55 + 0.6 && !(y >= 13 && x < 0.6)) continue;
      p[py * W + px] = IRON;
    }
  // the mouth, the gaps between the teeth, and a crack in the crown
  const X = (u: number) => Math.floor(SX + u * SK), Y = (v: number) => Math.floor(SY + v * SK);
  for (let x = X(-8); x <= X(8); x++) set(p, x, Y(16.5), 0);
  for (const g of [-6, -2, 2, 6]) for (let y = Y(16.5); y < Y(24); y++) set(p, X(g), y, 0);
  for (const [u, v] of [[-6, -15], [-6, -14], [-5, -13], [-6, -12], [-7, -11], [-6, -10]]) set(p, X(u), Y(v), 0);
};

export default function skeletonKey(): Frame {
  // what never changes: the key
  const still = new Uint8Array(W * H);
  skull(still);
  // the shank out of the skull's cheek, turned on a lathe, and the bit hanging from its end
  const x0 = SX + 12;
  [...TURNED].forEach((c, i) => rect(still, x0 + i, MID - Number(c), 1, 2 * Number(c) + 1, IRON));
  sprite(still, x0 + 29, MID + 3, BIT, { "#": IRON });
  // iron's right-hand edges in its shade, as if lit from the left
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (still[y * W + x] === IRON && (x === W - 1 || !still[y * W + x + 1])) still[y * W + x] = SHADE;

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    // the bob: down a pixel for half of every loop
    const dy = u < LOOP / 2 ? 0 : 1;
    // the glint: a slanted band of bone crossing the iron from the skull to the teeth
    const g = -30 + (((u + 0.9) % LOOP) / RUN) * 120;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let k = still[y * W + x];
        if (!k) continue;
        if (Math.abs(x + (y - MID) - g) < 1.5) k = BONE;
        set(p, x, y + dy, k);
      }
    // a sparkle in one eye socket, now and then
    const s = Math.floor((u - 2.2) / 0.1);
    if (s >= 0 && s < SPARKLE.length) {
      const n = SPARKLE[s].length >> 1;
      sprite(p, SX + 6 - n, SY + 2 + dy - n, SPARKLE[s], { "#": BONE });
    }
    return emit(p, color);
  };
}
