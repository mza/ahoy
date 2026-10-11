/*
 * cannon: a ship's gun on its wooden truck carriage, seen from the side. The
 * priming fizzes at the vent, then she fires: a flash at the muzzle, the ball
 * away to the right, a cloud of smoke, and the gun kicks back on its trucks
 * before it is run out again.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours, the iron shaded underneath. Black gaps keep
 * the shapes apart, so it reads in one ink too.
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
  // iron and its shade, wood, powder gold, bone for the smoke and the shine
  palette: ["#8a94a6", "#59616f", "#a8703a", "#f2b632", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, SHADE = 2, WOOD = 3, GOLD = 4, BONE = 5;

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
// The right-hand edges of one ink in another, as if lit from the left.
const shade = (p: Uint8Array, ink: number, dark: number) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === ink && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = dark;
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

const BORE = 20; // the row of the bore's centre line
const BREECH = 14, MUZZLE = 60; // the barrel, from its base ring to its face, run out
const RINGS = [14, 15, 28, 29, 42, 43, 52]; // the columns of its reinforcing rings
const TRUCKS = [24, 46], AXLE = 52, TRUCK = 8.4;
const KICK = 9; // how far she recoils
// Half the barrel's thickness at each column: two reinforces and the chase, stepping down, then the muzzle's swell.
const girth = (x: number) => {
  if (x >= MUZZLE - 2) return 8;
  if (x >= MUZZLE - 6) return 6.6 + 0.4 * (x - (MUZZLE - 6));
  const r = x < 28 ? 9.6 - 0.04 * (x - BREECH) : x < 42 ? 8.4 - 0.04 * (x - 28) : 7.2 - 0.06 * (x - 42);
  return r + (RINGS.includes(x) ? 1 : 0);
};
const SPARK = [
  ["..g..", "..g..", "ggbgg", "..b..", "..g.."],
  ["g...g", ".g.g.", "..b..", ".gbg.", "....."],
  ["..g..", "g.g.g", ".gbg.", "..b..", "g...g"],
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
  for (let x = 5; x < W; x += 17) rect(deck, x, 62, 1, 2, 0);

  // the barrel, column by column, its underside in shade
  const gun = new Uint8Array(W * H);
  for (let x = BREECH; x < MUZZLE; x++) {
    const r = Math.round(girth(x));
    rect(gun, x, BORE - r, 1, 2 * r + 1, IRON);
    rect(gun, x, BORE + 4, 1, r - 3, SHADE);
  }
  // the rounded breech, the neck and the knob of the cascabel
  [9, 8, 6].forEach((r, i) => {
    rect(gun, BREECH - 1 - i, BORE - r, 1, 2 * r + 1, IRON);
    rect(gun, BREECH - 1 - i, BORE + 4, 1, r - 3, SHADE);
  });
  rect(gun, 8, BORE - 1, 3, 3, IRON);
  disc(gun, 5.5, BORE, 3, 3, IRON);
  rect(gun, 4, BORE + 2, 4, 1, SHADE);
  // a dark line behind each ring, the dark of the muzzle's face, and a shine along the top
  for (const x of [16, 30, 44, 53]) rect(gun, x, BORE - Math.round(girth(x)), 1, 2 * Math.round(girth(x)) + 1, SHADE);
  rect(gun, MUZZLE - 1, BORE - 8, 1, 17, SHADE);
  rect(gun, 18, BORE - 6, 9, 2, BONE);
  rect(gun, 32, BORE - 6, 9, 2, BONE);
  rect(gun, 46, BORE - 4, 5, 2, BONE);
  set(gun, 19, BORE - 10, 0);

  // the carriage: a wedge under the breech, and a cheek of three planks stepped down aft, over the barrel's side
  const bed = new Uint8Array(W * H);
  poly(bed, [[11, 37], [11, 35], [23, 32], [23, 37]], WOOD);
  poly(bed, [[13, 38], [23, 38], [23, 32], [33, 32], [33, 26], [56, 26], [56, 48], [13, 48]], WOOD);
  rect(bed, 14, 37, 9, 1, 0);
  rect(bed, 34, 32, 22, 1, 0);
  rect(bed, 24, 38, 32, 1, 0);
  for (const [x, y] of [[35, 29], [54, 29], [25, 35], [54, 35], [54, 43]]) set(bed, x, y, 0);
  // the trunnion in its seat, and a ring bolt for the breeching
  disc(bed, 44, 26, 4.2, 4.2, 0);
  disc(bed, 44, 26, 3, 3, IRON);
  disc(bed, 17, 42, 3.4, 3.4, 0);
  disc(bed, 17, 42, 2.5, 2.5, IRON);
  set(bed, 17, 42, 0);
  shade(bed, IRON, SHADE);
  over(gun, bed, 0, 0, 1);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, a = u - FIRE;
    const p = new Uint8Array(W * H);
    p.set(deck);
    // the kick: back in an instant, a pause, then run out again a pixel at a time
    const back = a < 0 ? 0 : a < 0.1 ? a / 0.1 : a < 1.4 ? 1 : Math.max(0, 1 - (a - 1.4) / 1.8);
    const dx = -Math.round(KICK * back);

    if (a >= 0) {
      // the smoke: each puff swells, drifts and thins away, shedding a fleck or two
      PUFFS.forEach(([born, vx, vy, big], i) => {
        const s = a - born;
        if (s < 0) return;
        const go = 1 - Math.exp(-s * 2.2), thin = Math.min(1, Math.max(0, (s - 0.9) / 1.5));
        const r = big * Math.min(1, s / 0.2) * (1 - thin);
        const x = Math.round(MUZZLE + 5 + vx * go), y = Math.round(BORE + vy * go - 2.5 * s);
        if (r > 0.8) disc(p, x, y, r, r, BONE);
        if (thin > 0 && thin < 1)
          for (let j = 0; j < 3; j++) {
            const ang = i * 2.1 + j * 2.3, far = big * (0.7 + 0.5 * thin) + j;
            set(p, x + Math.cos(ang) * far, y + Math.sin(ang) * far - 2 * thin, BONE);
          }
      });
      // the ball, coming out of the fire and clear of the smoke
      const bx = Math.round(MUZZLE + 2 + 45 * a);
      if (bx < W + 6) {
        disc(p, bx, BORE, 4.6, 4.6, 0);
        disc(p, bx, BORE, 3.5, 3.5, IRON);
        disc(p, bx + 1, BORE + 1, 2.6, 2.6, SHADE);
        disc(p, bx - 0.5, BORE - 0.5, 2.6, 2.6, IRON);
      }
      // the flash: fire opening out of the muzzle, thin rays past it
      if (a < 0.15) {
        const k = a / 0.15, r = 4 + 5 * k, fx = MUZZLE + 6;
        for (let i = -4; i <= 4; i++) {
          const ang = i * 0.3, r0 = r + 2, r1 = r + 4 + 6 * k + (i % 2 ? 0 : 4);
          line(p, fx + Math.cos(ang) * r0, BORE + Math.sin(ang) * r0, fx + Math.cos(ang) * r1, BORE + Math.sin(ang) * r1, GOLD);
        }
        disc(p, fx, BORE, r + 1, r + 1, 0);
        disc(p, fx, BORE, r, r, GOLD);
        disc(p, fx, BORE, r * 0.55, r * 0.55, BONE);
      }
    }

    over(p, gun, dx, 0, 1);
    // the trucks: solid wheels, four spokes scored on each so they are seen to turn, an iron hub
    for (const tx of TRUCKS) {
      const x = tx + dx, turn = dx / TRUCK + 0.4;
      disc(p, x, AXLE, TRUCK + 1.2, TRUCK + 1.2, 0);
      disc(p, x, AXLE, TRUCK, TRUCK, WOOD);
      for (let i = 0; i < 4; i++) {
        const ang = turn + (i * Math.PI) / 2;
        line(p, x + Math.cos(ang) * 3, AXLE + Math.sin(ang) * 3, x + Math.cos(ang) * 6.6, AXLE + Math.sin(ang) * 6.6, 0);
      }
      disc(p, x, AXLE, 2.9, 2.9, 0);
      disc(p, x, AXLE, 1.8, 1.8, IRON);
    }
    // the priming, fizzing at the vent until she goes
    if (a < 0) sprite(p, 17, 4, SPARK[Math.floor(t * 10) % SPARK.length], { g: GOLD, b: BONE });
    return emit(p, color);
  };
}
