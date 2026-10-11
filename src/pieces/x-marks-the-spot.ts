/*
 * x-marks-the-spot: a big red X painted on the ground, a mound of sand beside
 * it and a shovel stood in the ground between them. The shovel hops over and digs: in, lever,
 * toss, three times, the sand flying back onto the mound as a hole opens in
 * the middle of the X. Then it goes back to its place, and gold glints in the
 * hole.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * The X and the shovel are filled shapes drawn from their corners, the shovel
 * turned to each pose; black gaps are cut wherever one thing sits on another.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "x marks the spot",
  category: "scenes",
  note: "a red x on the sand, a shovel that digs it up, and a glint of gold",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // the red X, the wood of the handle, sand and gold, bone for the blade
  palette: ["#e23a2e", "#a8703a", "#f2b632", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const RED = 1, WOOD = 2, GOLD = 3, BONE = 4;

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
// A filled shape from its corners, in order.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++) {
    const yc = y + 0.5, xs: number[] = [];
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      if (a[1] <= yc !== b[1] <= yc) xs.push(a[0] + ((yc - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    });
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) set(p, x, y, k);
  }
};
// One canvas laid over another, with a black gap `gap` pixels wide cut round what it carries.
const over = (p: Uint8Array, q: Uint8Array, gap = 2) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
};
// Rows of characters as pixels `scale` across: "." leaves the pixel alone, "_" empties it, others are looked up in `keys`.
const sprite = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>, scale = 1) => {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== ".") rect(p, x + i * scale, y + j * scale, scale, scale, c === "_" ? 0 : keys[c]);
    }),
  );
};
// A sprite with a black gap `gap` pixels wide cut all round it first.
const stamp = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>, scale = 1, gap = 2) => {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== ".") rect(p, x + i * scale - gap, y + j * scale - gap, scale + 2 * gap, scale + 2 * gap, 0);
    }),
  );
  sprite(p, x, y, rows, keys, scale);
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

// ---- the spot

const XC = 24, YC = 34; // the middle of the X
const GY = 54; // the pixel row everything stands on
const MX = 69; // the middle of the mound
const SPARKLE = [
  [".#.", "###", ".#."],
  ["..#..", "..#..", "#####", "..#..", "..#.."],
  ["...#...", "...#...", "..###..", "#######", "..###..", "...#...", "...#..."],
];
const REST = 0.9, HOP = 0.2, DIG = 0.8, DIGS = 3, GLINT = 1.6;
const LOOP = REST + HOP + DIG * DIGS + HOP + GLINT;

// The shovel, its blade's point at (tx, ty), leaning `deg` degrees to the right of upright.
const shovel = (p: Uint8Array, tx: number, ty: number, deg: number) => {
  const a = (deg * Math.PI) / 180, ux = Math.sin(a), uy = -Math.cos(a), vx = Math.cos(a), vy = Math.sin(a);
  // a corner `u` pixels up the shovel from its point and `v` across it
  const at = (u: number, v: number) => [tx + u * ux + v * vx, ty + u * uy + v * vy];
  poly(p, [at(0, -1), at(8, -6), at(16, -6), at(16, 6), at(8, 6), at(0, 1)], BONE);
  poly(p, [at(15, -2), at(34, -2), at(34, 2), at(15, 2)], WOOD);
  poly(p, [at(33, -6), at(37, -6), at(37, 6), at(33, 6)], WOOD);
};

export default function xMarksTheSpot(): Frame {
  // what never changes: the X, two square-ended strokes of paint, and a broken line of sand under everything
  const cross = new Uint8Array(W * H);
  const L = 16.8, A = 3.2;
  for (const d of [1, -1])
    poly(cross, [[XC + d * (-L - A), YC - L + A], [XC + d * (-L + A), YC - L - A], [XC + d * (L + A), YC + L - A], [XC + d * (L - A), YC + L + A]], RED);
  for (let x = 2; x < W - 2; x++) if (x % 7 < 4) set(cross, x, GY + 2, GOLD);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(cross);
    const front = new Uint8Array(W * H);
    const ud = u - REST - HOP; // seconds into the digging
    const done = Math.max(0, Math.min(DIGS, Math.floor((ud + DIG - 0.3) / DIG))); // spadefuls taken out
    const tossed = Math.max(0, Math.min(DIGS, Math.floor((ud + 0.05) / DIG))); // and landed on the mound

    // the hole, wider with each spadeful
    if (done) disc(p, XC, YC + 1, 5 + 1.5 * done, 2 + done, 0);
    // the mound, taller with each
    const top = GY - 9 - 2 * tossed;
    const mound = new Uint8Array(W * H);
    disc(mound, MX, GY, 9, GY - top, GOLD);
    mound.fill(0, GY * W);
    over(p, mound);

    if (ud < -HOP || ud >= DIG * DIGS + HOP) {
      // at rest, stood in the sand between the X and the mound
      shovel(front, 53, GY, 6);
      over(p, front);
      if (ud > 0) {
        // gold in the hole, and a sparkle off it
        const g = ud - DIG * DIGS - HOP;
        disc(p, XC, YC + 1, 6, 3, GOLD);
        const s = [0, 1, 2, 1, 0, -1][Math.floor(g / 0.12) % 6];
        if (s >= 0) stamp(p, XC + 1 - SPARKLE[s].length, YC - 5 - SPARKLE[s].length, SPARKLE[s], { "#": BONE }, 2, 1);
      }
    } else {
      if (ud < 0 || ud >= DIG * DIGS) shovel(front, 50, 46, -4); // hopping across
      else {
        const k = (ud % DIG) / DIG;
        if (k < 0.25) shovel(front, XC + 1, YC + 3, -8); // up
        else if (k < 0.5) shovel(front, XC + 1, YC + 9, -8); // in
        else if (k < 0.7) shovel(front, XC, YC + 8, -13); // lever
        else shovel(front, XC + 7, YC - 9, -52); // and toss
        // sunk in the ground: nothing of it shows below the lip of the hole
        if (k >= 0.25 && k < 0.7) front.fill(0, (YC + 2) * W);
      }
      over(p, front);
    }
    // sand in the air, from the blade over to the mound
    for (let d = 0; d < DIGS; d++) {
      const k = (ud - d * DIG - 0.56) / 0.24;
      if (k < 0 || k >= 1) continue;
      for (let i = 0; i < 4; i++) {
        const kk = Math.min(1, k + i * 0.1);
        const x = XC + 20 + (MX - XC - 20) * kk, y = YC - 22 + (top - YC + 22) * kk - 24 * kk * (1 - kk) - (i % 2) * 3;
        rect(p, Math.round(x) - 1, Math.round(y) - 1, 4 - (i % 2), 4 - (i % 2), GOLD);
      }
    }
    return emit(p, color);
  };
}
