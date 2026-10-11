/*
 * stede-bonnet: the flag of Stede Bonnet, "the Gentleman Pirate": a skull over
 * a single bone, between a dagger and a heart. The heart beats and lets a drop
 * fall now and then, and a glint runs down the dagger.
 *
 * Drawn from the flag credited to Bonnet in the early 1700s (public domain),
 * as flat colour in block elements, two square pixels a cell, each pixel drawn
 * on its own, the bone shaded down its right-hand edges. It reads in one ink
 * too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "stede bonnet",
  category: "scenes",
  note: "the gentleman pirate's flag: a skull and bone between dagger and heart",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, steel, blood, and blood as the heart beats
  palette: ["#f1ede2", "#bdb6a6", "#8a94a6", "#d81f2a", "#ff4a52"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, STEEL = 3, BLOOD = 4, HOT = 5;

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

// ---- the flag

// A skull, face on, about the middle of its cranium: 35 pixels wide, from 15 above that to 23 below.
const NOSE = ["..#..", ".###.", "#####", "##.##", "##.##"];
const skull = (p: Uint8Array, cx: number, cy: number) => {
  disc(p, cx, cy, 17.5, 15.5, BONE);
  for (const s of [-1, 1]) disc(p, cx + s * 12, cy + 9, 3.6, 3.2, BONE);
  rect(p, cx - 10, cy + 10, 21, 12, BONE);
  rect(p, cx - 9, cy + 22, 19, 2, BONE);
  // the sockets, each under a brow that slants down towards the nose
  for (const s of [-1, 1])
    for (let y = cy - 3; y <= cy + 9; y++)
      for (let x = cx + s * 8 - 6; x <= cx + s * 8 + 6; x++) {
        const out = s * (x - cx - s * 8);
        if ((out / 5.7) ** 2 + ((y - cy - 3) / 5.3) ** 2 < 1 && y >= cy - 2.5 + 0.3 * (5.7 - out)) set(p, x, y, 0);
      }
  NOSE.forEach((row, j) => [...row].forEach((c, i) => c === "#" && set(p, cx - 2 + i, cy + 10 + j, 0)));
  // the mouth, and the gaps between its teeth
  rect(p, cx - 8, cy + 16, 17, 1, 0);
  for (const x of [-6, -2, 2, 6]) rect(p, cx + x, cy + 17, 1, 7, 0);
  // a crack in the crown
  for (const [x, y] of [[6, -15], [6, -14], [5, -13], [6, -12], [7, -11], [6, -10], [6, -9]]) set(p, cx + x, cy + y, 0);
};
// Bone's right-hand edges in its shade, as if lit from the left.
const shade = (p: Uint8Array) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === BONE && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = SHADE;
};

// A heart about the middle of its two lobes, `k` times its size at rest.
const heart = (p: Uint8Array, cx: number, cy: number, k: number, ink: number) => {
  for (const s of [-1, 1]) disc(p, cx + s * 3.6 * k, cy, 4.5 * k, 4.5 * k, ink);
  for (let y = 0; y <= 12 * k; y++) {
    const half = 7.9 * k * (1 - y / (12 * k));
    rect(p, Math.round(cx - half), Math.round(cy + 1 + y), Math.round(2 * half) + 1, 1, ink);
  }
};

const DX = 8; // the dagger's middle column
const HX = 71, HY = 17; // the middle of the heart
const BEAT_EVERY = 1.2; // seconds between heartbeats, the first of them a little way in
const SWELL = [[0, 0.12], [0.24, 0.36]]; // when in a beat the heart is swollen: lub, dub
const LOOP = 4 * BEAT_EVERY;
const GLINT = [1.5, 2.4]; // when in the loop the glint runs down the blade

export default function stedeBonnet(): Frame {
  // what never moves: the skull, the bone under it and the dagger
  const still = new Uint8Array(W * H);
  skull(still, 40, 18);
  // the bone: a shaft with two knuckles at each end
  rect(still, 16, 50, 49, 4, BONE);
  for (const x of [15, 65]) for (const y of [49, 54]) disc(still, x, y, 3.5, 3.5, BONE);
  // the dagger's guard, its ends turned down, its grip and its pommel
  rect(still, DX - 6, 31, 13, 2, BONE);
  for (const s of [-1, 1]) set(still, DX + s * 6, 33, BONE);
  rect(still, DX - 1, 34, 3, 9, BONE);
  disc(still, DX, 45, 2.7, 2.7, BONE);
  shade(still);
  // its blade, point up, narrowing to the tip, a fuller down the middle of it
  for (let y = 5; y < 31; y++) {
    const half = Math.min(2, Math.floor((y - 5) / 3));
    rect(still, DX - half, y, 2 * half + 1, 1, STEEL);
  }
  rect(still, DX, 13, 1, 15, 0);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, b = (u + 0.6) % BEAT_EVERY;
    const p = new Uint8Array(W * H);
    p.set(still);

    // the heart, bigger and brighter when it swells, a shine on its left lobe
    const swollen = SWELL.some(([a, z]) => b >= a && b < z);
    heart(p, HX, HY, swollen ? 1.12 : 1, swollen ? HOT : BLOOD);
    rect(p, HX - 6, HY - 2, 2, 1, BONE);
    set(p, HX - 6, HY - 1, BONE);

    // a drop from its point, every other beat: it gathers, falls faster and faster, and is gone
    const d = u % (2 * BEAT_EVERY);
    if (d > 0.5 && d < 0.9) rect(p, HX, HY + 15, 1, d > 0.7 ? 2 : 1, BLOOD);
    else if (d >= 0.9 && d < 1.7) {
      const k = (d - 0.9) / 0.8;
      rect(p, HX, HY + 15 + Math.round(34 * k * k), 1, 3, BLOOD);
    }

    // the glint: a short bright stroke running down one side of the blade from its tip
    if (u >= GLINT[0] && u < GLINT[1]) {
      const y = 7 + Math.round(((u - GLINT[0]) / (GLINT[1] - GLINT[0])) * 21);
      for (let j = 0; j < 4; j++) if (p[(y + j) * W + DX - 1] === STEEL) set(p, DX - 1, y + j, BONE);
    }
    return emit(p, color);
  };
}
