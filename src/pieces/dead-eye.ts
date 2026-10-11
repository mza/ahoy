/*
 * dead-eye: a long-jawed skull in a red bandana, knotted at the side, with a
 * patch strapped over one eye. An ember glows and dims in the other socket,
 * which winks now and then; the jaw drops and clacks shut, twice, and the
 * tails of the knot flap.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * It is drawn by hand as rows of big pixels, two to each of its own, with
 * black gaps under the bandana and around the patch so it reads in one ink.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "dead eye",
  category: "scenes",
  note: "a skull in a red bandana and an eyepatch, winking, its jaw clacking",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, the patch's iron grey, the ember's gold, bandana red
  palette: ["#e8e2d0", "#59616f", "#f2b632", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, PATCH = 2, GOLD = 3, RED = 4;

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
// ---- the skull, in big pixels: b bone, r bandana, s patch and strap

const KEYS = { b: BONE, r: RED, s: PATCH, g: GOLD };
const HEAD = [
  ".......rrrrrrrrrr.......",
  "....rrrrrrrrrrrrrrrr....",
  "..rrrrrrrrrrrrrrrrrrrr..",
  ".rrrrrrrrrrrrrrrrrrrrrr.",
  "rrrrrrrrrrrrrrrrrrrrrrrrrr",
  "rrrrrrrrrrrrrrrrrrrrrrrrrrr",
  "........................rrr",
  "bbbbbbbbbbbsbbbbbbbbbbbb",
  "bbbbbbbbbbbbsbbbbbbbbbbb",
  "bbbbbbbbbbbbb_________bb",
  "bbb______bbbb_sssssss_ss",
  "bb________bbb_sssssss_bb",
  "bb________bbb_sssssss_bb",
  "bb________bbb_sssssss_bb",
  "bbb______bbbb__sssss__bb",
  "bbbbbbbbbbbbbb__sss__bbb",
  "bbbbbbbbbbb__bb_____bbbb",
  ".bbbbbbbbb____bbbbbbbbb.",
  "..bbbbbbbb____bbbbbbbb..",
  "...bbbbbbbbbbbbbbbbbb...",
  "...bbbbbbbbbbbbbbbbbb...",
  "...b_bb_bb_bb_bb_bb_b...",
  "...b_bb_bb_bb_bb_bb_b...",
];
const JAW = [
  "...b_bb_bb_bb_bb_bb_b...",
  "...b_bb_bb_bb_bb_bb_b...",
  "...bbbbbbbbbbbbbbbbbb...",
  "....bbbbbbbbbbbbbbbb....",
  ".......bbbbbbbbbb.......",
];
// The knot's two tails, hanging and lifted.
const TAILS = [
  ["rr...", "rrr..", ".rrr.", ".rr.r", "rr..r", "rr..rr", "r....r"],
  ["rr...", "rrrr.", ".rrrr", ".rr.rr", ".rr..r", "..rr.", "...r."],
];
// The open socket: the ember small and large, and the lid shut in a wink.
const EMBER = [
  ["....", ".gg.", ".gg.", "...."],
  [".gg.", "gggg", "gggg", ".gg."],
];
const WINK = ["bbbbbbbb", "bbbbbbbb", "________", "bbbbbbbb", "bbbbbbbb"];
const X0 = 14, Y0 = 2, LOOP = 6;

export default function deadEye(): Frame {
  // what never moves: the head down to its top teeth
  const still = new Uint8Array(W * H);
  sprite(still, X0, Y0, HEAD, KEYS, 2);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    const beat = Math.floor(u / 0.75);
    sprite(p, X0 + 52, Y0 + 14, TAILS[beat % 2], KEYS, 2);
    if (u >= 2 && u < 2.35) sprite(p, X0 + 4, Y0 + 20, WINK, KEYS, 2);
    else sprite(p, X0 + 8, Y0 + 22, EMBER[beat % 2], KEYS, 2);
    // the jaw: shut, but for two quick clacks
    const k = u - 4, open = (k >= 0 && k < 0.25) || (k > 0.45 && k < 0.7);
    sprite(p, X0, Y0 + 48 + (open ? 4 : 0), JAW, KEYS, 2);
    return emit(p, color);
  };
}
