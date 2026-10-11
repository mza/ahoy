/*
 * skeleton-key: a big old iron key lying on its side, its bow (the handle) a
 * skull, a long shank with two collars on it, and three chunky teeth hanging
 * from the far end. It bobs a cell up and down, a glint runs along the iron
 * from the skull to the teeth, and a sparkle winks in one eye socket.
 *
 * Pixel art in block elements, two square pixels a cell, in three flat
 * colours. The key is drawn once, all in iron so it reads as one thing; the
 * glint is a slanted band of bone that crosses it.
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

const SKULL = [
  "...########...",
  ".############.",
  "##############",
  "##############",
  "##____##____##",
  "##____##____##",
  "##____##____##",
  "######__######",
  ".############.",
  "..##########..",
  "..#_##__##_#..",
  "..#_##__##_#..",
  "...########...",
];
const TEETH = [12, 8, 12]; // how far each tooth hangs below the shank
const SPARKLE = [
  [".#.", "###", ".#."],
  ["..#..", "..#..", "#####", "..#..", "..#.."],
  [".#.", "###", ".#."],
];
const X0 = 4, Y0 = 18; // the skull's top left corner
const MID = Y0 + 12; // the pixel row the shank's top edge runs along
const LOOP = 3.6, RUN = 1.5; // seconds a loop, and seconds the glint takes to cross

export default function skeletonKey(): Frame {
  // what never changes: the key
  const still = new Uint8Array(W * H);
  sprite(still, X0, Y0, SKULL, { "#": IRON }, 2);
  // the shank out of the side of the skull, two collars on it, and the teeth hanging from its end
  rect(still, X0 + 28, MID, 44, 6, IRON);
  rect(still, X0 + 28, MID + 4, 28, 2, SHADE);
  for (const x of [X0 + 32, X0 + 48]) {
    rect(still, x, MID - 4, 4, 14, IRON);
    rect(still, x, MID + 8, 4, 2, SHADE);
  }
  TEETH.forEach((n, i) => {
    rect(still, X0 + 56 + 6 * i, MID + 6, 4, n, IRON);
    rect(still, X0 + 56 + 6 * i, MID + 4 + n, 4, 2, SHADE);
  });
  // the jaw in shade
  for (let y = Y0 + 24; y < Y0 + 26; y++) for (let x = 0; x < X0 + 28; x++) if (still[y * W + x]) still[y * W + x] = SHADE;

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    // the bob: down a cell (two pixels, so the shading keeps its edges) for half of every loop
    const dy = u < LOOP / 2 ? 0 : 2;
    // the glint: a slanted band of bone crossing the iron from the skull to the teeth
    const g = -30 + (((u + 0.9) % LOOP) / RUN) * 120;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let k = still[y * W + x];
        if (!k) continue;
        if (Math.abs(x + (y - MID) - g) < 2.5) k = BONE;
        set(p, x, y + dy, k);
      }
    // a sparkle in one eye socket, now and then
    const s = Math.floor((u - 2.2) / 0.12);
    if (s >= 0 && s < SPARKLE.length) {
      const n = SPARKLE[s].length;
      sprite(p, X0 + 21 - n, Y0 + 11 + dy - n, SPARKLE[s], { "#": BONE }, 2);
    }
    return emit(p, color);
  };
}
