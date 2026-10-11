/*
 * kraken-arms: a small ship caught by a kraken. Four great arms rise out of
 * the sea around her and over her, thick at the root and tapering to curled
 * tips, a row of suckers down the inside of each. They sway and tighten in a
 * slow four-pose cycle, and the ship rocks and tilts in their grip.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. An arm is a run of discs along a path that
 * curls harder towards its tip, shaded down its right-hand edge; the ship is
 * drawn turned about her keel, and the arms are laid over her with a black
 * gap cut round each, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "kraken arms",
  category: "scenes",
  note: "a small ship rocking in the grip of four great kraken arms",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sea blue, blood's shade, blood red, wood, bone
  palette: ["#3a7ca5", "#9a231b", "#e23a2e", "#a8703a", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const SEA = 1, DEEP = 2, RED = 3, WOOD = 4, BONE = 5;

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
// A filled polygon, by scanline.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) set(p, x, y, k);
  }
};
// Lay one canvas over another, with a black gap cut around everything on it.
const over = (p: Uint8Array, q: Uint8Array, gap = 1) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
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

// ---- the kraken and her catch

// An arm: where it leaves the sea, its heading there in degrees (-90 is straight up), its length,
// its thickness at the root, how it bends all along, how hard it curls at the tip (positive is
// clockwise), how far along the curl begins, how far it sways, and where in the cycle it is.
type Arm = { x: number; a: number; len: number; r: number; k0: number; k1: number; f0: number; sway: number; ph: number };
const OUTER: Arm[] = [
  { x: 7, a: -88, len: 72, r: 4.4, k0: 0.001, k1: 0.36, f0: 0.5, sway: 4, ph: 0 },
  { x: 73, a: -92, len: 68, r: 4.4, k0: -0.001, k1: -0.38, f0: 0.48, sway: 4, ph: 1.6 },
];
const FRONT: Arm[] = [
  { x: 27, a: -86, len: 36, r: 3.4, k0: 0.002, k1: 0.66, f0: 0.42, sway: 3, ph: 4.2 },
  { x: 54, a: -96, len: 34, r: 3.4, k0: -0.002, k1: -0.7, f0: 0.42, sway: 3, ph: 2.3 },
];
const POSES = 4, HOLD = 0.8, LOOP = POSES * HOLD;
const SEA_TOP = 52;
// A swell, sixteen pixels long: how far below its crest the water is at each pixel.
const SWELL = Array.from({ length: 16 }, (_, i) => Math.round(1 - Math.cos((i / 16) * 2 * Math.PI)));

// One arm in one pose, on a canvas of its own.
const arm = (A: Arm, pose: number) => {
  const q = new Uint8Array(W * H), w = (pose / POSES) * 2 * Math.PI + A.ph;
  let x = A.x, y = 60, th = ((A.a + A.sway * Math.sin(w)) * Math.PI) / 180;
  const grip = 1 + 0.14 * Math.cos(w);
  const pts: number[][] = [];
  for (let s = 0; s <= A.len; s += 0.5) {
    const f = s / A.len, r = A.r * (1 - f) ** 0.7 + 0.8;
    disc(q, x, y, r, r, RED);
    pts.push([x, y, th, r, s]);
    th += 0.5 * (A.k0 + A.k1 * grip * Math.max(0, (f - A.f0) / (1 - A.f0)) ** 1.5);
    x += 0.5 * Math.cos(th), y += 0.5 * Math.sin(th);
  }
  // shade down the right-hand edge
  for (let yy = 0; yy < H; yy++)
    for (let xx = 0; xx < W; xx++) if (q[yy * W + xx] === RED && (xx === W - 1 || !q[yy * W + xx + 1])) q[yy * W + xx] = DEEP;
  // suckers down the inside of the curl
  const side = Math.sign(A.k1);
  for (const [px, py, t, r, s] of pts) {
    if (s % 4 !== 0 || r < 1.7) continue;
    set(q, px - Math.sin(t) * side * (r - 1.6), py + Math.cos(t) * side * (r - 1.6), BONE);
  }
  return q;
};

// The ship, turned `deg` degrees about her keel and set `bob` pixels lower.
const ship = (deg: number, bob: number) => {
  const q = new Uint8Array(W * H), c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  const at = (x: number, y: number) => [39 + x * c - y * s, 50 + bob + x * s + y * c];
  const seg = (x0: number, y0: number, x1: number, y1: number, k: number, thick = 1) => {
    const [a, b] = at(x0, y0), [d, e] = at(x1, y1);
    line(q, a, b, d, e, k, thick);
  };
  // stays, mast, bowsprit
  seg(0, -41, 27, -19, BONE), seg(0, -41, -19, -16, BONE);
  seg(0, -42, 0, -12, WOOD, 2);
  seg(18, -15, 27, -19, WOOD, 2);
  // the hull, a raised stern, a seam and three ports
  poly(q, [[-19, -16], [-11, -16], [-11, -12], [12, -12], [15, -14], [21, -15], [15, -4], [11, 0], [-13, 0], [-17, -5]].map(([x, y]) => at(x, y)), WOOD);
  seg(-17, -9, 17, -9, 0);
  for (const x of [-9, -3, 3, 9]) seg(x, -5, x + 1, -5, 0, 2);
  // the yard and the sail under it, bellied, with two seams
  const cloth = new Uint8Array(W * H);
  poly(cloth, [[-10, -37], [10, -37], [12, -27], [11, -17], [-11, -17], [-9, -27]].map(([x, y]) => at(x, y)), BONE);
  for (const x of [-3, 4]) {
    const [a, b] = at(x, -36), [d, e] = at(x + 1, -18);
    line(cloth, a, b, d, e, 0);
  }
  const [a, b] = at(-12, -39), [d, e] = at(12, -39);
  over(q, cloth);
  line(q, a, b, d, e, WOOD);
  return q;
};

export default function krakenArms(): Frame {
  // each pose whole: the ship, then the arms over her
  const poses = Array.from({ length: POSES }, (_, i) => {
    const p = new Uint8Array(W * H);
    over(p, ship([-9, -5, -11, -6][i], [0, 1, 0, -1][i]));
    for (const A of [...OUTER, ...FRONT]) over(p, arm(A, i));
    return p;
  });

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(poses[Math.floor(u / HOLD) % POSES]);
    // the sea closes over the arms' roots: a black gap, then rows of swell, each sliding its own way, foam on some crests
    rect(p, 0, SEA_TOP - 1, W, H - SEA_TOP + 1, 0);
    for (let r = 0; r < 4; r++) {
      const off = Math.floor(u * [5, -5, 10, -5][r]) + r * 5;
      for (let x = 0; x < W; x++) {
        const i = (((x + off) % 16) + 16) % 16, y = SEA_TOP + r * 3 + (r > 0 ? 2 + (SWELL[i] >> 1) : SWELL[i]);
        set(p, x, y, SEA);
        if (r === 0) set(p, x, y + 1, SEA);
        if (i < 3 && (Math.floor((x + off) / 16) + r) % 3 === 0) set(p, x, y, BONE);
      }
    }
    return emit(p, color);
  };
}
