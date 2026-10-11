/*
 * pirate-crab: a chunky red crab, seen front-on, with a patch over one eye, its strap
 * running down across its shell. Its eyes sit on stalks, its claws snap open and shut
 * one after the other, and it scuttles a few pixels side to side.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "pirate crab",
  category: "scenes",
  note: "a red crab in an eyepatch, snapping its claws and scuttling",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // crab red and its shade, dark iron for the patch, bone
  palette: ["#e23a2e", "#a3261e", "#59616f", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const RED = 1, DARK = 2, IRON = 3, BONE = 4;

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

// ---- the crab, drawn about its middle at x = 0

const KEYS = { r: RED, d: DARK, i: IRON, b: BONE };
// two pixels to each of these
const EYE = [
  ".bbbb.",
  "bbbbbb",
  "bb__bb",
  "bb__bb",
  "bbbbbb",
  ".bbbb.",
];
const PATCH = [
  ".iiii.",
  "iiiiii",
  "iiiiii",
  "iiiiii",
  ".iiii.",
  "..ii..",
];
const GRIN = [
  "_......_",
  "__....__",
  ".______.",
];
// Each leg: shoulder, knee and foot, for the right side; the left mirrors it.
const LEGS = [
  [16, 43, 27, 42, 34, 50],
  [15, 48, 25, 50, 31, 58],
  [10, 52, 18, 57, 21, 63],
];
// A claw: a round pincer held up on an arm, its jaws opening up and in. `side` is -1 left, 1 right.
const claw = (p: Uint8Array, cx: number, side: number, open: boolean) => {
  const x = cx + side * 29, y = 17;
  line(p, cx + side * 16, 37, cx + side * 30, 33, RED, 5);
  rect(p, x - 3, 30, 6, 2, RED);
  disc(p, x, y, 9.5, 11, RED);
  // the jaws: a wedge cut out of it, or only a slit when shut
  const ax = x + side * 2, ay = y + 4, dx = -side * 0.42, dy = -0.91, half = open ? 0.55 : 0;
  for (let j = y - 12; j <= y + 12; j++)
    for (let i = x - 10; i <= x + 10; i++) {
      const vx = i - ax, vy = j - ay, along = vx * dx + vy * dy, across = Math.abs(vx * -dy + vy * dx);
      if (along > 0 && across < Math.max(1.1, along * half)) set(p, i, j, 0);
    }
};

const LOOP = 3.6;
// The scuttle: [seconds, pixels off to one side], held between.
const SIDE: [number, number][] = [[0, 0], [0.6, 0], [0.9, 2], [1.5, 2], [2.1, -2], [2.7, -2], [3, 0], [LOOP, 0]];

export default function pirateCrab(): Frame {
  return (t, { color } = {}) => {
    const u = mod(t, LOOP);
    const p = new Uint8Array(W * H);
    let i = 0;
    while (i < SIDE.length - 2 && u >= SIDE[i + 1][0]) i++;
    const k = (u - SIDE[i][0]) / (SIDE[i + 1][0] - SIDE[i][0]);
    const off = Math.round(SIDE[i][1] + (SIDE[i + 1][1] - SIDE[i][1]) * k);
    const moving = SIDE[i][1] !== SIDE[i + 1][1];
    const step = moving ? Math.floor(u * 10) % 2 : 0;
    const cx = 40 + off;

    // legs first, every other one lifted as it walks
    LEGS.forEach(([x0, y0, x1, y1, x2, y2], n) => {
      for (const s of [-1, 1]) {
        const lift = moving && (n + (s > 0 ? 1 : 0) + step) % 2 ? 1 : 0;
        line(p, cx + s * x0, y0, cx + s * x1, y1 - lift, RED, 3);
        line(p, cx + s * x1, y1 - lift, cx + s * x2, y2 - lift, RED, 3);
      }
    });
    // the shell, with a black gap around it, shaded underneath, and a grin
    disc(p, cx, 41, 21, 14, 0);
    disc(p, cx, 41, 19, 12, RED);
    for (let y = 48; y < 54; y++) for (let x = cx - 19; x <= cx + 19; x++) if (((x - cx) / 19) ** 2 + ((y - 41) / 12) ** 2 < 1 && ((x - cx) / 19) ** 2 + ((y - 37) / 12) ** 2 >= 1) set(p, x, y, DARK);
    sprite(p, cx - 8, 40, GRIN, KEYS, 2);

    // the claws, snapping one after the other
    const q = mod(u, 0.9);
    claw(p, cx, -1, !(q >= 0.2 && q < 0.35));
    claw(p, cx, 1, !(q >= 0.35 && q < 0.5));

    // the patch's strap, down behind the other stalk to the far edge of the shell, with a black gap either side
    line(p, cx + 5, 13, cx - 15, 31, 0, 4);
    line(p, cx + 5, 13, cx - 17, 33, IRON, 2);
    // eyes on stalks: the left a wide eyeball, its stalk in front of the strap; the right a solid patch
    rect(p, cx - 15, 18, 8, 12, 0);
    rect(p, cx - 13, 18, 4, 14, RED);
    rect(p, cx + 9, 18, 4, 14, RED);
    sprite(p, cx - 17, 4, EYE, KEYS, 2);
    sprite(p, cx + 5, 4, PATCH, KEYS, 2);
    return emit(p, color);
  };
}
