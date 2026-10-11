/*
 * mermaid: a mermaid on a rock in the sea, side on, as on an old sea chart,
 * looking into a hand mirror. Her long red hair falls over her shoulder and down
 * her back; her scaled tail lies along the rock and curves down it to a forked
 * fluke. The fluke flicks, her hair stirs, and the waves lap the rock.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. The rock, the sea, the tail, the figure, her
 * hair and her arm are layers, each laid over the last with a black gap cut
 * round it; the scales are single pixels left out of the tail. It reads in
 * one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "mermaid",
  category: "scenes",
  note: "a mermaid on a rock with a mirror, her tail fluke flicking",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // the rock, the sea, her tail, her skin, her hair
  palette: ["#8a94a6", "#3a7ca5", "#5fd7c9", "#e8e2d0", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const ROCK = 1, SEA = 2, TAILC = 3, SKIN = 4, HAIR = 5;

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
// A filled polygon, a pixel at a time.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    pts.forEach(([x0, y0], i) => {
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    });
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) set(p, x, y, k);
  }
};
// A limb: a round brush of radius `r` dragged through the points.
const tube = (p: Uint8Array, pts: number[][], r: number, k: number) => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let j = 0; j <= n; j++) disc(p, Math.round(x0 + ((x1 - x0) * j) / n), Math.round(y0 + ((y1 - y0) * j) / n), r, r, k);
  }
};
const canvas = () => new Uint8Array(W * H);
// A tapering limb: a round brush dragged through the points, each [x, y, radius].
const taper = (p: Uint8Array, pts: number[][], k: number) => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0, r0] = pts[i], [x1, y1, r1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let j = 0; j <= n; j++) {
      const r = r0 + ((r1 - r0) * j) / n;
      disc(p, Math.round(x0 + ((x1 - x0) * j) / n), Math.round(y0 + ((y1 - y0) * j) / n), r, r, k);
    }
  }
};

// ---- the mermaid

const LOOP = 6;
const DX = 4; // how far right of where it is drawn the whole figure sits

// Her head, facing left: s skin, h hair, r her lips, _ her eye.
const HEAD = [
  "....hhhhhhh..",
  "..hhhhhhhhhh.",
  ".hhhhhhhhhhhh",
  ".h........hhh",
  "...ssssss.hhh",
  "..sssssss.hhh",
  ".ss_sssss.hhh",
  "sssssssss.hhh",
  ".ssssssss.hhh",
  ".rsssssss.hhh",
  "..sssssss.hhh",
  "...sssss..hhh",
];

// The rock, with a few cracks in it.
const rock = () => {
  const q = canvas();
  poly(q, [[31, 43], [42, 42], [60, 42], [67, 47], [71, 55], [75, 64], [19, 64], [23, 55], [27, 47]], ROCK);
  line(q, 60, 44, 56, 50, 0);
  line(q, 56, 50, 59, 56, 0);
  line(q, 38, 48, 42, 53, 0);
  line(q, 42, 53, 40, 58, 0);
  line(q, 66, 52, 63, 57, 0);
  rect(q, 0, 57, W, 7, 0);
  return q;
};

// The sea: two lines of waves, broken here and there, slid along by `k` pixels; the nearer one rides up by `lap`.
const sea = (k: number, lap: number) => {
  const q = canvas();
  for (let x = 0; x < W; x++) {
    const a = (((x + k) % 12) + 12) % 12, b = (((x - k + 5) % 12) + 12) % 12;
    if (a < 9) set(q, x, 59 - lap + (a < 2 || a > 6 ? 1 : 0), SEA);
    if (b < 9) set(q, x, 62 + (b < 2 || b > 6 ? 1 : 0), SEA);
  }
  return q;
};

// Her tail: along the rock, down its face and out to the fluke, which is turned by `flick`.
const TAIL = [[52, 37, 4.6], [42, 37, 4.6], [34, 38.5, 4.3], [29, 44, 3.7], [26, 49, 3], [21, 53, 2.4], [15, 54, 1.9], [11, 50, 1.5]];
const FLUKE = [[-1, -1.5], [3, -4], [8, -8], [13, -9.5], [9.5, -4], [7, 0], [9.5, 4], [13, 9.5], [8, 8], [3, 4], [-1, 1.5]];
const tail = (flick: number) => {
  const q = canvas();
  taper(q, TAIL, TAILC);
  // the scales: single pixels left out, row over row
  const dots: number[] = [];
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (q[i] && q[i - 1] && q[i + 1] && q[i - W] && q[i + W] && y % 3 === 0 && (x + (y / 3) * 2) % 4 === 0) dots.push(i);
    }
  for (const i of dots) q[i] = 0;
  const a = -1.8 + flick * 0.42, c = Math.cos(a), s = Math.sin(a);
  poly(q, FLUKE.map(([u, v]) => [11 + u * c - v * s, 50 + u * s + v * c]), TAILC);
  return q;
};

// Her body, and the hair down her back, stirred by `ph`.
const figure = () => {
  const q = canvas();
  poly(q, [[43, 20], [50, 19], [52, 26], [53, 33], [44, 33], [43, 27]], SKIN);
  rect(q, 44, 16, 4, 4, SKIN);
  sprite(q, 39, 4, HEAD.map((row) => row.replace(/h/g, ".")), { s: SKIN, r: HAIR });
  return q;
};
const LOCKS = [[52, 56, 42, 2.2], [53, 60, 47, 2.6], [54, 65, 41, 2.2]]; // each from x at her crown to x at its end, the row it ends on, its width
const hair = (ph: number) => {
  const q = canvas();
  sprite(q, 39, 4, HEAD.map((row) => row.replace(/[^h]/g, ".")), { h: HAIR });
  const at = (i: number, y: number) => {
    const [x0, x1, y1] = LOCKS[i], f = (y - 9) / (y1 - 9);
    return x0 + (x1 - x0) * f ** 1.4 + 1.7 * f * Math.sin(y / 4 - ph + i * 0.9);
  };
  LOCKS.forEach(([, , y1, r], i) => {
    for (let y = 9; y <= y1; y++) {
      const f = (y - 9) / (y1 - 9), w = r * Math.min(1, 0.4 + f * 2.5) * (1 - f ** 4) + 0.5;
      rect(q, Math.round(at(i, y) - w), y, Math.round(2 * w), 1, HAIR);
    }
  });
  // two strands picked out down the fall
  for (let y = 15; y < 39; y++) if (y % 9 > 1) set(q, at(1, y) - 1, y, 0);
  for (let y = 21; y < 36; y++) if (y % 7 > 1) set(q, at(2, y), y, 0);
  // a lock over her shoulder
  const e = Math.round(Math.sin(ph));
  taper(q, [[50, 16, 1.3], [49, 19, 1.5], [48 + e, 23, 1.3]], HAIR);
  return q;
};

// Her arm, raised, and the mirror in her hand.
const arm = () => {
  const q = canvas();
  taper(q, [[48, 22, 1.5], [39, 27, 1.3], [33, 20, 1.3]], SKIN);
  const m = canvas();
  rect(m, 31, 13, 2, 6, SKIN);
  disc(m, 31.5, 8, 5.2, 5.2, SKIN);
  disc(m, 31.5, 8, 3.6, 3.6, TAILC);
  set(m, 30, 6, SKIN);
  set(m, 29, 7, SKIN);
  over(q, m, 0);
  return q;
};

export default function mermaid(): Frame {
  // what can be drawn ahead: the rock, her tail in each flick, her body, her hair in each sway
  const base = rock(), body = figure(), limb = arm();
  const tails = [-1, 0, 1].map(tail);
  const hairs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => hair((i * Math.PI) / 4));
  const FLICK = [1, 2, 2, 1, 0, 0, 1, 2, 1];
  for (const q of [base, body, limb, ...tails, ...hairs]) q.copyWithin(DX, 0, W * H - DX), q.fill(0, 0, DX);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = canvas();
    p.set(base);
    over(p, sea(Math.floor(u / 0.25), Math.floor(u / 0.75) % 2));
    const f = Math.floor((u - 0.6) / 0.14), g = Math.floor((u - 3.6) / 0.14);
    over(p, tails[f >= 0 && f < 9 ? FLICK[f] : g >= 0 && g < 5 ? FLICK[g] : 1]);
    over(p, body);
    over(p, hairs[Math.floor(u / 0.375) % 8]);
    over(p, limb);
    return emit(p, color);
  };
}
