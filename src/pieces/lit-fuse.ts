/*
 * lit-fuse: a round iron bomb with a skull on it, its fuse lit. The spark eats
 * its way down the fuse, the bomb blinks red, faster and faster, and it goes
 * off in a burst before the next one is set down.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. The iron is shaded round its right-hand rim
 * with a streak of light on the left, and black gaps keep the shapes apart, so
 * it reads in one ink too.
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
// The skull on it, a pixel to each of its own.
const SKULL = [
  "......#########......",
  "....#############....",
  "...###########_###...",
  "..############_####..",
  ".############_#####..",
  ".#############_#####.",
  "#####################",
  "#####################",
  "###____#######____###",
  "##______#####______##",
  "##______#####______##",
  "##______#####______##",
  "###____###_###____###",
  ".########___########.",
  ".########_#_########.",
  "..#################..",
  "...###############...",
  "...###_###_###_###...",
  "...###_###_###_###...",
  "...###_###_###_###...",
  "....##_###_###_##....",
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
  // what never moves: the bomb, round and lit from the upper left, its collar, its rivets and its skull
  const still = new Uint8Array(W * H);
  for (let y = CY - R; y <= CY + R; y++)
    for (let x = CX - R; x <= CX + R; x++) {
      const d = Math.hypot(x - CX, y - CY), lit = Math.hypot(x - CX + 5, y - CY + 5);
      if (d >= R) continue;
      // a rim of shade down the right and under, a streak of light up on the left
      const shine = lit > 11.5 && lit < 13.5 && x < CX - 6 && y < CY - 4 && y - x < CY - CX + 9 && y - x > CY - CX - 9;
      set(still, x, y, shine ? BONE : lit > R - 0.5 ? SHADE : IRON);
    }
  rect(still, CX - 13, CY - 14, 2, 2, BONE);
  // a seam of rivets round the neck, each a dark head with a light on it
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI / 2 + 0.36 + i * 0.3, x = Math.round(CX + Math.cos(a) * 17), y = Math.round(CY + Math.sin(a) * 17);
    if (Math.abs(x - CX - 12) < 7 && y < CY - 15) continue;
    rect(still, x, y, 2, 2, SHADE);
    set(still, x, y, BONE);
  }
  // the collar the fuse comes out of: a short pipe on a wider foot
  rect(still, CX + 8, CY - R - 4, 9, 4, IRON);
  rect(still, CX + 16, CY - R - 4, 1, 4, SHADE);
  rect(still, CX + 9, CY - R - 3, 1, 2, BONE);
  rect(still, CX + 7, CY - R, 11, 2, SHADE);
  // the skull, in a black gap of its own
  const skull = new Uint8Array(W * H);
  sprite(skull, CX - 10, CY - 10, SKULL, { "#": BONE });
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (skull[y * W + x]) rect(still, x - 2, y - 2, 5, 5, 0);
  for (let i = 0; i < skull.length; i++) if (skull[i]) still[i] = skull[i];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    if (u < BURN + BLINK) {
      p.set(still);
      // about to go: the iron blinks red, faster as it nears
      if (u > BURN) {
        const k = (u - BURN) / BLINK;
        if (Math.floor(k * k * 9) % 2 === 0) for (let i = 0; i < p.length; i++) if (p[i] === IRON) p[i] = RED;
      }
      // the fuse left to burn, a two-strand cord, and the spark at its end
      const left = Math.max(1, Math.round((FUSE.length - 1) * (1 - Math.min(1, u / BURN))));
      for (let i = 0; i < left; i++) {
        const x = Math.round(FUSE[i][0]), y = Math.round(FUSE[i][1]);
        rect(p, x, y, 2, 2, BONE);
        if (i % 4 === 0) set(p, x, y + 1, 0);
      }
      const [sx, sy] = FUSE[left];
      sprite(p, Math.round(sx) - 2, Math.round(sy) - 2, SPARK[Math.floor(t * 10) % SPARK.length], { g: GOLD, r: RED, b: BONE });
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
