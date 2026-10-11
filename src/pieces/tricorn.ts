/*
 * tricorn: a pirate captain's hat seen from the front, its brim edged in gold
 * braid, a skull and crossbones on a black roundel pinned to it and a red
 * plume stuck in the crown. The plume sways in the wind and a glint runs
 * along the braid.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. The plume is a quill with barbs drawn out
 * from it; a black line under the braid, the roundel and a gap under the
 * plume keep it readable in one ink.
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
  // bone, the hat's dark felt and the light on its rim, gold braid, the red plume
  palette: ["#e8e2d0", "#59616f", "#8a94a6", "#f2b632", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, FELT = 2, RIM = 3, GOLD = 4, RED = 5;

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
const over = (p: Uint8Array, q: Uint8Array, gap = 1) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
};

// ---- the hat

const CX = 40;
// The hat's top and bottom edges at a column, d being how far out from the middle it is (0 to 1).
const topAt = (d: number) => Math.round(36 - 18 * Math.exp(-((d / 0.42) ** 2)) - 4 * d ** 3);
const botAt = (d: number) => Math.round(62 - 22 * d ** 2.4);
const SKULL = [
  "....#######....",
  "..###########..",
  ".#############.",
  "###############",
  "###############",
  "##...#####...##",
  "#.....###.....#",
  "#.....###.....#",
  "##...##.##...##",
  ".#####...#####.",
  "..###########..",
  "...#########...",
  "...##.###.##...",
  "...##.###.##...",
  "....#.###.#....",
];
const LOOP = 4;

// The plume: a quill curving up out of the crown and over, barbs swept out from it on both sides.
const plume = (p: Uint8Array, sway: number) => {
  const at = (s: number) => {
    const a = 1 - s;
    return [a * a * 52 + 2 * a * s * (54 + sway) + s * s * (73 + 2 * sway), a * a * 30 + 2 * a * s * 3 + s * s * 17];
  };
  const barb = (i: number, side: number) => {
    const s = i / 100, [x, y] = at(s), [x1, y1] = at(s + 0.01);
    const n = Math.hypot(x1 - x, y1 - y), tx = (x1 - x) / n, ty = (y1 - y) / n;
    const len = (1.5 + 6.5 * Math.sin(Math.PI * s ** 0.8) ** 0.6) * (i > 10 && i % 11 < 2 ? 0.62 : 1);
    const dx = tx * 0.55 + side * -ty * 0.83, dy = ty * 0.55 + side * tx * 0.83;
    return [x, y, x + dx * len, y + dy * len];
  };
  for (let i = 0; i <= 100; i++)
    for (const side of [-1, 1]) {
      const [x, y, ex, ey] = barb(i, side);
      line(p, x, y, ex, ey, RED, i % 11 < 2 ? 1 : 2);
    }
  // the quill itself
  for (let i = 0; i <= 80; i++) {
    const [x, y] = at(i / 100);
    set(p, x, y, 0);
  }
};

export default function tricorn(): Frame {
  // what never moves: the hat, its braid and rim, and its badge
  const hat = new Uint8Array(W * H);
  for (let x = 2; x <= 78; x++) {
    const d = Math.abs(x - CX) / 38, y0 = topAt(d), y1 = botAt(d);
    for (let y = y0; y < y1; y++) hat[y * W + x] = y < y0 + 3 ? GOLD : y === y0 + 3 || (y === y1 - 3 && y > y0 + 5) ? 0 : y >= y1 - 2 && y > y0 + 5 ? RIM : FELT;
  }
  disc(hat, CX, 41, 17, 16, 0);
  const bones = new Uint8Array(W * H);
  for (const s of [-1, 1]) {
    line(bones, CX - s * 10, 44, CX + s * 10, 52, BONE, 2);
    for (const e of [-1, 1]) {
      disc(bones, CX + e * s * 11.5, 48.5 + e * 3, 1.6, 1.6, BONE);
      disc(bones, CX + e * s * 9.5, 48.5 + e * 5.5, 1.6, 1.6, BONE);
    }
  }
  const skull = new Uint8Array(W * H);
  sprite(skull, CX - 7, 27, SKULL, { "#": BONE });
  over(bones, skull);
  for (let i = 0; i < hat.length; i++) if (bones[i]) hat[i] = bones[i];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    plume(p, Math.round(3 * Math.sin((u / LOOP) * 2 * Math.PI)));
    // the hat over it, in a black gap of its own
    for (let x = 2; x <= 78; x++) rect(p, x - 1, topAt(Math.abs(x - CX) / 38) - 2, 3, 40, 0);
    for (let i = 0; i < p.length; i++) if (hat[i]) p[i] = hat[i];
    // a glint running along the braid
    const g = Math.round(-40 + (u / LOOP) * 160);
    for (let x = g; x < g + 3; x++) {
      if (x < 2 || x > 78) continue;
      const y0 = topAt(Math.abs(x - CX) / 38);
      rect(p, x, y0, 1, 3, BONE);
    }
    return emit(p, color);
  };
}
