/*
 * x-marks-the-spot: a big red X painted on the ground, a mound of sand beside
 * it and a shovel stood in the ground between them. The shovel hops over and digs: in, lever,
 * toss, three times, the sand flying back onto the mound as a hole opens in
 * the middle of the X. Then it goes back to its place, and gold glints in the
 * hole.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. The X is two brush strokes with ragged ends
 * and dry streaks in them; the shovel is drawn from its corners, turned to
 * each pose, its blade shaded down the right; a black line is cut wherever
 * one thing sits on another.
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
  // the red X, the wood of the handle, sand and gold, bone for the blade and its shade
  palette: ["#e23a2e", "#a8703a", "#f2b632", "#e8e2d0", "#aaa493"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const RED = 1, WOOD = 2, GOLD = 3, BONE = 4, SHADE = 5;

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
const over = (p: Uint8Array, q: Uint8Array, gap = 1) => {
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
const MX = 68; // the middle of the mound
const REACH = 34; // how far a stroke of the X runs from the middle, counted in pixels across plus pixels down
// How much further, or less far, each bristle of the brush ran at the end of a stroke.
const BRISTLES = [-3, -1, 0, 1, 0, 2, 1, 1, 2, 0, 1, 0, -1, -2, -4];
const SPARKLE = [
  ["..#..", "..#..", "#####", "..#..", "..#.."],
  ["....#....", "....#....", "....#....", "...###...", "#########", "...###...", "....#....", "....#....", "....#...."],
  ["......#......", "......#......", "......#......", "......#......", "....#.#.#....", ".....###.....", "#############", ".....###.....", "....#.#.#....", "......#......", "......#......", "......#......", "......#......"],
];
const REST = 0.9, HOP = 0.2, DIG = 0.8, DIGS = 3, GLINT = 1.6;
const LOOP = REST + HOP + DIG * DIGS + HOP + GLINT;

// The shovel, its blade's point at (tx, ty), leaning `deg` degrees to the right of upright.
const shovel = (p: Uint8Array, tx: number, ty: number, deg: number) => {
  const a = (deg * Math.PI) / 180, ux = Math.sin(a), uy = -Math.cos(a), vx = Math.cos(a), vy = Math.sin(a);
  // a corner `u` pixels up the shovel from its point and `v` across it
  const at = (u: number, v: number) => [tx + u * ux + v * vx, ty + u * uy + v * vy];
  // the blade: a rounded point, straight sides, square shoulders to tread on
  poly(p, [at(0, -1), at(3, -4), at(8, -6.5), at(17, -6.5), at(17, 6.5), at(8, 6.5), at(3, 4), at(0, 1)], BONE);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === BONE && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = SHADE;
  // a rib down the blade from the socket, the socket, the shaft, and a grip to put a hand through
  for (let u = 9; u <= 16; u += 0.5) set(p, at(u, 0)[0] - 0.5, at(u, 0)[1] - 0.5, 0);
  poly(p, [at(15, -2.5), at(19, -1.5), at(19, 1.5), at(15, 2.5)], WOOD);
  poly(p, [at(19, -1.5), at(32, -1.5), at(32, 1.5), at(19, 1.5)], WOOD);
  poly(p, [at(31, -1.5), at(33, -5.5), at(38, -5.5), at(38, 5.5), at(33, 5.5), at(31, 1.5)], WOOD);
  poly(p, [at(33.5, -3.5), at(36, -3.5), at(36, 3.5), at(33.5, 3.5)], 0);
};

export default function xMarksTheSpot(): Frame {
  // what never changes: the X, two strokes of a loaded brush, the second laid over the first
  const cross = new Uint8Array(W * H);
  for (const d of [1, -1])
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = d * (x - XC), dy = y - YC, along = dx + dy, across = dx - dy;
        if (Math.abs(across) === 8 && d === -1 && Math.abs(along) < 10) cross[y * W + x] = 0; // the line where they cross
        if (Math.abs(across) > 7) continue;
        const end = REACH + BRISTLES[across + 7];
        if (Math.abs(along) > end) continue;
        // dry streaks, where the brush was running out of paint
        const dry = (across === -3 && along > end - 12 && along < end - 3) || (across === 3 && along > end - 7) || (across === 4 && along < -end + 10 && along > -end + 3);
        cross[y * W + x] = dry ? 0 : RED;
      }
  // and a broken line of sand under everything, a few loose grains below it
  for (let x = 1; x < W - 1; x++) {
    if ((x * 7) % 23 > 5 && (x * 3) % 17 !== 0) set(cross, x, GY + 2, GOLD);
    if ((x * 11) % 19 === 3) set(cross, x, GY + 4 + (x % 3), GOLD);
  }

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(cross);
    const front = new Uint8Array(W * H);
    const ud = u - REST - HOP; // seconds into the digging
    const done = Math.max(0, Math.min(DIGS, Math.floor((ud + DIG - 0.3) / DIG))); // spadefuls taken out
    const tossed = Math.max(0, Math.min(DIGS, Math.floor((ud + 0.05) / DIG))); // and landed on the mound

    // the hole, wider with each spadeful, a crumb or two of sand on its lip
    if (done) {
      disc(p, XC, YC + 1, 4.5 + 1.5 * done, 1.5 + done, 0);
      for (const [x, y] of [[-7, 3], [8, 2], [-4, 5], [6, 5], [10, 0], [-10, 1]].slice(0, 2 * done)) set(p, XC + x, YC + y, GOLD);
    }
    // the mound, taller with each: a hump with a ragged back, flecked, grains at its foot
    const tall = 9 + 2 * tossed;
    const mound = new Uint8Array(W * H);
    for (let x = -10; x <= 10; x++) {
      const h = Math.round(tall * Math.sqrt(1 - (x / 10.5) ** 2) - ((x * x * 3) % 5 === 0 ? 1 : 0));
      rect(mound, MX + x, GY - h, 1, h, GOLD);
    }
    for (const [x, y] of [[-4, 3], [3, 5], [-1, 7], [6, 2], [-7, 2], [1, 10], [-3, 12], [4, 9]]) if (y < tall - 2) set(mound, MX + x, GY - y, 0);
    over(p, mound);
    for (const x of [-13, -12, 12, 14]) set(p, MX + x, GY - 1, GOLD);

    if (ud < -HOP || ud >= DIG * DIGS + HOP) {
      // at rest, stood in the sand between the X and the mound
      shovel(front, 52, GY, 0);
      over(p, front);
      if (ud > 0) {
        // gold in the hole, and a sparkle off it
        const g = ud - DIG * DIGS - HOP;
        disc(p, XC, YC + 1, 5.5, 2.6, GOLD);
        rect(p, XC - 3, YC, 2, 1, BONE);
        rect(p, XC + 1, YC + 2, 3, 1, 0);
        const s = [0, 1, 2, 1, 0, -1][Math.floor(g / 0.12) % 6];
        if (s >= 0) {
          const n = SPARKLE[s].length >> 1;
          stamp(p, XC + 3 - n, YC - 3 - n, SPARKLE[s], { "#": BONE }, 1, 1);
        }
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
    // sand in the air, from the blade over to the mound: a spray of grains, one behind another
    for (let d = 0; d < DIGS; d++) {
      const k = (ud - d * DIG - 0.56) / 0.24;
      if (k < 0 || k >= 1) continue;
      for (let i = 0; i < 9; i++) {
        const kk = Math.min(1, Math.max(0, k * 1.3 - i * 0.05));
        const x = XC + 20 + (MX - XC - 20) * kk, y = YC - 22 + (GY - tall - YC + 22) * kk - (20 + (i % 3) * 5) * kk * (1 - kk);
        if (kk > 0 && kk < 1) rect(p, Math.round(x), Math.round(y) - (i % 2), 1 + (i % 3 === 0 ? 1 : 0), 1, GOLD);
      }
    }
    return emit(p, color);
  };
}
