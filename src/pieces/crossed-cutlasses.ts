/*
 * crossed-cutlasses: two curved cutlasses crossed, hilts down, with a small
 * skull where they cross. A glint runs up one blade from hilt to point, then
 * up the other, and each point winks as the light leaves it.
 *
 * Pixel art in block elements, two square pixels a cell, in three flat colours.
 * Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "crossed cutlasses",
  category: "scenes",
  note: "two crossed cutlasses and a skull, a glint running up each blade",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // steel, hilt gold, bone for the skull and the glint
  palette: ["#8a94a6", "#f2b632", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, GOLD = 2, BONE = 3;

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
// Rows of characters as pixels `scale` across: "." leaves the pixel alone, "_" empties it, others are looked up in `keys`.
const sprite = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>, scale = 1) => {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== ".") rect(p, x + i * scale, y + j * scale, scale, scale, c === "_" ? 0 : keys[c]);
    }),
  );
};
// One canvas laid over another, moved by (dx, dy), with a black gap cut around it first.
const over = (dst: Uint8Array, src: Uint8Array, dx = 0, dy = 0, gap = 2) => {
  for (let pass = 0; pass < 2; pass++)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const k = src[y * W + x];
        if (!k) continue;
        if (pass) set(dst, x + dx, y + dy, k);
        else rect(dst, x + dx - gap, y + dy - gap, 2 * gap + 1, 2 * gap + 1, 0);
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

// ---- the cutlasses

// One blade's spine, from the guard up to the point, as a curve; the other is its mirror image.
const P0 = [16, 48], P1 = [50, 36], P2 = [70, 5];
const at = (s: number) => {
  const a = 1 - s;
  return [a * a * P0[0] + 2 * a * s * P1[0] + s * s * P2[0], a * a * P0[1] + 2 * a * s * P1[1] + s * s * P2[1]];
};
// Half the blade's width along it: broadening towards the point, then the edge cut away up to the back.
const BROAD = 4.2, CUT = 0.76;
const half = (s: number) => (s < CUT ? 2.6 + (BROAD - 2.6) * (s / CUT) : 0.6 + (BROAD - 0.6) * (1 - ((s - CUT) / (1 - CUT)) ** 2));
// The middle of the blade there: on the spine, until the cut, where it keeps to the back.
const mid = (s: number) => {
  const [x, y] = at(s), [x1, y1] = at(s + 0.01), l = Math.hypot(x1 - x, y1 - y), k = s < CUT ? 0 : BROAD - half(s);
  return [x + ((y1 - y) / l) * k, y - ((x1 - x) / l) * k];
};
const SKULL = [
  "..#######..",
  ".#########.",
  "###########",
  "##__###__##",
  "##__###__##",
  "#####_#####",
  ".#########.",
  "..#_#_#_#..",
  "..#######..",
];
const WINK = ["..b..", "..b..", "bbbbb", "..b..", "..b.."];
const LOOP = 3.6, RUN = 1.0, STARTS = [0.2, 2.0];

export default function crossedCutlasses(): Frame {
  // one cutlass, and for each pixel of its blade how far along the blade it is
  const one = new Uint8Array(W * H), along = new Float32Array(W * H).fill(-1);
  const N = 240;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let best = 9;
      for (let i = 0; i <= N; i++) {
        const s = 0.05 + (0.95 * i) / N, [bx, by] = mid(s), d = Math.hypot(x - bx, y - by) / half(s);
        if (d < best) (best = d), (along[y * W + x] = s);
      }
      if (best < 1) one[y * W + x] = IRON;
      else along[y * W + x] = -1;
    }
  // the hilt: a guard across the blade, the grip, the pommel, and a bow from guard to pommel
  const d = [P1[0] - P0[0], P1[1] - P0[1]].map((v) => v / Math.hypot(P1[0] - P0[0], P1[1] - P0[1]));
  const n = [-d[1], d[0]];
  const G = [P0[0] - d[0] * 2.5, P0[1] - d[1] * 2.5];
  const hilt = (f: number, side: number) => [G[0] - d[0] * f + n[0] * side, G[1] - d[1] * f + n[1] * side];
  const bar = (a: number[], b: number[], r: number) => {
    const m = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
    for (let i = 0; i <= m; i++) disc(one, a[0] + ((b[0] - a[0]) * i) / m, a[1] + ((b[1] - a[1]) * i) / m, r, r, GOLD);
  };
  bar(hilt(0, -5), hilt(0, 8.5), 1.7);
  bar(hilt(2, 0), hilt(9, 0), 2.1);
  bar(hilt(10.5, 0), hilt(10.5, 0), 3);
  bar(hilt(1, 8.5), hilt(6, 9), 1.3);
  bar(hilt(6, 9), hilt(11, 3), 1.3);

  // both, the second laid over the first, and the skull over the crossing
  const still = new Uint8Array(W * H), two = new Uint8Array(W * H);
  const own = new Float32Array(W * H).fill(-1), blade = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) two[y * W + x] = one[y * W + W - 1 - x];
  still.set(one);
  over(still, two);
  disc(still, 39.5, 36.5, 13.5, 11.5, 0);
  sprite(still, 29, 28, SKULL, { "#": BONE }, 2);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (still[i] !== IRON) continue;
      if (two[i]) (own[i] = along[y * W + W - 1 - x]), (blade[i] = 1);
      else own[i] = along[i];
    }
  const tip = mid(1);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);
    STARTS.forEach((start, b) => {
      const k = (u - start) / RUN;
      if (k < 0 || k > 1.25) return;
      // a band of light across the blade, moving up it, a black line either side so it shows in one ink
      const s = k * 1.1;
      for (let i = 0; i < p.length; i++) {
        const far = Math.abs(own[i] - s);
        if (blade[i] === b && own[i] >= 0 && far < 0.07) p[i] = far < 0.045 ? BONE : 0;
      }
      // and a wink off the point as it leaves
      if (k > 0.95) {
        const x = Math.round(b ? W - 1 - tip[0] : tip[0]) + (b ? -1 : 1), y = Math.round(tip[1]) + 1;
        if (k < 1.1) sprite(p, x - 2, y - 2, WINK, { b: BONE });
        else rect(p, x - 1, y - 1, 3, 3, BONE);
      }
    });
    return emit(p, color);
  };
}
