/*
 * cutlass-bite: a heavy-browed skull with a cutlass gripped crosswise in its
 * teeth, the blade running out to one side and the gold hilt to the other,
 * over crossed bones. The skull grinds its jaw a pixel from side to side, and
 * a glint runs along the blade from the hilt to the point.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * The skull is drawn pixel by pixel from a dome, a face and a jaw, with its
 * right-hand edges in shade; black gaps keep the shapes apart, so it reads in
 * one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "cutlass bite",
  category: "scenes",
  note: "a skull over crossed bones, a cutlass clenched in its grinding teeth",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // iron, bone and its shade, hilt gold
  palette: ["#8a94a6", "#e8e2d0", "#9c9682", "#f2b632"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, BONE = 2, SHADE = 3, GOLD = 4;

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

// ---- the skull and the cutlass

const CX = 40, TOP = 5;
const HEAD: Head = {
  rw: 18, rc: 12,
  face: [[0, 18], [6, 18], [9, 17], [11, 14], [13, 12], [17, 12]],
  eye: [8, 3, 5, 4], brow: [-2.5, 0],
  nose: [8], nostrils: [0, 1, 1, 2, 2],
  teeth: [4, 10, 4],
};
const JAW = [[0, 12], [4, 12], [6, 10], [8, 7]];
// The blade, column by column: where its back is, and how thick it is there. It lifts and broadens towards the
// point, where the edge is cut away up to the back.
const B0 = 22, B1 = 77, BY = 36;
const back = (x: number) => BY - Math.round(x < 57 ? 0 : ((x - 57) / 20) ** 2 * 8);
const thick = (x: number) => Math.max(1, Math.round((6 + (x < 57 ? 0 : (x - 57) / 8)) * (x < 70 ? 1 : 1 - ((x - 70) / 8) ** 2)));
const GRIND = [0, 1, 0, -1];
const LOOP = 4.8, GLINT = [1.7, 2.7];

export default function cutlassBite(): Frame {
  // what never moves: the bones, one over the other, and the head over both
  const still = new Uint8Array(W * H), b = new Uint8Array(W * H), sk = new Uint8Array(W * H);
  bone(still, 9, 9, 71, 57, BONE);
  bone(b, 71, 9, 9, 57, BONE);
  over(still, b);
  const end = head(sk, CX, TOP, HEAD), jy = end + 10;
  over(still, sk, 2, true);
  // room for the mouth and for the jaw to move in
  jaw(b.fill(0), CX, jy, JAW, [4, 10, 4]);
  over(still, b, 3, true);
  for (let i = 0; i < b.length; i++) if (b[i]) still[i] = 0;
  rect(still, CX - 15, end + 1, 31, 9, 0);
  shade(still);
  // the jaw, a pixel to either side
  const jaws = [-1, 0, 1].map((dx) => {
    const j = new Uint8Array(W * H);
    jaw(j, CX + dx, jy, JAW, [4, 10, 4]);
    shade(j);
    return j;
  });
  // the cutlass: the blade with a groove along it and a bright edge below, then the hilt
  const c = new Uint8Array(W * H);
  for (let x = B0; x <= B1; x++) {
    rect(c, x, back(x), 1, thick(x), IRON);
    set(c, x, back(x) + thick(x), BONE);
    if (x > B0 + 2 && x < 68) set(c, x, back(x) + 2, 0);
  }
  rect(c, 18, 33, 3, 14, GOLD);
  rect(c, 17, 32, 5, 2, GOLD);
  rect(c, 17, 46, 5, 2, GOLD);
  rect(c, 8, 37, 10, 5, GOLD);
  for (const x of [10, 13, 16]) rect(c, x, 37, 1, 5, 0);
  disc(c, 5, 39, 3.2, 3.2, GOLD);
  bar(c, 17, 47, 9, 47, 0.8, GOLD);
  bar(c, 9, 47, 4, 43, 0.8, GOLD);
  over(still, c);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    const j = jaws[1 + GRIND[Math.floor(u / 0.3 + 1e-6) % 4]];
    for (let i = 0; i < j.length; i++) if (j[i]) p[i] = j[i];
    // the glint: a slanted band of light running out along the blade, a black line either side of it
    if (u >= GLINT[0] && u < GLINT[1]) {
      const g = B0 + ((u - GLINT[0]) / (GLINT[1] - GLINT[0])) * (B1 - B0 + 8);
      for (let x = B0; x <= B1; x++)
        for (let y = back(x); y < back(x) + thick(x); y++) {
          const far = Math.abs(x + (y - back(x)) - g);
          if (far < 3.5) set(p, x, y, far < 2 ? BONE : 0);
        }
    }
    return emit(p, color);
  };
}
