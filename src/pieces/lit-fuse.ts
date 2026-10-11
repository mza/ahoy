/*
 * lit-fuse: a round iron bomb with a skull on it, its fuse lit. The spark eats
 * its way down the fuse, the bomb blinks red, faster and faster, and it goes
 * off in a burst before the next one is set down.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat colours.
 * Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "lit fuse",
  category: "scenes",
  note: "a skull-marked iron bomb, its fuse burning down until it bursts",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, iron and its shade, spark gold, fire red
  palette: ["#e8e2d0", "#8a94a6", "#59616f", "#f2b632", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, IRON = 2, SHADE = 3, GOLD = 4, RED = 5;

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

// ---- the bomb

const CX = 36, CY = 39, R = 22;
const SKULL = [
  "..#######..",
  ".#########.",
  "###########",
  "##__###__##",
  "##__###__##",
  "#####_#####",
  ".#########.",
  "..#_#_#_#..",
  "..#######..",
];
// The fuse, from the collar up and over to its tip: points along a curve.
const FUSE: [number, number][] = Array.from({ length: 60 }, (_, i) => {
  const u = i / 59, a = 1 - u;
  return [a * a * 49 + 2 * a * u * 58 + u * u * 70, a * a * 15 + 2 * a * u * -2 + u * u * 9];
});
const SPARK = [
  ["..g..", ".grg.", "grbrg", ".grg.", "..g.."],
  ["g...g", ".grg.", "..b..", ".grg.", "g...g"],
  ["..g..", "..r..", "grbrg", "..r..", "..g.."],
];
const BURN = 6.5, BLINK = 1.5, BURST = 0.7, REST = 0.5;
const LOOP = BURN + BLINK + BURST + REST;

export default function litFuse(): Frame {
  // what never moves: the bomb, its shade, its shine, its collar and its skull
  const still = new Uint8Array(W * H);
  disc(still, CX, CY, R, R, SHADE);
  disc(still, CX - 2, CY - 2, R - 3, R - 3, IRON);
  disc(still, CX - 11, CY - 12, 4, 3, BONE);
  rect(still, CX + 8, CY - R - 4, 9, 4, IRON);
  rect(still, CX + 7, CY - R - 1, 11, 2, SHADE);
  // a black gap around the skull, then the skull, two pixels to each of its own
  disc(still, CX, CY + 3, 13, 11, 0);
  sprite(still, CX - 11, CY - 6, SKULL, { "#": BONE }, 2);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    if (u < BURN + BLINK) {
      p.set(still);
      // the fuse left to burn, and the spark at its end
      const left = Math.max(1, Math.round((FUSE.length - 1) * (1 - Math.min(1, u / BURN))));
      for (let i = 0; i < left; i++) rect(p, Math.round(FUSE[i][0]), Math.round(FUSE[i][1]), 2, 2, BONE);
      const [sx, sy] = FUSE[left];
      sprite(p, Math.round(sx) - 2, Math.round(sy) - 2, SPARK[Math.floor(t * 10) % SPARK.length], { g: GOLD, r: RED, b: BONE });
      // about to go: the iron blinks red, faster as it nears
      if (u > BURN) {
        const k = (u - BURN) / BLINK;
        if (Math.floor(k * k * 9) % 2 === 0) for (let i = 0; i < p.length; i++) if (p[i] === IRON) p[i] = RED;
      }
    } else if (u < BURN + BLINK + BURST) {
      // the burst: a ring of fire opening out, rays past it, bone-white at its heart
      const k = (u - BURN - BLINK) / BURST, r = 8 + 24 * Math.sqrt(k);
      disc(p, CX, CY - 4, r, r, RED);
      disc(p, CX, CY - 4, r * 0.72, r * 0.72, GOLD);
      disc(p, CX, CY - 4, r * (0.45 - 0.45 * k), r * (0.45 - 0.45 * k), BONE);
      if (k > 0.45) disc(p, CX, CY - 4, r * (k - 0.3), r * (k - 0.3), 0);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * 2 * Math.PI + 0.26, r0 = r + 3, r1 = r + 5 + 9 * k + (i % 2) * 4;
        line(p, CX + Math.cos(a) * r0, CY - 4 + Math.sin(a) * r0, CX + Math.cos(a) * r1, CY - 4 + Math.sin(a) * r1, i % 2 ? GOLD : RED, 2);
      }
    }
    return emit(p, color);
  };
}
