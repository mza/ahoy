/*
 * seagull: a fat gull perched on a wooden mooring post with rope round it,
 * the sea lapping at its foot. It looks the other way, looks back, throws its
 * beak open to squawk, flaps its wings once and settles.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat colours.
 * The gull is hand-drawn rows at two pixels to each of its own: a body, three
 * heads and three wings, swapped by time. Black gaps keep the shapes apart, so
 * it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "seagull",
  category: "scenes",
  note: "a fat gull on a mooring post: it looks about, squawks and flaps once",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // feather bone, wing iron, beak gold, post wood, sea blue
  palette: ["#e8e2d0", "#8a94a6", "#f2b632", "#a8703a", "#3a7ca5"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, IRON = 2, GOLD = 3, WOOD = 4, BLUE = 5;

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

// ---- the gull, in its own pixels, two of the canvas's to each

const KEYS = { "#": BONE, g: IRON, y: GOLD, w: WOOD };
const GX = 4, GY = -2; // where the gull's own grid starts on the canvas
// The body, breast to the right, tail to the left, and its legs. Its top row is the gull's row 8.
const BODY = [
  "..................########.....",
  "...............###########.....",
  "............###############....",
  "..........#################....",
  "........###################....",
  "......#####################....",
  "....#######################....",
  "...........###############.....",
  ".............############......",
  "...............########........",
  "................y...y..........",
  "................y...y..........",
  "...............yyy.yyy.........",
];
// Heads, from the gull's row 2, column 19: looking right, looking left, and squawking.
const HEADS = [
  [
    "..#####......",
    ".#######.....",
    ".###_###yyyy.",
    ".#######yy...",
    ".#######.....",
    ".#######.....",
  ],
  [
    "......#####..",
    ".....#######.",
    ".yyyy###_###.",
    "...yy#######.",
    ".....#######.",
    ".....#######.",
  ],
  [
    "..#####...yy.",
    ".#######yyy..",
    ".###_###y....",
    ".#######yy...",
    ".#######.yyy.",
    ".#######.....",
  ],
];
// Wings, from the gull's row 0, column 2: folded along the back, thrown up, and beating down.
const WINGS = [
  [
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "..........____ggggg_..",
    "......____ggggggggg_..",
    "..____gggggggggggg__..",
    "__gggggggggggggg___...",
    "ggggggggggg_____......",
    "___________...........",
  ],
  [
    "...ggg................",
    "...ggggg..............",
    "....gggggg............",
    "....ggggggg...........",
    ".....ggggggg..........",
    ".....gggggggg.........",
    "......gggggggg........",
    "......ggggggggg.......",
    "......._ggggggggg_....",
    "........_gggggggg_....",
    ".........________.....",
  ],
  [
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "...........______.....",
    ".......____ggggg_.....",
    "....___gggggggggg_....",
    ".___ggggggggggggg_....",
    "_gggggggggggggggg_....",
    "_ggggggggggggggg_.....",
    "_gggggggggggggg_......",
    "._ggggggggggg__.......",
    ".._ggggggg___.........",
    "..._______............",
  ],
];
// The post, from the gull's row 22, column 15: flat-topped, two turns of rope, a split in the wood.
const POST = [
  "wwwwwww",
  "wwwwwww",
  "_______",
  "#######",
  "_______",
  "#######",
  "_______",
  "wwwwwww",
  "ww_wwww",
  "ww_wwww",
  "wwwwwww",
  "wwwwwww",
];
const LOOP = 6;

export default function seagull(): Frame {
  // what never moves: the post and the body
  const still = new Uint8Array(W * H);
  sprite(still, GX + 2 * 15, GY + 2 * 22, POST, KEYS, 2);
  sprite(still, GX, GY + 2 * 8, BODY, KEYS, 2);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);
    // the head: a look to the left, back, then a squawk in two barks
    const head = u >= 1.3 && u < 2.4 ? 1 : (u >= 2.9 && u < 3.25) || (u >= 3.4 && u < 3.8) ? 2 : 0;
    // the wings: up, down, up, and folded again
    const f = u >= 3.95 && u < 4.85 ? Math.floor((u - 3.95) / 0.18) : -1;
    const wing = f < 0 ? 0 : [1, 2, 1, 2, 1][f];
    sprite(p, GX + 2 * 2, GY, WINGS[wing], KEYS, 2);
    sprite(p, GX + 2 * (head === 1 ? 15 : 19), GY + 2 * 2, HEADS[head], KEYS, 2);
    // the sea at the foot of the post: a wave mark on either side, lapping to and fro
    const lap = 2 * (Math.floor(t * 2) % 2);
    for (const x of [GX + 10 + lap, GX + 50 - lap]) {
      rect(p, x, 62, 4, 2, BLUE);
      rect(p, x + 4, 60, 4, 2, BLUE);
      rect(p, x + 8, 62, 4, 2, BLUE);
    }
    return emit(p, color);
  };
}
