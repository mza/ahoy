/*
 * fish-bones: the skeleton of a fish, side-on and still swimming. A wave runs
 * down its spine from head to tail, so the ribs rise, fall and lean in turn
 * and the forked tail sweeps after them; its jaw drops open and snaps shut,
 * and a red spark sits in its eye socket.
 *
 * Pixel art in block elements, two square pixels a cell, in two flat colours.
 * The head is hand-drawn rows at two pixels to each of its own; the spine,
 * ribs and tail are blocks and lines moved by whole pixels. Black gaps keep
 * the ribs apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "fish bones",
  category: "scenes",
  note: "a fish skeleton swimming on: ribs rippling, jaw snapping, eye lit",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, and the red in its eye
  palette: ["#e8e2d0", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, RED = 2;

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

// ---- the fish, nose to the left

const KEYS = { "#": BONE, r: RED };
const HX = 2, HY = 14; // the head's top left pixel
// The skull, two pixels to each of its own: a round socket with a spark in it, and a row of teeth.
const SKULL = [
  ".........#####..",
  "......#########.",
  "....###########.",
  "...############.",
  "..####____#####.",
  ".####______####.",
  ".####__rr__####.",
  "#####__rr__####.",
  "######____#####.",
  "###############.",
  "###############.",
  ".#_#_#_#_######.",
];
// The jaw, hinged at its right end, with teeth of its own.
const JAW = [
  "..#_#_#_#######.",
  "..#############.",
  "....###########.",
  ".......######...",
];
const CY = HY + 19; // the spine's middle pixel row
const RIBS = [19, 20, 17, 13, 9]; // how long each pair is, head to tail
const RIB0 = 37, STEP = 6; // the first rib's column, and the columns between ribs
const TAIL = RIB0 + RIBS.length * STEP;
const SWIM = 1.2, LOOP = 2 * SWIM; // one wave down the spine, and one snap of the jaw every two

export default function fishBones(): Frame {
  // what never moves: the skull
  const still = new Uint8Array(W * H);
  sprite(still, HX, HY, SKULL, KEYS, 2);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);

    // the jaw: it drops open, hangs, and snaps shut
    const open = u < 0.5 ? 0 : u < 0.8 ? Math.round(((u - 0.5) / 0.3) * 8) : u < 1.3 ? 8 : u < 1.4 ? 4 : 0;
    JAW.forEach((row, j) =>
      [...row].forEach((c, i) => {
        if (c === "#") rect(p, HX + 2 * i, HY + 2 * (SKULL.length + j) + Math.round((open * (13 - Math.min(i, 13))) / 13), 2, 2, BONE);
      }),
    );

    // the wave down the spine: each rib rides it, and leans as it passes
    const wave = (i: number) => (2 * Math.PI * t) / SWIM - i * 1.1;
    const lift = (i: number) => Math.round((0.8 + i * 0.6) * Math.sin(wave(i)));
    RIBS.forEach((len, i) => {
      const x = RIB0 + i * STEP, y = CY + lift(i), lean = 3 + Math.round(1.4 * Math.cos(wave(i)));
      rect(p, x - 1, y - 2, STEP, 4, BONE);
      line(p, x, y - 3, x + lean, y - 3 - len, BONE, 2);
      line(p, x, y + 2, x + lean, y + 2 + len, BONE, 2);
    });
    // the tail: a stub of spine and a forked fin, sweeping last
    const n = RIBS.length, y = CY + lift(n), far = lift(n + 1) - lift(n);
    rect(p, TAIL - 1, y - 2, 4, 4, BONE);
    line(p, TAIL + 3, y - 1, W - 3, y - 16 + far, BONE, 4);
    line(p, TAIL + 3, y + 1, W - 3, y + 16 + far, BONE, 4);
    return emit(p, color);
  };
}
