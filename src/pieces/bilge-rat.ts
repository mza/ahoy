/*
 * bilge-rat: a ship's rat, side on, sitting up on its haunches on a plank
 * with a ship's biscuit in its paws. It nibbles the biscuit away a bite
 * at a time, its jaw going, and then has a new one; its whiskers twitch and
 * its long pink tail flicks.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. The rat is built in layers (tail, body, head,
 * biscuit, paw), each laid over the last with a black gap cut round it, the
 * fur shaded down its right-hand edges. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "bilge rat",
  category: "scenes",
  note: "a ship's rat sitting up on a plank, nibbling a ship's biscuit",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // fur and its shade, wood, the pink of ears, paws and tail, bone
  palette: ["#8a94a6", "#59616f", "#a8703a", "#f08a9b", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const FUR = 1, DARK = 2, WOOD = 3, PINK = 4, BONE = 5;

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
// Fur's right-hand edges in its shade, two pixels deep, as if lit from the left.
const shade = (p: Uint8Array) => {
  for (let y = 0; y < H; y++)
    for (let x = W - 1; x >= 0; x--) if (p[y * W + x] === FUR && (x > W - 3 || !p[y * W + x + 1] || !p[y * W + x + 2])) p[y * W + x] = DARK;
  return p;
};

// ---- the rat

const LOOP = 6;
const BITE = 1.2; // seconds a bite
const BX = 16, BY = 36; // the middle of the biscuit
const BITES = [[11, 31], [17, 30], [10.5, 37], [15.5, 35]]; // where each bite comes out of it

// The plank it sits on: two boards butted end to end, their grain, and a nail either side of the join.
const plank = () => {
  const q = canvas();
  rect(q, 7, 58, 67, 6, WOOD);
  rect(q, 53, 58, 1, 6, 0);
  for (const [x, y, w] of [[10, 60, 14], [30, 60, 9], [18, 62, 20], [42, 61, 8], [57, 60, 9], [62, 62, 10]]) rect(q, x, y, w, 1, 0);
  for (const x of [50, 56]) rect(q, x, 59, 1, 1, 0);
  set(q, 7, 58, 0);
  set(q, 73, 63, 0);
  return q;
};

// The tail, its end swung by `k` pixels.
const tail = (k: number) => {
  const q = canvas();
  taper(q, [[58, 52, 1.9], [66, 54, 1.8], [73, 52, 1.6], [76, 46, 1.4], [74 + k * 0.5, 39, 1.2], [70 + k, 34, 1], [69 + k * 2, 28, 0.8], [71 + k * 3, 23, 0.6]], PINK);
  return q;
};

// The body: haunch, chest and shoulders, the line of the thigh, and the hind foot.
const trunk = () => {
  const q = canvas();
  disc(q, 47, 41, 15, 14.5, FUR);
  disc(q, 38, 31, 10, 11, FUR);
  disc(q, 36, 24, 8, 8, FUR);
  shade(q);
  for (let a = 75; a <= 215; a += 2) set(q, 47 + 11 * Math.cos((a * Math.PI) / 180), 43 - 11 * Math.sin((a * Math.PI) / 180), 0);
  const f = canvas();
  rect(f, 27, 53, 13, 3, PINK);
  rect(f, 37, 51, 4, 2, PINK);
  set(f, 27, 53, 0);
  for (const x of [29, 31]) rect(f, x, 55, 1, 1, 0);
  over(q, f);
  return q;
};

// The head: a pointed snout with a pink nose and two long teeth, a bead of an eye, round ears, whiskers.
const head = (jaw: number, twitch: number) => {
  const q = canvas();
  disc(q, 25.5, 8.5, 4.6, 4.6, DARK);
  const h = canvas();
  disc(h, 28, 19, 8.5, 7.5, FUR);
  poly(h, [[23, 12], [12, 20], [10, 23], [11, 26], [26, 26.5]], FUR);
  shade(h);
  disc(h, 10.5, 23, 1.7, 1.7, PINK);
  disc(h, 23, 18, 2, 2, 0);
  set(h, 22, 17, BONE);
  // the teeth, and the jaw under them
  rect(h, 14, 27, 1, 2, BONE);
  rect(h, 16, 27, 1, 2, BONE);
  rect(h, 18, 27 + jaw, 7, 2, FUR);
  rect(h, 20, 29 + jaw, 5, 1, FUR);
  over(q, h);
  const e = canvas();
  disc(e, 33.5, 10, 6.3, 6.3, FUR);
  shade(e);
  disc(e, 33, 10, 3.8, 3.8, PINK);
  over(q, e);
  // whiskers, fanned from the cheek above and below the nose
  const t = twitch;
  line(q, 12, 18, 6, 14 + t, BONE);
  line(q, 10, 20, 2, 18 + t, BONE);
  line(q, 12, 28, 3, 29 - t, BONE);
  line(q, 13, 29, 7, 33 - t, BONE);
  return q;
};

// The biscuit with `n` bites out of it, pricked with holes, and the paw that holds it.
const biscuit = (n: number) => {
  const q = canvas();
  disc(q, BX, BY, 6.5, 6.5, BONE);
  for (const [x, y] of [[13, 34], [17, 34], [13, 38], [17, 38], [15, 36], [15, 40], [15, 32]]) set(q, x, y, 0);
  for (const [x, y] of BITES.slice(0, n)) disc(q, x, y, 3.3, 3.3, 0);
  return q;
};
const paw = () => {
  const q = canvas();
  taper(q, [[33, 33, 2.4], [26, 36, 1.8]], FUR);
  return q;
};
// Its fingers, over the edge of the biscuit.
const fingers = (p: Uint8Array) => {
  rect(p, 19, 36, 6, 4, PINK);
  rect(p, 18, 36, 1, 1, PINK);
  rect(p, 18, 38, 1, 1, PINK);
  rect(p, 19, 37, 3, 1, 0);
  rect(p, 19, 39, 2, 1, 0);
  return p;
};

export default function bilgeRat(): Frame {
  // what can be drawn ahead: the plank and body, the tail in each swing, the heads, the biscuits
  const base = plank();
  over(base, trunk());
  const tails = [-1, 0, 1].map(tail);
  const heads = [0, 1].map((jaw) => [0, 1].map((tw) => head(jaw, tw)));
  const biscuits = [0, 1, 2, 3, 4].map(biscuit);
  const hand = paw();
  const SWING = [1, 2, 2, 1, 0, 0, 1, 2, 1];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, n = Math.floor(u / BITE), b = u - n * BITE;
    const p = canvas();
    const f = Math.floor((u - 2.7) / 0.12), g = Math.floor((u - 5.1) / 0.12);
    p.set(tails[f >= 0 && f < 9 ? SWING[f] : g >= 0 && g < 5 ? SWING[g] : 1]);
    over(p, base);
    // it bites as each bite begins, then chews with its jaw and whiskers going
    const chew = b < 0.8 ? Math.floor(b / 0.1) % 2 : 0, dip = n > 0 && b < 0.2 ? 1 : 0;
    const h = canvas();
    h.set(heads[chew][b < 0.8 ? Math.floor(b / 0.2) % 2 : 0].subarray(0, W * (H - dip)), dip * W);
    over(p, h);
    over(p, hand);
    over(p, biscuits[n]);
    fingers(p);
    // a crumb falls from each bite
    if (n > 0 && b < 0.5) set(p, 11, 42 + Math.round(b * b * 60), BONE);
    return emit(p, color);
  };
}
