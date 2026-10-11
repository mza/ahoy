/*
 * rose-roger: a round-eyed skull with a red rose clenched in its teeth, the
 * bloom at one side of its mouth and a leaf at the other, over two crossed
 * cutlasses. A glint runs up one blade, and now and then a petal comes away
 * from the rose and flutters down.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat colours.
 * The skull is drawn pixel by pixel from a dome, a face and a jaw, with its
 * right-hand edges in shade, and each blade from a curve, with a bright edge
 * and a groove; black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "rose roger",
  category: "scenes",
  note: "a skull over crossed cutlasses, a red rose in its teeth shedding a petal",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // iron, bone and its shade, palm green, rose red
  palette: ["#8a94a6", "#e8e2d0", "#9c9682", "#4fa35a", "#e23a2e"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, BONE = 2, SHADE = 3, GREEN = 4, RED = 5;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;

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
// One canvas laid over another, with a black gap cut around it first. With `solid` the gap is cut around the whole
// of each row of it, end to end, so nothing shows through the holes in it.
const over = (dst: Uint8Array, src: Uint8Array, gap = 1, solid = false) => {
  for (let y = 0; y < H; y++) {
    let lo = W, hi = -1;
    for (let x = 0; x < W; x++) if (src[y * W + x]) (lo = Math.min(lo, x)), (hi = x);
    for (let x = lo; x <= hi; x++) if (solid || src[y * W + x]) rect(dst, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  }
  for (let i = 0; i < src.length; i++) if (src[i]) dst[i] = src[i];
};
// A round-ended bar from one point to another, `r` either side of its middle.
const bar = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, r: number, k: number) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) disc(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, r, k);
};
// A bone from one end to the other: a shaft, and two round knuckles at each end.
const bone = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number) => {
  const l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l;
  bar(p, x0, y0, x1, y1, 1.9, k);
  for (const [x, y, s] of [[x0, y0, -1], [x1, y1, 1]])
    for (const side of [-1, 1]) disc(p, x + ux * s * 1.5 - uy * side * 3, y + uy * s * 1.5 + ux * side * 3, 2.7, 2.7, k);
};
// Bone's right-hand edges in its shade, as if lit from the left; a gap one pixel wide casts none.
const shade = (p: Uint8Array) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (p[y * W + x] === BONE && (x > W - 3 || (!p[y * W + x + 1] && !p[y * W + x + 2]))) p[y * W + x] = SHADE;
};
// A value read off a list of [at, value] knots, straight between them.
const knots = (k: number[][], v: number) => {
  for (let i = 1; i < k.length; i++) if (v <= k[i][0]) return k[i - 1][1] + ((k[i][1] - k[i - 1][1]) * Math.max(0, v - k[i - 1][0])) / (k[i][0] - k[i - 1][0]);
  return k[k.length - 1][1];
};
// A row of pixels, `half` either side of column cx.
const span = (p: Uint8Array, cx: number, y: number, half: number, k: number) => rect(p, cx - Math.round(half), y, 2 * Math.round(half) + 1, 1, k);
// A row of teeth: a band of bone with a one-pixel gap every `pitch`.
const teeth = (p: Uint8Array, cx: number, y: number, h: number, half: number, pitch: number) => {
  for (let x = cx - half; x <= cx + half; x++) if ((x - cx) % pitch === 0) rect(p, x, y, 1, h, 0);
};
// A skull's head, front on, from its crown at `top` down to the tips of its top teeth: a dome, then the face as
// knots of [rows below the dome's middle, half width]; sockets cut by a brow; a nose like a heart upside down.
type Head = { rw: number; rc: number; face: number[][]; eye: number[]; brow: number[]; nose: number[]; nostrils: number[]; teeth: number[] };
const head = (p: Uint8Array, cx: number, top: number, o: Head) => {
  const mid = top + o.rc, end = mid + o.face[o.face.length - 1][0];
  for (let y = top; y <= mid; y++) span(p, cx, y, o.rw * Math.sqrt(1 - ((mid - y) / (o.rc + 0.6)) ** 2), BONE);
  for (let y = mid + 1; y <= end; y++) span(p, cx, y, knots(o.face, y - mid), BONE);
  const [ex, ey, rx, ry] = o.eye;
  for (const s of [-1, 1])
    for (let y = mid + ey - ry; y <= mid + ey + ry; y++)
      for (let x = cx + s * ex - rx - 1; x <= cx + s * ex + rx + 1; x++) {
        const dx = (x - cx - s * ex) * s, dy = y - mid - ey;
        if ((dx / (rx + 0.4)) ** 2 + (dy / (ry + 0.4)) ** 2 < 1 && dy > o.brow[0] - o.brow[1] * dx) set(p, x, y, 0);
      }
  const ny = mid + o.nose[0];
  o.nostrils.forEach((half, j) => span(p, cx, ny + j, half, 0));
  set(p, cx, ny + o.nostrils.length - 1, BONE);
  teeth(p, cx, end - o.teeth[0] + 1, o.teeth[0], o.teeth[1], o.teeth[2]);
  return end;
};
// The jaw under it: bottom teeth, then the chin, as knots of [rows down, half width].
const jaw = (p: Uint8Array, cx: number, y: number, shape: number[][], t: number[]) => {
  const n = shape[shape.length - 1][0];
  for (let j = 0; j <= n; j++) span(p, cx, y + j, knots(shape, j), BONE);
  teeth(p, cx, y, t[0], t[1], t[2]);
  return y + n;
};

// ---- the skull, the rose and the cutlasses

const CX = 40, TOP = 7;
const HEAD: Head = {
  rw: 18, rc: 14,
  face: [[0, 18], [7, 18], [10, 16], [13, 12], [19, 11]],
  eye: [8, 4, 5, 5], brow: [-9, 0],
  nose: [9], nostrils: [0, 1, 1, 2, 2, 3],
  teeth: [4, 9, 3],
};
const JAW = [[0, 11], [4, 11], [6, 9], [8, 6]];
const BLOOM = [
  ".....rrrrr.....",
  "...rrrrrrrrr...",
  "..rrr_____rrr..",
  ".rrr_rrrrr_rrr.",
  ".rr_rrr__rr_rr.",
  "rrr_rr_rr_r_rrr",
  "rr_rrr_r__r_rrr",
  "rr_rrr_rrrr_rrr",
  "rrr_rrr____rrr.",
  ".rrr_rrrrrrrr_.",
  ".rrrr______rrr.",
  "..rrrrrrrrrrr..",
  "....rrrrrrr....",
];
const LEAF = [
  "...ggggg....",
  ".ggggggggg..",
  "ggggg___ggg.",
  "gggggggggggg",
  "..gggggggggg",
];
const PETAL = [[".rr", "rrr", "rr."], ["rr.", "rrr", ".rr"]];
// A blade's spine as a curve, from the guard up to the point; the other cutlass is its mirror image.
const P0 = [18, 55], P1 = [50, 44], P2 = [74, 4];
const at = (s: number) => {
  const a = 1 - s;
  return [a * a * P0[0] + 2 * a * s * P1[0] + s * s * P2[0], a * a * P0[1] + 2 * a * s * P1[1] + s * s * P2[1]];
};
// How far the blade reaches from its spine on the edge's side: broadening, then cut away up to the back.
const reach = (s: number) => (2 + 2.8 * s) * (s < 0.8 ? 1 : 1 - ((s - 0.8) / 0.2) ** 2);
const LOOP = 6, GLINT = [0.5, 1.5], FALL = [1.5, 4.5];

export default function roseRoger(): Frame {
  // one cutlass: for each pixel the nearest point of the spine, and how far off it and to which side
  const one = new Uint8Array(W * H), along = new Float32Array(W * H).fill(-1);
  const N = 300;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let best = 99, s = 0;
      for (let i = 0; i <= N; i++) {
        const [bx, by] = at(i / N), d = Math.hypot(x - bx, y - by);
        if (d < best) (best = d), (s = i / N);
      }
      const [bx, by] = at(s), [ex, ey] = at(s + 0.01), l = Math.hypot(ex - bx, ey - by);
      const tx = (ex - bx) / l, ty = (ey - by) / l, off = (x - bx) * -ty + (y - by) * tx;
      if (Math.abs((x - bx) * tx + (y - by) * ty) > 0.8 || off < -2.3 || off > reach(s)) continue;
      // the edge bright, a groove a little way in from the back, the rest iron
      one[y * W + x] = off > reach(s) - 1 ? BONE : off > -1.1 && off <= -0.1 && s > 0.08 && s < 0.9 ? 0 : IRON;
      along[y * W + x] = s;
    }
  // its hilt: a guard across the blade, the grip and the pommel
  const l = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), tx = (P1[0] - P0[0]) / l, ty = (P1[1] - P0[1]) / l;
  const h = (f: number, side: number) => [P0[0] - tx * f - ty * side, P0[1] - ty * f + tx * side];
  const part = (a: number[], b: number[], r: number) => bar(one, a[0], a[1], b[0], b[1], r, IRON);
  part(h(3.4, -6), h(3.4, 7), 1.3);
  part(h(5, 0), h(11, 0), 1.7);
  part(h(12.5, 0), h(12.5, 0), 2.4);

  // both, the second laid over the first; then the skull over the crossing, and the rose in its teeth
  const still = new Uint8Array(one), two = new Uint8Array(W * H), sk = new Uint8Array(W * H), rose = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) two[y * W + x] = one[y * W + W - x];
  over(still, two);
  const blades = new Uint8Array(still);
  const end = head(sk, CX, TOP, HEAD);
  jaw(sk, CX, end + 5, JAW, [3, 9, 3]);
  shade(sk);
  over(still, sk, 2, true);
  rect(still, CX - 15, end + 1, 31, 4, 0);
  rect(rose, 20, end + 2, 38, 2, GREEN);
  set(rose, 24, end + 4, GREEN);
  set(rose, 54, end + 1, GREEN);
  sprite(rose, 10, end - 2, LEAF, { g: GREEN });
  sprite(rose, 56, end - 4, BLOOM, { r: RED });
  over(still, rose);
  const own = new Float32Array(W * H).fill(-1);
  for (let i = 0; i < own.length; i++) if (along[i] >= 0 && !two[i] && !sk[i] && still[i] && still[i] === blades[i]) own[i] = along[i];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the glint: a band of light across the blade, running up it, a black line either side
    if (u >= GLINT[0] && u < GLINT[1]) {
      const s = ((u - GLINT[0]) / (GLINT[1] - GLINT[0])) * 1.1;
      for (let i = 0; i < p.length; i++) {
        const far = Math.abs(own[i] - s);
        if (own[i] >= 0 && far < 0.055) p[i] = far < 0.03 ? BONE : 0;
      }
    }
    // the petal: it comes away from the bloom and flutters down, a black line round it
    if (u >= FALL[0] && u < FALL[1]) {
      const k = (u - FALL[0]) / (FALL[1] - FALL[0]);
      const x = Math.round(63 + 4 * Math.sin(k * 9) + 4 * k), y = Math.round(end + 9 + 20 * k);
      rect(p, x - 1, y - 1, 5, 5, 0);
      sprite(p, x, y, PETAL[Math.floor(u * 4) % 2], { r: RED });
    }
    return emit(p, color);
  };
}
