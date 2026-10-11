/*
 * condent-pennant: the banner of Christopher Condent, who took the Indian
 * Ocean for his hunting ground: three skulls and crossbones in a row along a
 * long pennant. They are alike as three peas, and they act in turn: each
 * one's eyes light and its jaw clacks twice, one after another, like a wave
 * running down the row and back to the start.
 *
 * Pixel art in block elements, two square pixels a cell, in three flat
 * colours. Each skull is geometry, a pixel at a time, with its right-hand
 * edges in shade, a jaw of its own and two small bones crossed beneath; the
 * pennant is no more than its two hems. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "condent pennant",
  category: "scenes",
  note: "three skulls and crossbones in a row, clacking one after another",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, and a ghost light for the eyes
  palette: ["#e8e2d0", "#9c9682", "#5fd7c9"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, GLOW = 3;

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

// A shape filled from its outline, a list of corners.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) p[y * W + x] = k;
    }
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
// A bone from one end to the other: a shaft `r` either side of its middle, and two round knuckles at each end.
const bone = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number, r = 2.3, knob = 3.2) => {
  const l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l;
  for (let i = 0; i <= l * 2; i++) disc(p, x0 + (ux * i) / 2, y0 + (uy * i) / 2, r, r, k);
  for (const [x, y, s] of [[x0, y0, -1], [x1, y1, 1]])
    for (const side of [-1, 1]) disc(p, x + ux * s * 1.3 - uy * side * (knob - 0.4), y + uy * s * 1.3 + ux * side * (knob - 0.4), knob, knob, k);
};
// A colour's right-hand edges in its shade, as if lit from the left; a gap one pixel wide casts none.
const shade = (p: Uint8Array, from: number, to: number) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (p[y * W + x] === from && (x > W - 3 || (!p[y * W + x + 1] && !p[y * W + x + 2]))) p[y * W + x] = to;
};
// The same for a shape with holes in it: only the last `n` pixels of each of its rows.
const rim = (p: Uint8Array, from: number, to: number, n = 1) => {
  for (let y = 0; y < H; y++) {
    let hi = W - 1;
    while (hi >= 0 && !p[y * W + hi]) hi--;
    for (let x = hi; x > hi - n && x >= 0 && p[y * W + x] === from; x--) p[y * W + x] = to;
  }
};

// ---- one skull and crossbones, drawn about column CX with its crown on row Y

const CX = 13, Y = 7;
const STEP = 27; // from one skull to the next
// Half the skull's width on row j from the crown: the cranium, the cheekbones, then the block the teeth sit in.
const halfAt = (j: number) => (j < 14 ? 11.6 * Math.sqrt(1 - ((j - 9.5) / 10) ** 2) : j < 17 ? 10.6 - (j - 14) : 7.6);
const CHIN = [7.6, 7.6, 7.6, 6.6, 5.6, 3.6]; // the jaw's rows
const NOSE = [".#.", "###", "#.#"];
const CRACK = [[3, 1], [3, 2], [4, 3], [3, 4], [4, 5], [5, 6]];
const span = (p: Uint8Array, y: number, half: number, k: number) => {
  for (let x = Math.ceil(CX - half); x < CX + half; x++) set(p, x, y, k);
};

const TURN = 0.8; // how long each skull has the stage
const LOOP = 4;
const CLACK = [1, 0, 1, 1, 0, 0, 0, 0]; // the jaw through a turn, a step every tenth of a second: dropped or not

export default function condentPennant(): Frame {
  // the head, the jaw and the bones, each on a canvas of its own
  const head = new Uint8Array(W * H), jaw = new Uint8Array(W * H), bones = new Uint8Array(W * H), b = new Uint8Array(W * H);
  for (let j = 0; j < 21; j++) span(head, Y + j, halfAt(j), BONE);
  for (const s of [-1, 1]) disc(head, CX + s * 5, Y + 11, 3.5, 3.4, 0);
  sprite(head, CX - 1, Y + 15, NOSE, { "#": 0 });
  for (let x = CX - 6; x <= CX + 6; x += 3) rect(head, x, Y + 18, 1, 3, 0);
  for (const [x, y] of CRACK) set(head, CX + x, Y + y, 0);
  CHIN.forEach((half, j) => span(jaw, Y + 22 + j, half, BONE));
  for (let x = CX - 6; x <= CX + 6; x += 3) rect(jaw, x, Y + 22, 1, 2, 0);
  bone(bones, CX - 8, Y + 34, CX + 8, Y + 46, BONE, 1.6, 2.2);
  bone(b, CX + 8, Y + 34, CX - 8, Y + 46, BONE, 1.6, 2.2);
  over(bones, b);
  rim(head, BONE, SHADE), rim(jaw, BONE, SHADE), shade(bones, BONE, SHADE);

  // one canvas stamped on another, moved by (dx, dy)
  const stamp = (dst: Uint8Array, src: Uint8Array, dx: number, dy = 0) => {
    for (let y = Y; y < H - dy; y++) for (let x = 0; x < 2 * CX + 2; x++) if (src[y * W + x]) dst[(y + dy) * W + x + dx] = src[y * W + x];
  };
  // what never moves: the three heads and their bones, and the hems of the pennant
  const still = new Uint8Array(W * H);
  for (let n = 0; n < 3; n++) stamp(still, bones, n * STEP), stamp(still, head, n * STEP);
  for (const y of [2, 60]) rect(still, 0, y, W, 2, BONE);

  return (t, { color } = {}) => {
    // the loop begins part way through the middle skull's turn
    const u = (((t + TURN + 0.05) % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    for (let n = 0; n < 3; n++) {
      const v = u - n * TURN, on = v >= 0 && v < TURN;
      stamp(p, jaw, n * STEP, on && CLACK[Math.floor(v / 0.1 + 1e-6)] ? 2 : 0);
      // its eyes: a spark while it waits, alight when its turn comes
      for (const s of [-1, 1]) {
        if (on) disc(p, CX + n * STEP + s * 5, Y + 11, 2.4, 2.4, GLOW);
        else rect(p, CX + n * STEP + s * 5, Y + 10, 1, 2, GLOW);
      }
    }
    return emit(p, color);
  };
}
