/*
 * seagull: a fat gull perched on a wooden mooring post with rope round it,
 * the sea lapping at its foot. It looks the other way, looks back, throws its
 * beak open to squawk, flaps its wings once and settles.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. The gull is discs and filled outlines: a
 * body, a head that can face either way with its beak shut or open, and three
 * wings, swapped by time; feather lines, rope strands and wood grain are
 * single pixels left empty. It reads in one ink too.
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
const disc = (p: Uint8Array, cx: number, cy: number, rx: number, ry: number, k: number) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) set(p, x, y, k);
};
const line = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) set(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, k);
};
type Pt = [number, number];
// A filled outline, moved by (dx, dy): a pixel is inside if a ray to its left crosses the edges an odd number of times.
const poly = (p: Uint8Array, pts: Pt[], k: number, dx = 0, dy = 0) => {
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (const [x, y] of pts) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
  for (let y = Math.floor(y0); y <= y1; y++)
    for (let x = Math.floor(x0); x <= x1; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < xi + ((xj - xi) * (y + 0.5 - yi)) / (yj - yi)) inside = !inside;
      }
      if (inside) set(p, x + dx, y + dy, k);
    }
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

// ---- the gull, breast to the right, tail to the left

const HX = 51, HY = 10; // the middle of its head
const NECK: Pt[] = [[45, 11], [57, 11], [56, 18], [53, 27], [38, 22], [43, 17]];
const TAIL: Pt[] = [[27, 26], [13, 30], [14, 33], [28, 34]];
// The beak, out from the middle of the head and down from it: shut, and its two halves thrown open.
const BEAK: Pt[] = [[6, -2.5], [10, -2], [13, -0.5], [14, 1], [13.5, 3], [12.5, 3], [12, 1.5], [6, 2]];
const UPPER: Pt[] = [[6, -3.5], [11, -7], [14, -7.5], [14.5, -5.5], [13, -5], [7, -0.5]];
const LOWER: Pt[] = [[6, 0.5], [12, 3], [12, 4.5], [6, 3]];
// The wings: folded along the back, thrown up, and beating down. Each is an outline, then the feather lines in it.
const WINGS: { edge: Pt[]; lines: number[][] }[] = [
  {
    edge: [[47, 19], [41, 17], [32, 18], [20, 23], [7, 28], [8, 29.5], [18, 30], [28, 31], [37, 30.5], [44, 28], [47, 24]],
    lines: [[36, 26, 12, 28.6], [38, 28.4, 22, 29.6], [43, 20, 42, 24], [39, 19, 38, 23], [35, 19, 34, 23]],
  },
  {
    edge: [[47, 21], [45, 12], [40, 4], [33, -2], [25, -4], [28, 1], [26, 2], [29, 6], [27, 7], [30, 11], [28, 12], [31, 16], [30, 17], [33, 21]],
    lines: [[28, 1, 37, 6], [29, 6, 39, 11], [30, 11, 41, 16], [31, 16, 38, 18]],
  },
  {
    edge: [[47, 19], [38, 17], [27, 19], [17, 25], [11, 33], [9, 40], [12, 39], [14, 35], [15, 38], [18, 34], [19, 37], [22, 33], [24, 35], [28, 31], [36, 30.5], [44, 28], [47, 24]],
    lines: [[14, 35, 22, 26], [18, 34, 27, 25], [22, 33, 32, 24], [28, 31, 37, 23]],
  },
];
const POST = 33, POST_W = 14, POST_TOP = 42; // the post's left column, its width, its top row
const ROPES = [46, 50]; // the top row of each turn of rope
// The grain: splits in the wood, as [column in from the post's left, first row, last row].
const GRAIN = [[4, 57, 63], [9, 54, 59], [10, 43, 44]];
const LOOP = 6;

export default function seagull(): Frame {
  // what never moves: the post, the body, the legs
  const still = new Uint8Array(W * H);
  rect(still, POST, POST_TOP, POST_W, H - POST_TOP, WOOD);
  for (const x of [POST, POST + POST_W - 1]) set(still, x, POST_TOP, 0);
  for (const [x, y0, y1] of GRAIN) rect(still, POST + x, y0, 1, y1 - y0 + 1, 0);
  for (const y of ROPES) {
    rect(still, POST - 1, y, POST_W + 2, 5, 0);
    rect(still, POST - 1, y + 1, POST_W + 2, 3, BONE);
    // its strands: a slant of empty pixels across it
    for (let x = POST - 1; x <= POST + POST_W; x++) for (let j = 0; j < 3; j++) if ((x + j) % 4 === 0) set(still, x, y + 1 + j, 0);
  }
  disc(still, 37, 27, 15.5, 8.5, BONE);
  poly(still, NECK, BONE);
  poly(still, TAIL, BONE);
  for (const x of [35, 41]) {
    rect(still, x, 35, 2, 5, GOLD);
    rect(still, x, 40, 5, 1, GOLD);
  }
  // each wing laid over what it covers, a pixel of empty kept below it and to its right
  const wings = WINGS.map(({ edge, lines }, i) => {
    const q = new Uint8Array(W * H);
    q.set(still);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) poly(q, edge, 0, dx, dy);
    poly(q, edge, IRON);
    if (i === 1) rect(q, 32, 21, 17, 1, 0);
    for (const [x0, y0, x1, y1] of lines) line(q, x0, y0, x1, y1, 0);
    return q;
  });

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    // the wings: up, down, up, and folded again
    const f = u >= 3.95 && u < 4.85 ? Math.floor((u - 3.95) / 0.18) : -1;
    p.set(wings[f < 0 ? 0 : [1, 2, 1, 2, 1][f]]);

    // the head: a look to the left, back, then a squawk in two barks
    const left = u >= 1.3 && u < 2.4, open = (u >= 2.9 && u < 3.25) || (u >= 3.4 && u < 3.8);
    const d = left ? -1 : 1;
    const turn = (pts: Pt[]) => pts.map(([x, y]): Pt => [HX + 0.5 + d * x, HY + 0.5 + y]);
    disc(p, HX + 0.5, HY + 0.5, 6.7, 6.3, BONE);
    rect(p, HX + d * 2, HY - 2, 2, 2, 0);
    if (open) {
      poly(p, turn(UPPER), GOLD);
      poly(p, turn(LOWER), GOLD);
      // and the noise of it
      for (const [x0, y0, x1, y1] of [[68, 1, 71, -1], [69, 6, 73, 6], [67, 11, 70, 13]]) line(p, x0, y0, x1, y1, BONE);
    } else {
      poly(p, turn(BEAK), GOLD);
      rect(p, HX + (d > 0 ? 8 : -11), HY, 4, 1, 0);
    }

    // the sea at the foot of the post: two lines of wavelets on either side, lapping to and fro
    const lap = Math.floor(t * 3);
    for (let row = 0; row < 2; row++)
      for (let x = 10 + row * 4; x < 70 - row * 4; x++) {
        if (x > POST - 4 - row * 2 && x < POST + POST_W + 3 + row * 2) continue;
        const a = ((x + (row ? -lap : lap)) / 10) * 2 * Math.PI;
        if (Math.sin(a) > -0.75) set(p, x, 58 + row * 4 + Math.round(-Math.sin(a)), BLUE);
      }
    return emit(p, color);
  };
}
