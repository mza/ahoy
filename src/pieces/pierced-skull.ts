/*
 * pierced-skull: a scowling skull over crossed bones, with a dagger driven
 * straight down through the top of it: the gold hilt stands on the crown and
 * the point comes out under the chin. The dagger quivers now and then, and a
 * single red drop gathers on its point and falls.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat colours.
 * The skull is drawn pixel by pixel from a dome, a face and a jaw, with its
 * right-hand edges in shade; black gaps keep the shapes apart, so it reads in
 * one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "pierced skull",
  category: "scenes",
  note: "a skull and crossbones with a dagger through its crown, dripping red",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, iron, hilt gold, blood
  palette: ["#e8e2d0", "#9c9682", "#8a94a6", "#f2b632", "#e23a2e"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, IRON = 3, GOLD = 4, RED = 5;

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

// ---- the skull and the dagger

const CX = 40, TOP = 11;
const HEAD: Head = {
  rw: 17, rc: 13,
  face: [[0, 17], [5, 17], [8, 16], [10, 14], [12, 11], [18, 10]],
  eye: [8, 3, 5, 4], brow: [-2, 0.5],
  nose: [8], nostrils: [0, 1, 1, 2, 2],
  teeth: [4, 8, 4],
};
const JAW = [[0, 10], [3, 10], [5, 8], [6, 6]];
// A crack running from where the blade went in.
const CRACK = [[4, 3], [5, 4], [5, 5], [6, 6], [7, 6], [8, 7], [8, 8], [9, 9], [-4, 3], [-5, 4], [-6, 4], [-7, 5]];
const DROP = [".r.", "rrr", "rrr", ".r."];
const QUIVER = [1, -1, 1, -1, 1, -1, 1, 0, -1, 0];
const LOOP = 5;

export default function piercedSkull(): Frame {
  // what never moves: the bones, one over the other, and the skull over both
  const still = new Uint8Array(W * H), b = new Uint8Array(W * H), sk = new Uint8Array(W * H);
  bone(still, 9, 9, 71, 55, BONE);
  bone(b, 71, 9, 9, 55, BONE);
  over(still, b);
  const end = head(sk, CX, TOP, HEAD);
  const chin = jaw(sk, CX, end + 2, JAW, [3, 8, 4]);
  for (const [x, y] of CRACK) set(sk, CX + x, TOP + y, 0);
  over(still, sk, 2, true);
  // a slot in the crown and one in the chin, for the blade to stand in
  rect(still, CX - 4, TOP, 9, 3, 0);
  rect(still, CX - 4, chin - 1, 9, 2, 0);
  shade(still);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the dagger, a pixel to either side as it quivers
    const q = Math.floor((u - 1) / 0.05), x = CX + (q >= 0 && q < QUIVER.length ? QUIVER[q] : 0);
    disc(p, x, 1.5, 2.7, 2.2, GOLD);
    rect(p, x - 1, 3, 3, 5, GOLD);
    rect(p, x - 7, 8, 15, 2, GOLD);
    rect(p, x - 8, 9, 2, 2, GOLD);
    rect(p, x + 7, 9, 2, 2, GOLD);
    rect(p, x - 2, 10, 5, TOP + 3 - 10, IRON);
    rect(p, x - 2, 10, 1, TOP + 3 - 10, BONE);
    for (let y = chin - 1; y < chin + 9; y++) {
      const half = y < chin + 3 ? 2 : y < chin + 7 ? 1 : 0;
      rect(p, x - half, y, 2 * half + 1, 1, IRON);
      if (half) set(p, x - half, y, BONE);
    }
    // the drop: it gathers on the point, falls, and splashes
    const d = u - 1.8, dy = chin + 10;
    if (d >= 0 && d < 0.3) set(p, x, dy, RED);
    else if (d >= 0.3 && d < 0.7) rect(p, x, dy, 1, 2, RED);
    else if (d >= 1.3 && d < 1.6) for (const [sx, sy] of [[-3, 62], [3, 62], [-2, 63], [-1, 63], [1, 63], [2, 63]]) set(p, x + sx, sy, RED);
    else if (d >= 0.7 && d < 1.3) sprite(p, x - 1, dy + Math.round(9 * (d - 0.7) ** 2), DROP, { r: RED });
    return emit(p, color);
  };
}
