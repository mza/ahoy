/*
 * sea-serpent: a sea serpent swimming along the surface, side-on: a tail at one
 * end, a row of humps arching out of the water, and a head held high on its
 * neck at the other. The humps rise and fall one after the other in a wave
 * that runs down its length, the head bobs, the tongue flicks, and the sea
 * scrolls by underneath.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * A black gap keeps the serpent off the water, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sea serpent",
  category: "scenes",
  note: "a green sea serpent, its humps rising and falling as it swims",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sea blue, serpent green, tongue red, bone for its eye
  palette: ["#3a7ca5", "#4fa35a", "#e23a2e", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const SEA = 1, GREEN = 2, RED = 3, BONE = 4;

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
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---- the serpent, swimming right

const WATER = 46;
const KEYS = { g: GREEN, b: BONE, r: RED };
// two pixels to each of these; the tongue is the last three columns
const HEAD = [
  "...gggg......",
  "..ggggggg....",
  ".ggb_ggggggg.",
  ".gggggggggg.r",
  ".gggg___rrrr.",
  ".ggggggggg..r",
  "..ggggggg....",
];
const HEAD_X = 53, HEAD_Y = 8;
const HUMPS = [18, 32, 46];
const BEAT = 1.6, LOOP = 4.8;

export default function seaSerpent(): Frame {
  // the head and neck, drawn once with the tongue in and once with it out, then set down wherever they bob to
  const heads = [false, true].map((tongue) => {
    const p = new Uint8Array(W * H);
    const top = HEAD_Y + HEAD.length * 2;
    for (let y = top - 2; y < H; y++) {
      const x = Math.round(59 - 4 * Math.sin((Math.PI * (y - top)) / (WATER - top)));
      rect(p, x, y, 8, 1, GREEN);
      // spines down the back of the neck
      if (y % 6 < 2 && y > top && y < 36) rect(p, x - 2, y, 2, 1, GREEN);
    }
    sprite(p, HEAD_X, HEAD_Y, tongue ? HEAD : HEAD.map((r) => r.replace(/r/g, ".")), KEYS, 2);
    return p;
  });

  return (t, { color } = {}) => {
    const u = mod(t, LOOP), a = (u / BEAT) * 2 * Math.PI;
    const p = new Uint8Array(W * H);

    // the humps: arches whose height follows a wave running from the head back to the tail
    HUMPS.forEach((x, i) => {
      const h = 12 + Math.round(4 * Math.sin(a + i * 1.3));
      disc(p, x, WATER - 2, 6.5, h, GREEN);
      if (h > 8) disc(p, x, WATER - 2, 2, h - 5, 0);
    });
    // the tail, flicking
    const flick = Math.round(2 * Math.sin(a - 1.3));
    line(p, 8, WATER, 5, 39, GREEN, 3);
    line(p, 5, 39, 6 + flick, 33, GREEN, 3);
    sprite(p, 3 + flick, 26, ["...g...", "..ggg..", ".ggggg.", "ggggggg", "..ggg..", "..ggg..", "..ggg..", "..ggg.."], KEYS, 1);
    // the head and neck, bobbing by a cell
    const bob = 2 * Math.round(Math.sin(a + 3.9));
    const head = heads[u >= 2 && u < 2.6 ? 1 : 0];
    for (let y = 0; y < H; y++) {
      const from = y - bob;
      if (from >= 0 && from < H) for (let x = 0; x < W; x++) if (head[from * W + x]) p[y * W + x] = head[from * W + x];
    }

    // the sea covers the rest: a black gap, a stepped line for its surface,
    // and rows of short crests under it, all drifting back
    rect(p, 0, WATER - 2, W, H - WATER + 2, 0);
    const s0 = Math.floor(t * 8);
    for (let x = 0; x < W; x++) rect(p, x, WATER + (mod(x - s0, 12) < 6 ? 0 : 2), 1, 2, SEA);
    [[54, 6, 0, 20], [62, 10, 10, 20]].forEach(([y, v, off, gap]) => {
      const s = Math.floor(t * v) + off;
      for (let x = 0; x < W; x++) {
        const m = mod(x - s, gap);
        if (m < 8) rect(p, x, y - (m >= 2 && m < 6 ? 2 : 0), 1, 2, SEA);
      }
    });
    return emit(p, color);
  };
}
