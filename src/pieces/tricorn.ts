/*
 * tricorn: a pirate captain's hat seen from the front, its brim trimmed in
 * gold, a skull and crossbones pinned to it and a red plume stuck in the
 * crown. The plume sways in the wind and a glint runs along the gold.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * The hat's edges step two pixels at a time so no cell holds two colours, and
 * black gaps around the badge and under the plume keep it readable in one ink.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "tricorn",
  category: "scenes",
  note: "a captain's hat with a skull badge, its red plume swaying",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, the hat's dark felt, gold braid, the red plume
  palette: ["#e8e2d0", "#59616f", "#f2b632", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, FELT = 2, GOLD = 3, RED = 4;

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
// Lay one canvas over another, with a black gap cut around everything on it.
const over = (p: Uint8Array, q: Uint8Array, gap = 2) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
};

// ---- the hat

const CX = 39.5;
const even = (v: number) => 2 * Math.round(v / 2);
// The hat's top and bottom edges at a column, d being how far out from the middle it is (0 to 1).
const topAt = (d: number) => even(36 - 18 * Math.exp(-((d / 0.42) ** 2)) - 4 * d ** 3);
const botAt = (d: number) => even(62 - 22 * d ** 2.4);
const SKULL = [
  ".#######.",
  "#########",
  "#__###__#",
  "#__###__#",
  "####_####",
  ".#######.",
  "..#_#_#..",
  "..#####..",
];
const LOOP = 4;

export default function tricorn(): Frame {
  // what never moves: the hat, its braid and its badge
  const hat = new Uint8Array(W * H);
  for (let x = 2; x < 78; x++) {
    const d = Math.abs(x - CX) / 38, y0 = topAt(d), y1 = botAt(d);
    for (let y = y0; y < y1; y++) hat[y * W + x] = y < y0 + 4 ? GOLD : FELT;
  }
  const badge = new Uint8Array(W * H);
  for (const s of [-1, 1]) {
    line(badge, CX - s * 11, 46, CX + s * 11, 54, BONE, 3);
    rect(badge, Math.round(CX - s * 11) - 2, 44, 4, 4, BONE);
    rect(badge, Math.round(CX + s * 11) - 2, 52, 4, 4, BONE);
  }
  const skull = new Uint8Array(W * H);
  sprite(skull, 31, 28, SKULL, { "#": BONE }, 2);
  over(badge, skull);
  over(hat, badge);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    // the plume: discs along a curve from the crown up and over, leaning with the wind
    const sway = Math.round(3 * Math.sin((u / LOOP) * 2 * Math.PI));
    for (let i = 0; i <= 40; i++) {
      const s = i / 40, a = 1 - s;
      const x = a * a * 50 + 2 * a * s * (52 + sway) + s * s * (70 + 2 * sway);
      const y = a * a * 30 + 2 * a * s * 0 + s * s * 14;
      const r = 2.5 + 3.5 * Math.sin(Math.PI * Math.min(1, s * 1.15) ** 0.8);
      disc(p, Math.round(x), Math.round(y), r, r, RED);
    }
    // and the barbs cut into its outer edge
    for (let i = 10; i <= 34; i += 6) {
      const s = i / 40, a = 1 - s;
      const x = Math.round(a * a * 50 + 2 * a * s * (52 + sway) + s * s * (70 + 2 * sway)), y = Math.round(a * a * 30 + s * s * 14);
      line(p, x + 1, y + 1, x + 7, y + 4, 0, 1);
    }
    over(p, hat);
    // a glint running along the braid
    const g = Math.round(-40 + (u / LOOP) * 160);
    for (let x = g; x < g + 4; x++) {
      if (x < 2 || x >= 78) continue;
      const y0 = topAt(Math.abs(x - CX) / 38);
      for (let y = y0; y < y0 + 4; y++) if (p[y * W + x] === GOLD) p[y * W + x] = BONE;
    }
    return emit(p, color);
  };
}
