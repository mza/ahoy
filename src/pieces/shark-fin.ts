/*
 * shark-fin: a big shark's back fin cutting through the sea, seen side-on.
 * It slides across with a wake of foam behind it, dips under, comes up
 * facing the other way and slides back, over rows of scrolling waves.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * Black gaps keep the fin off the water, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "shark fin",
  category: "scenes",
  note: "a shark's fin cutting through pixel waves, diving and turning back",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sea blue, iron and its shade, foam bone
  palette: ["#3a7ca5", "#8a94a6", "#59616f", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const SEA = 1, IRON = 2, SHADE = 3, BONE = 4;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
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

// ---- the fin: row by row from its tip, where its trailing and leading edges are

const WATER = 46, FH = 42, FW = 40;
// Swimming right: the tip hooks back, the front edge bellies forward, the back edge is hollow.
const EDGES: [number, number][] = Array.from({ length: FH }, (_, j) => {
  const u = (j + 0.5) / FH;
  return [Math.round(9 - 9 * u * u + 7 * Math.sin(Math.PI * u)), Math.round(9 + 30 * u ** 0.72)];
});

// ---- the swim: [seconds, where the middle of the fin is, how far it has sunk, which way it faces]

const SWIM: [number, number, number, number][] = [
  [0, 40, 0, 1],
  [1.8, 58, 0, 1],
  [2.8, 68, FH, 1],
  [4, 68, FH, -1],
  [5, 58, 0, -1],
  [9, 18, 0, -1],
  [10, 8, FH, -1],
  [11.2, 8, FH, 1],
  [12.2, 18, 0, 1],
  [14.4, 40, 0, 1],
];
const LOOP = 14.4;

export default function sharkFin(): Frame {
  return (t, { color } = {}) => {
    const u = mod(t, LOOP);
    const p = new Uint8Array(W * H);

    // the sea: a stepped line for its surface, rows of short crests under it, each drifting at its own pace
    const s0 = Math.floor(t * 6);
    for (let x = 0; x < W; x++) rect(p, x, WATER + (mod(x + s0, 12) < 6 ? 0 : 2), 1, 2, SEA);
    [[54, -4, 0, 20], [62, 9, 10, 20]].forEach(([y, v, off, gap]) => {
      const s = Math.floor(t * v) + off;
      for (let x = 0; x < W; x++) {
        const m = mod(x + s, gap);
        if (m < 8) rect(p, x, y - (m >= 2 && m < 6 ? 2 : 0), 1, 2, SEA);
      }
    });

    // where the fin is now
    let i = 0;
    while (i < SWIM.length - 2 && u >= SWIM[i + 1][0]) i++;
    const [t0, x0, d0, dir] = SWIM[i], [t1, x1, d1] = SWIM[i + 1];
    const k = (u - t0) / (t1 - t0);
    const cx = Math.round(x0 + (x1 - x0) * k), sunk = Math.round(d0 + (d1 - d0) * k);
    const shown = FH - sunk;
    if (shown > 2) {
      const fx = (x: number) => (dir > 0 ? cx - FW / 2 + x : cx + FW / 2 - 1 - x);
      // a black gap in the surface under the fin, then the fin down to just above the water
      const a = EDGES[shown - 1][0], b = EDGES[shown - 1][1];
      for (let x = a - 2; x <= b + 2; x++) rect(p, fx(x), WATER, 1, 4, 0);
      for (let j = 0; j < shown - 2; j++) {
        const y = WATER - shown + j;
        const [e0, e1] = EDGES[j];
        for (let x = e0; x <= e1; x++) set(p, fx(x), y, x < e0 + 4 && j > 3 ? SHADE : IRON);
      }
      // foam where it cuts the water, and a wake of it trailing off behind
      const len = Math.min(26, shown);
      for (let x = a - 1; x <= b + 3; x++) rect(p, fx(x), WATER, 1, 2, BONE);
      rect(p, fx(b + 4), WATER - 2 - 2 * (Math.floor(t * 5) % 2), 2, 2, BONE);
      rect(p, fx(b + 6), WATER, 2, 2, BONE);
      for (let n = 0; n < len; n++) {
        const x = a - 4 - n, m = mod(n + Math.floor(t * 10), 8);
        if (m < 5 - (n >> 3)) rect(p, fx(x), WATER + (n > 9 ? 2 : 0), 1, 2, BONE);
      }
    }
    return emit(p, color);
  };
}
