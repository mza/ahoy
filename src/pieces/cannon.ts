/*
 * cannon: a ship's gun on its wooden truck carriage, seen from the side. The
 * priming fizzes at the vent, then she fires: a flash at the muzzle, the ball
 * away to the right, a cloud of smoke, and the gun kicks back on its trucks
 * before it is run out again.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "cannon",
  category: "scenes",
  note: "a ship's gun on its truck carriage fires, kicks back and runs out",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // iron, wood, powder gold, bone for the smoke and the shine
  palette: ["#8a94a6", "#a8703a", "#f2b632", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, WOOD = 2, GOLD = 3, BONE = 4;

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
// A filled shape from its corners, given on pixel edges.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    pts.forEach(([x0, y0], i) => {
      const [x1, y1] = pts[(i + 1) % pts.length];
      if (y0 <= y + 0.5 !== y1 <= y + 0.5) xs.push(x0 + ((y + 0.5 - y0) * (x1 - x0)) / (y1 - y0));
    });
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) set(p, x, y, k);
  }
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

// ---- the gun

const BORE = 18; // the height of the bore at the muzzle
const MUZZLE = 60; // where the muzzle's face is, run out
const TRUCKS = [24.5, 46.5], AXLE = 51.5, TRUCK = 8;
const KICK = 9; // how far she recoils
const SPARK = [
  [".g.", "gbg", ".g."],
  ["g.g", ".b.", "g.g"],
  [".b.", "ggg", ".g."],
];
// The smoke, a few round puffs: when each is born after the shot, how far it drifts, and how big it grows.
const PUFFS = [
  [0.0, 6, -1, 7],
  [0.06, 1, -8, 6],
  [0.1, 10, 4, 5],
  [0.2, 8, -9, 5],
  [0.3, -2, 3, 4],
];
const FIRE = 1, LOOP = 5;

export default function cannon(): Frame {
  // what never changes: the deck, and the gun on its carriage, ready to be laid over the smoke
  const deck = new Uint8Array(W * H);
  rect(deck, 0, 62, W, 2, WOOD);
  for (let x = 9; x < W; x += 24) rect(deck, x, 62, 2, 2, 0);

  const gun = new Uint8Array(W * H);
  // the carriage, stepped down towards the breech
  rect(gun, 36, 28, 17, 6, WOOD);
  rect(gun, 26, 34, 27, 6, WOOD);
  rect(gun, 16, 40, 37, 9, WOOD);
  for (const x of TRUCKS) {
    disc(gun, x, AXLE, TRUCK + 2, TRUCK + 2, 0);
    disc(gun, x, AXLE, TRUCK, TRUCK, WOOD);
    disc(gun, x, AXLE, 2.6, 2.6, 0);
  }
  // the barrel, tapering to the muzzle, with its rings, its swell and the knob at the breech
  poly(gun, [[16, 8], [MUZZLE, 12], [MUZZLE, 25], [16, 26]], IRON);
  disc(gun, 16, 16.5, 5, 9, IRON);
  rect(gun, 9, 15, 3, 4, IRON);
  disc(gun, 7.5, 16.5, 3, 3, IRON);
  rect(gun, 16, 7, 3, 20, IRON);
  rect(gun, 35, 8, 3, 18, IRON);
  rect(gun, MUZZLE - 5, 10, 5, 17, IRON);
  rect(gun, 22, 12, 11, 2, BONE);
  rect(gun, 40, 14, 12, 2, BONE);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, a = u - FIRE;
    const p = new Uint8Array(W * H);
    p.set(deck);
    // the kick: back in an instant, a pause, then run out again a pixel at a time
    const back = a < 0 ? 0 : a < 0.1 ? a / 0.1 : a < 1.4 ? 1 : Math.max(0, 1 - (a - 1.4) / 1.8);
    const dx = -Math.round(KICK * back);

    if (a >= 0) {
      // the smoke: each puff swells, drifts and thins away
      for (const [born, vx, vy, big] of PUFFS) {
        const s = a - born;
        if (s < 0) continue;
        const go = 1 - Math.exp(-s * 2.2);
        const r = big * Math.min(1, s / 0.2) * (1 - Math.min(1, Math.max(0, (s - 0.9) / 1.5)));
        if (r > 0.8) disc(p, Math.round(MUZZLE + 5 + vx * go), Math.round(BORE + vy * go - 2.5 * s), r, r, BONE);
      }
      // the ball, coming out of the fire and clear of the smoke
      const bx = Math.round(MUZZLE + 2 + 45 * a);
      if (bx < W + 6) {
        disc(p, bx, BORE, 5.5, 5.5, 0);
        disc(p, bx, BORE, 3.5, 3.5, IRON);
      }
      // the flash: fire opening out of the muzzle, rays past it
      if (a < 0.15) {
        const k = a / 0.15, r = 5 + 5 * k, fx = MUZZLE + 6;
        for (let i = -2; i <= 2; i++) {
          const ang = i * 0.5, r1 = r + 5 + 5 * k + (i % 2 ? 0 : 3);
          line(p, fx + Math.cos(ang) * r, BORE + Math.sin(ang) * r, fx + Math.cos(ang) * r1, BORE + Math.sin(ang) * r1, GOLD, 2);
        }
        disc(p, fx, BORE, r + 2, r + 2, 0);
        disc(p, fx, BORE, r, r, GOLD);
        disc(p, fx, BORE, r * 0.5, r * 0.5, BONE);
      }
    }

    over(p, gun, dx);
    // a notch on each truck, so they are seen to turn
    for (const x of TRUCKS) {
      const ang = dx / TRUCK + 0.9;
      rect(p, Math.round(x + dx + Math.cos(ang) * 5.2 - 0.5), Math.round(AXLE + Math.sin(ang) * 5.2 - 0.5), 2, 2, 0);
    }
    // the priming, fizzing at the vent until she goes
    if (a < 0) sprite(p, 17, 0, SPARK[Math.floor(t * 10) % SPARK.length], { g: GOLD, b: BONE }, 2);
    return emit(p, color);
  };
}
