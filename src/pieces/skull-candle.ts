/*
 * skull-candle: a skull with a stub of red candle stuck on its crown. The
 * flame flickers through four shapes, wax has pooled over the crown and run
 * down the forehead, one run of it over the brow where a drop swells and
 * falls, and deep in the sockets a glint of gold comes and goes with the flame.
 *
 * Pixel art in block elements, two square pixels a cell, in three flat
 * colours. Skull, wax and flame are hand-drawn rows at two pixels to each of
 * their own. Black gaps keep the wax off the bone, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "skull candle",
  category: "scenes",
  note: "a skull with a candle stub on its crown, wax running, flame flickering",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, flame gold, wax red
  palette: ["#e8e2d0", "#f2b632", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, GOLD = 2, RED = 3;

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

// ---- the skull, in its own pixels, two of the canvas's to each

const KEYS = { "#": BONE, g: GOLD, r: RED };
const SX = 18, SY = 24; // the skull's top left pixel
const SKULL = [
  ".......########.......",
  "....##############....",
  "..##################..",
  ".####################.",
  "######################",
  "######################",
  "######################",
  "######################",
  "###_____######_____###",
  "##_______####_______##",
  "##_______####_______##",
  "##_______####_______##",
  "###_____######_____###",
  "##########__##########",
  ".########____########.",
  "..#######____#######..",
  "....##############....",
  "....##_##_##_##_##....",
  "....##_##_##_##_##....",
  ".....############.....",
];
// The candle stub, from four rows over the skull, and the wax pooled over the crown under it: two short
// runs and a long one that has gone over the brow into a socket.
const WAX = [
  "........rrrrrr........",
  "........rrrrrr........",
  "........rrrrrr........",
  "........rrrrrr........",
  ".......rrrrrrrr.......",
  ".......rrrrrrrrr......",
  ".......rr.rr.rrrr.....",
  ".......r.......rr.....",
  "...............rr.....",
  "...............rr.....",
  "...............rr.....",
  "...............rr.....",
  "...............rr.....",
];
// The flame, bottom row on the wick: four shapes to flicker through.
const FLAMES = [
  [
    "...g....",
    "...gg...",
    "..gggg..",
    ".ggrgg..",
    ".ggrrgg.",
    ".ggrrgg.",
    "..gggg..",
  ],
  [
    "....g...",
    "...ggg..",
    "..gggg..",
    "..ggrgg.",
    ".ggrrgg.",
    ".ggrrgg.",
    "..gggg..",
  ],
  [
    "........",
    "...gg...",
    "..gggg..",
    ".ggrrgg.",
    "ggrrrrgg",
    ".ggrrgg.",
    "..gggg..",
  ],
  [
    "..g.....",
    "..ggg...",
    "..gggg..",
    ".ggrgg..",
    ".ggrrgg.",
    ".ggrrgg.",
    "..gggg..",
  ],
];
const FLICKER = [0, 1, 2, 1, 3, 0, 2, 3]; // the order the flame runs through its shapes, ten a second
const LOOP = 4;

export default function skullCandle(): Frame {
  // what never moves: the skull, the candle and the wax already run and set
  const still = new Uint8Array(W * H);
  sprite(still, SX, SY, SKULL, KEYS, 2);
  // the wax keeps a gap from the bone: empty every pixel beside it, then lay it down
  for (const k of [0, RED])
    WAX.forEach((row, j) =>
      [...row].forEach((c, i) => {
        if (c === "r") k ? rect(still, SX + 2 * i, SY - 8 + 2 * j, 2, 2, k) : rect(still, SX + 2 * i - 2, SY - 8 + 2 * j - 2, 6, 6, 0);
      }),
    );

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);
    const pose = FLICKER[Math.floor(u * 10) % FLICKER.length];
    sprite(p, SX + 14, SY - 24, FLAMES[pose], KEYS, 2);

    // a drop of wax swells under the long run, lets go, and falls away into the dark of the socket
    if (u > 1.2 && u < 2.6) {
      const k = Math.max(0, (u - 2.1) / 0.5), y = SY + 18 + Math.round(8 * k * k);
      if (y < SY + 25) rect(p, SX + 30, y, 2, 2, RED);
    }

    // the sockets catch the flame: a glint that swells when it burns wide
    const big = pose === 2, lean = pose === 1 ? 2 : pose === 3 ? -2 : 0;
    for (const x of [SX + 6, SX + 36]) {
      rect(p, x + lean, SY + 20, 2, 2, GOLD);
      if (big) rect(p, x - 2, SY + 20, 6, 2, GOLD), rect(p, x, SY + 18, 2, 6, GOLD);
    }
    return emit(p, color);
  };
}
