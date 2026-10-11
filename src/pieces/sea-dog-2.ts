/*
 * sea-dog-2: the pirate dog again, face on, in a spotted red bandana with a
 * patch over one eye, drawn finer. It pants, its tongue lolling in and out,
 * blinks its good eye, and twitches an ear, one then the other.
 *
 * sea-dog is the dog as it was drawn for the website, 26 pixels across; this
 * is the same dog with a pixel of the canvas for every detail, two square
 * pixels a cell, in the same six colours. Its black, the patch and its strap,
 * the eye, nose and mouth, is the ground showing through, which is what is
 * left of the drawing in one ink.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sea dog 2",
  category: "scenes",
  note: "the pirate dog drawn finer: bandana, eyepatch, panting and blinking",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, bandana red, its coat, the coat in shade, its ears, its tongue
  palette: ["#f3ecda", "#d92b35", "#c98f4e", "#a36f38", "#7a4a26", "#f08a9b"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, RED = 2, COAT = 3, SHADE = 4, EAR = 5, PINK = 6;

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

// ---- the dog

const CX = 39.5; // the middle of its face
// A row of pixels from x0 to x1, both counted.
const span = (p: Uint8Array, x0: number, x1: number, y: number, k: number) => rect(p, Math.round(x0), y, Math.round(x1) - Math.round(x0) + 1, 1, k);
// A value between the points of a curve given as [y, x] pairs, top to bottom.
const along = (pts: number[][], y: number) => {
  for (let i = 1; i < pts.length; i++)
    if (y <= pts[i][0]) return pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (y - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]);
  return pts[pts.length - 1][1];
};
// Half the width of its head at row y: square across the brow, rounding in to the chin.
const head = (y: number) => (y < 21 ? 19.5 + (y - 18) * 0.7 : y <= 45 ? 21.5 : 21.5 * Math.sqrt(Math.max(0, 1 - ((y - 45) / 16.5) ** 2)));
// The left ear's outer and inner edges, hanging from the brow; the right ear is its mirror.
const EAR_OUT = [[18, 13], [20, 9], [23, 6], [26, 5], [33, 5], [37, 6], [40, 8], [43, 10], [45, 12]];
const EAR_IN = [[18, 18], [34, 18], [38, 17], [42, 15], [45, 13]];
const SPOTS = [[36, 5], [50, 7], [25, 11], [40, 12], [57, 12], [31, 8], [46, 3]];

const LOOP = 7;
// How far the tongue hangs through a pant, in pixels short of all the way.
const PANT = [0, 1, 2, 3, 2, 1];
const BLINK = [3, 3.2], LEFT_EAR = [1.5, 1.85], RIGHT_EAR = [4, 4.35];
const within = (u: number, [a, b]: number[]) => u >= a && u < b;

// The dog with its mouth shut and its eye open, an ear lifted `left` or `right` pixels as it twitches.
function dog(left: number, right: number) {
  const p = new Uint8Array(W * H);
  for (const [side, lift] of [[-1, left], [1, right]])
    for (let y = 18; y <= 45; y++) {
      const a = along(EAR_OUT, y), b = along(EAR_IN, y);
      if (side < 0) span(p, a, b, y - lift, EAR);
      else span(p, W - 1 - b, W - 1 - a, y - lift, EAR);
    }
  // the bandana, a dome, spotted; the strap of the patch is the gap under it
  for (let y = 1; y <= 15; y++) {
    const half = Math.min(21.5, 22 * Math.sqrt(1 - ((15 - y) / 14.5) ** 2));
    span(p, CX - half, CX + half, y, RED);
  }
  for (const [x, y] of SPOTS) disc(p, x, y, 1.7, 1.7, BONE);
  // the head, its right side in shade
  for (let y = 18; y <= 61; y++) {
    const half = head(y);
    span(p, CX - half, CX + half, y, COAT);
    if (y > 19 && y < 59) span(p, CX + half - 1.5, CX + half, y, SHADE);
  }
  // the muzzle, with whisker spots, and the nose on it with a glint
  disc(p, CX, 43, 14.5, 12, BONE);
  for (const s of [-1, 1]) for (const [x, y] of [[9, 43], [11, 46], [8, 47]]) set(p, CX + s * x, y, 0);
  disc(p, CX, 39, 6, 3, 0);
  disc(p, CX, 41.5, 3.4, 2.6, 0);
  rect(p, 37, 38, 2, 1, BONE);
  rect(p, 39, 44, 2, 3, 0);
  // the patch, hung from the strap
  disc(p, 52, 25.5, 6.6, 6.6, 0);
  rect(p, 50, 16, 4, 5, 0);
  return p;
}

export default function seaDog2(): Frame {
  const poses = [dog(0, 0), dog(2, 0), dog(0, 2)];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(poses[within(u, LEFT_EAR) ? 1 : within(u, RIGHT_EAR) ? 2 : 0]);

    // its good eye, a glint in it; shut to a curved line for a blink
    if (within(u, BLINK)) for (let x = -3; x <= 3; x++) set(p, 27.5 + x, 28 + (Math.abs(x) > 2 ? -1 : 0), 0);
    else disc(p, 27.5, 27, 3.6, 3.6, 0), rect(p, 25, 25, 2, 2, BONE);

    // panting: the mouth a smile, open, and the tongue through it drawing up and hanging down again
    const short = PANT[Math.floor(u / 0.1) % PANT.length];
    for (let x = -8; x <= 8; x++) {
      const top = 49 - 0.03 * x * x, bottom = 52.5 - 0.075 * x * x;
      for (let y = Math.round(top); y <= bottom; y++) set(p, CX + x, y, 0);
    }
    for (const s of [-1, 1]) set(p, CX + s * 9, 46, 0);
    const tip = 62 - short;
    rect(p, 37, 51, 6, tip - 54, PINK);
    disc(p, CX, tip - 3, 3.5, 3.5, PINK);
    rect(p, 40, 53, 1, tip - 58, 0);
    return emit(p, color);
  };
}
