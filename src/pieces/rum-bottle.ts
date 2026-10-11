/*
 * rum-bottle: a stout green bottle of rum, corked, its label marked XXX. The
 * rum rocks from side to side as if the ship were rolling, a drop falls from
 * the neck into it, and now and then the glass catches the light.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on its own, in
 * five flat colours. The glass is an outline shaded down its right-hand side,
 * the label is lettered in pixels, RUM cut out of it and XXX in red on a black
 * band, and bubbles rise through the rum. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "rum bottle",
  category: "scenes",
  note: "a corked bottle marked xxx, the rum inside rocking with the ship",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, bottle green and its shade, rum and cork brown, label red
  palette: ["#e8e2d0", "#4fa35a", "#357a41", "#a8703a", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, GLASS = 2, DARK = 3, RUM = 4, RED = 5;

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
// ---- the bottle

const CX = 39.5;
// Is this pixel part of the bottle: a lip, a neck, round shoulders and a square body.
const bottle = (x: number, y: number) => {
  const dx = Math.abs(x - CX);
  if (y >= 10 && y <= 13) return dx < (y === 10 || y === 13 ? 6 : 7);
  if (y >= 14 && y <= 20) return dx < 5;
  if (y > 20 && y < 30) return (dx / 22) ** 1.6 + ((30 - y) / 14) ** 1.6 < 1;
  if (y >= 30 && y <= 61) return dx < (y === 61 ? 20 : y === 60 ? 21 : 22);
  return false;
};
const LETTERS = [
  ["####.", "#...#", "####.", "#..#.", "#...#"],
  ["#..#", "#..#", "#..#", "#..#", ".##."],
  ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
];
const X = ["##..##", "##..##", ".####.", "..##..", ".####.", "##..##", "##..##"];
const GLINT = [
  ["...#...", "...#...", "...#...", "###.###", "...#...", "...#...", "...#..."],
  [".......", "...#...", "..###..", ".##.##.", "..###..", "...#...", "......."],
  [".......", ".......", "...#...", "..#.#..", "...#...", ".......", "......."],
];
const LEVEL = 29, LOOP = 4;

export default function rumBottle(): Frame {
  // what never moves: the glass, darker down its right-hand side, the light on it, and the cork
  const still = new Uint8Array(W * H);
  const inside = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!bottle(x, y)) continue;
      let deep = true;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!bottle(x + i, y + j)) deep = false;
      if (deep) inside[y * W + x] = 1;
      else still[y * W + x] = x > CX && (!bottle(x + 1, y) || y >= 60) ? DARK : GLASS;
    }
  rect(still, 37, 14, 1, 6, BONE);
  line(still, 25, 26, 22, 29, BONE);
  rect(still, 36, 3, 8, 7, RUM);
  rect(still, 35, 2, 10, 3, RUM);
  for (const [x, y] of [[35, 2], [44, 2], [38, 6], [41, 8], [42, 5]]) set(still, x, y, 0);
  // the label: RUM cut out of it, and XXX on a black band
  const label = new Uint8Array(W * H);
  rect(label, 24, 35, 32, 22, BONE);
  for (const [x, y] of [[24, 35], [55, 35], [24, 56], [55, 56]]) set(label, x, y, 0);
  rect(label, 26, 37, 28, 1, 0);
  let lx = 31;
  for (const l of LETTERS) {
    sprite(label, lx, 39, l.map((r) => r.replaceAll("#", "_")), {});
    lx += l[0].length + 2;
  }
  rect(label, 26, 45, 28, 9, 0);
  for (let i = 0; i < 3; i++) sprite(label, 28 + i * 9, 46, X, { "#": RED });

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, turn = (u / LOOP) * 2 * Math.PI;
    const p = new Uint8Array(W * H);
    // the rum, its surface tilting one way and then the other, a ripple running over it
    const tilt = 3 * Math.cos(turn);
    for (let x = 0; x < W; x++) {
      const top = LEVEL + Math.round((tilt * (x - CX)) / 20 + 0.7 * Math.sin(x * 0.35 + 2 * turn));
      for (let y = top; y < H; y++) if (inside[y * W + x]) p[y * W + x] = RUM;
    }
    // bubbles rising through it
    for (const [x, off] of [[21, 0], [58, 0.4], [22, 0.7]]) {
      const y = 58 - Math.floor(((u / LOOP + off) % 1) * 30);
      if (p[y * W + x] === RUM && p[(y - 1) * W + x] === RUM) p[y * W + x] = 0;
    }
    // a drop falling from the neck
    if (u > 0.4 && u < 1.2) rect(p, 39, Math.round(17 + (u - 0.4) * 14), 2, 3, RUM);
    for (let i = 0; i < p.length; i++) if (still[i]) p[i] = still[i];
    // the label, in a black gap of its own
    rect(p, 23, 34, 34, 24, 0);
    for (let i = 0; i < p.length; i++) if (label[i]) p[i] = label[i];
    // the light catching the shoulder
    const k = Math.floor((u - 2.4) / 0.12);
    if (k >= 0 && k < 6) sprite(p, 28, 21, GLINT[[2, 1, 0, 0, 1, 2][k]], { "#": BONE });
    return emit(p, color);
  };
}
