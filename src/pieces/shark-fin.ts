/*
 * shark-fin: a big shark's back fin cutting through the sea, seen side-on.
 * It slides across with a wake of foam behind it, dips under, comes up
 * facing the other way and slides back, over rows of scrolling waves.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in four flat colours: the fin shaded down its right-hand edge, the
 * waves one pixel thick with flecks of foam, the wake a V of foam opening out
 * behind. A black gap keeps the fin off the water, so it reads in one ink too.
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
// Old bites out of its trailing edge: [row, how deep].
const NICKS = [[21, 1], [22, 2], [23, 1], [32, 1]];
// A crest, one pixel thick: how far each of its pixels stands above its row.
const CREST = [0, 1, 1, 2, 2, 2, 1, 1, 0];

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

    // the sea: a rippling line for its surface, rows of crests under it, each drifting at its own pace,
    // a fleck of foam on every third crest
    const s0 = Math.floor(t * 6);
    for (let x = 0; x < W; x++) set(p, x, WATER + Math.round(1.4 * Math.sin(((x + s0) * Math.PI) / 8)), SEA);
    [[52, -4, 0, 19], [57, 9, 10, 23], [62, -7, 4, 17]].forEach(([y, v, off, gap]) => {
      const s = Math.floor(t * v) + off;
      for (let x = 0; x < W; x++) {
        const m = mod(x + s, gap);
        if (m < CREST.length) set(p, x, y - CREST[m], m === 4 && mod(Math.floor((x + s) / gap), 3) === 0 ? BONE : SEA);
      }
    });

    // where the fin is now
    let i = 0;
    while (i < SWIM.length - 2 && u >= SWIM[i + 1][0]) i++;
    const [t0, x0, d0, dir] = SWIM[i], [t1, x1, d1] = SWIM[i + 1];
    const k = (u - t0) / (t1 - t0);
    const cx = Math.round(x0 + (x1 - x0) * k), sunk = Math.round(d0 + (d1 - d0) * k);
    const shown = FH - sunk;
    if (shown > 3) {
      const fx = (x: number) => (dir > 0 ? cx - FW / 2 + x : cx + FW / 2 - 1 - x);
      const a = EDGES[shown - 1][0], b = EDGES[shown - 1][1];
      // the fin, down to just above the water, nicked along its trailing edge
      for (let j = 0; j < shown - 3; j++) {
        const y = WATER - shown + j;
        const nick = NICKS.find(([row]) => row === j);
        const e0 = EDGES[j][0] + (nick ? nick[1] : 0), e1 = EDGES[j][1];
        for (let x = e0; x <= e1; x++) set(p, fx(x), y, IRON);
      }
      // its right-hand edge in shade, as if lit from the left
      for (let y = 0; y < WATER - 3; y++)
        for (let x = W - 1; x >= 0; x--)
          if (p[y * W + x] === IRON && (x === W - 1 || !p[y * W + x + 1])) {
            for (let n = 0; n < 3 && p[y * W + x - n] === IRON; n++) p[y * W + x - n] = SHADE;
            break;
          }

      // foam where it cuts the water: a line along its foot and a curl thrown up at the bow
      for (let x = a - 2; x <= b + 2; x++) {
        rect(p, fx(x), WATER - 1, 1, 3, 0);
        set(p, fx(x), WATER - 1, BONE);
      }
      const curl = Math.floor(t * 6) % 2;
      for (const [x, y] of curl ? [[3, 2], [4, 3], [5, 3], [6, 2], [8, 1]] : [[3, 2], [4, 2], [5, 3], [7, 2], [7, 0]]) set(p, fx(b + x), WATER - y, BONE);
      // the wake: a V of broken foam opening out behind, one arm back along the surface, one towards us
      const len = Math.min(36, shown), run = Math.floor(t * 10);
      const arm: [number, number][] = [];
      for (let n = 0; n < len; n++) {
        if (mod(n + run, 7) < 5 - (n >> 4)) set(p, fx(a - 3 - n), WATER - 1 + (n > 6 ? 1 : 0) + (n > 20 ? 1 : 0), BONE);
        if (mod(n + run + 3, 8) < 6 - (n >> 4)) arm.push([fx(b + 1 - n), WATER + 1 + Math.round(n / 2.4)]);
      }
      for (const [x, y] of arm) rect(p, x - 1, y - 1, 3, 3, 0);
      for (const [x, y] of arm) set(p, x, y, BONE);
    }
    return emit(p, color);
  };
}
