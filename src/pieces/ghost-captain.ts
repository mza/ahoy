/*
 * ghost-captain: a grinning skull in a captain's tricorn, gold-trimmed, with a
 * clay pipe clenched in its teeth. Smoke rings rise from the pipe and spread
 * as they go, the pipe's ember glows, and embers flicker in its eyes.
 *
 * Flat colour in block elements, two square pixels a cell, each pixel drawn on
 * its own, the bone shaded down its right-hand edges. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ghost captain",
  category: "scenes",
  note: "a skull in a tricorn puffing smoke rings from a clay pipe",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, the hat's felt, smoke, gold, ember
  palette: ["#f1ede2", "#bdb6a6", "#59616f", "#8a94a6", "#f2b632", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, FELT = 3, SMOKE = 4, GOLD = 5, EMBER = 6;

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

// ---- the captain

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

const CX = 32, CY = 38; // the middle of the skull's cranium
const BOWL = [62, 47]; // the pipe bowl's top left pixel
const LOOP = 6, RINGS = 3;
// The brim of the tricorn at column x: its top and bottom rows, turned up at each end and cut to a point there.
const brim = (x: number) => {
  const d = Math.abs(x - CX) / 29, top = 21 - 13 * d ** 2.5;
  return [Math.round(top), Math.round(top + 9 * Math.min(1, (1 - d) * 5))];
};

// A number from 0 to 1 for each whole number, the same every time.
const hash = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export default function ghostCaptain(): Frame {
  // what never moves: the skull, the hat over its crown, and the pipe
  const still = new Uint8Array(W * H);
  skull(still, CX, CY);
  // the pipe: a black gap through the teeth, the bowl standing at the stem's end, its rim a little wider
  line(still, CX + 8, CY + 17, BOWL[0] + 2, BOWL[1] + 10, 0, 4);
  rect(still, BOWL[0] - 2, BOWL[1] - 1, 12, 14, 0);
  rect(still, BOWL[0], BOWL[1] + 1, 8, 11, BONE);
  rect(still, BOWL[0] - 1, BOWL[1] + 1, 10, 2, BONE);
  line(still, CX + 8, CY + 17, BOWL[0] + 2, BOWL[1] + 10, BONE, 2);
  shade(still);
  // the hat: its crown, then its brim across it with gold along the top edge, and a gap under it
  disc(still, CX, 17, 13.5, 9.5, FELT);
  for (let x = CX - 29; x <= CX + 29; x++) {
    const [top, bottom] = brim(x);
    rect(still, x, top, 1, bottom - top + 3, 0);
    rect(still, x, top, 1, bottom - top + 1, FELT);
    rect(still, x, top, 1, Math.min(2, bottom - top + 1), GOLD);
  }

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);
    // only onto empty pixels: the smoke passes behind everything
    const puff = (x: number, y: number, k: number) => {
      x = Math.round(x), y = Math.round(y);
      if (x >= 0 && x < W && y >= 0 && y < H && !p[y * W + x]) p[y * W + x] = k;
    };

    // smoke rings: each rises from the bowl, drifts and widens, and breaks up as it goes
    for (let i = 0; i < RINGS; i++) {
      const age = (u + (i * LOOP) / RINGS) % LOOP, k = age / LOOP;
      const cx = BOWL[0] + 4 + 3 * Math.sin(k * 5 + i), cy = BOWL[1] - 4 - k * 42;
      const rx = 2.5 + 7.5 * Math.sqrt(k), ry = rx * 0.45, n = Math.ceil(rx * 10);
      for (let j = 0; j < n; j++) {
        if (k > 0.5 && hash(i * 131 + (j >> 1)) < (k - 0.5) * 1.8) continue;
        const a = (j / n) * 2 * Math.PI;
        puff(cx + rx * Math.cos(a), cy + ry * Math.sin(a), k > 0.7 ? FELT : SMOKE);
        if (k < 0.35) puff(cx + (rx - 1) * Math.cos(a), cy + (ry - 1) * Math.sin(a), SMOKE);
      }
    }
    // the ember in the bowl, flickering
    for (let x = 0; x < 6; x++) {
      const f = hash(Math.floor(u * 10) * 31 + x);
      rect(p, BOWL[0] + 1 + x, BOWL[1] - 1, 1, 2, f > 0.5 ? GOLD : EMBER);
    }
    // embers in the eyes: they smoulder, flare now and then, and go dark for a blink
    const blink = u > 4.1 && u < 4.35, flare = Math.sin(u * 2.1) * Math.sin(u * 5.3 + 1) > 0.35;
    if (!blink)
      for (const s of [-1, 1]) {
        const x = CX + s * 8 - 1, y = CY + 4;
        rect(p, x, y, 2, 2, flare ? GOLD : EMBER);
        if (flare) rect(p, x - 1, y, 4, 2, EMBER), rect(p, x, y - 1, 2, 4, EMBER), rect(p, x, y, 2, 2, GOLD);
      }
    return emit(p, color);
  };
}
