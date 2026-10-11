/*
 * kraken rising: an enormous full moon half risen out of the sea, a
 * three-masted galleon black against it, and round the ship the arms of a
 * kraken coming up out of the water: thick at the sea, tapering to curled
 * tips, rimmed with moonlight and running wet. A broad path of moonlight
 * glitters from the horizon to our feet. The arms sway and curl, each in its
 * own time; water streams and drips from them; a thin cloud drifts across the
 * moon, and a lantern burns at the galleon's stern.
 *
 * The sky, the moon and the ship are shaded once. Each frame the arms are
 * laid out again as chains of discs along a bending spine, lit from the moon
 * behind them, and the sea is shaded under them. Then every cell is drawn as
 * a halftone dot sized by its brightness, ordered-dithered, in the palette
 * colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "kraken rising",
  category: "scenes",
  note: "a kraken's arms rise round a galleon caught against a huge moon",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#03050c",
  palette: [
    // night sky, indigo
    "#2b4274", "#35509a", "#3f5fb4", "#4a74c0", "#5390c4",
    // teal of the low sky and the sea
    "#0a2230", "#0e3040", "#134052", "#1a5166", "#23647a", "#30788c", "#44909f", "#62a8b0",
    // the moon's halo
    "#86bcc0", "#a9cfcc", "#c8dcd2",
    // the moon, cream to its warm foot, and its seas
    "#fff6dc", "#fbeac0", "#f6dca6", "#eecb8c", "#e2b878", "#cdbf9e", "#d9c9a8",
    // cloud across the moon
    "#b9ad9a", "#9a968f", "#7d8088", "#5f6a7c",
    // glitter and foam
    "#fffbe9", "#e9e4c8", "#e8f2f0", "#b9d6d6",
    // the kraken, deep to moonlit
    "#05080e", "#0a1018", "#0f1a24", "#172732", "#213642", "#2e4a55", "#3f6068", "#9fc4bf", "#cfe2d4",
    // the lantern
    "#ffe2a0", "#ffc266", "#f29a3e", "#c66a2a", "#8a4420",
    // stars
    "#c8cce6",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HZ = 60; // the horizon
const MOON = [104, 36], MR = 31;
const SY = 2; // the galleon is drawn this far below where her geometry is written
const SX = 104, WL = 59 + SY; // the galleon's middle and its waterline
const LOOP = 24;
const TAU = Math.PI * 2;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, DISC = 1, SEA = 2, HULL = 3, LAMP = 4;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// value noise; with a period it repeats down y, so a scroll can come round
function noise(x: number, y: number, period = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  let y0 = yi, y1 = yi + 1;
  if (period) {
    y0 = ((yi % period) + period) % period;
    y1 = (y0 + 1) % period;
  }
  const a = hash(xi, y0), b = hash(xi + 1, y0), c = hash(xi, y1), d = hash(xi + 1, y1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves: number): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f);
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / n;
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

function seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  const ex = ax + dx * k - px, ey = ay + dy * k - py;
  return Math.sqrt(ex * ex + ey * ey);
}

function inside(px: number, py: number, poly: number[][]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// The galleon, broadside on with her bow to the left, all sail set: 1 timber and canvas, 2 a line of rigging, 3 the
// stern lantern. The sails are cut apart so the moon shows between them.
const MASTS: [number, number, [number, number, number][]][] = [
  [SX - 11, 30, [[32, 37, 2.9], [38, 44, 3.7], [45, 51.6, 4.3]]],
  [SX + 0.5, 24.5, [[26.5, 32, 3], [33, 39.5, 3.9], [40.5, 51.2, 4.5]]],
  [SX + 12, 32, [[34, 39.5, 2.6], [40.5, 47.5, 3.4]]],
];
const JIB = [[SX - 27, 48.6], [SX - 12.5, 33], [SX - 15.5, 50.4]];
function ship(x: number, y0: number): number {
  const dx = x - SX, y = y0 - SY, WL = 59;
  // the stern lantern on its post, and the lit casements of the great cabin
  if (Math.abs(dx - 19) < 1 && Math.abs(y - 48.2) < 1) return 3;
  if (y > 52.6 && y < 54.6 && dx > 11 && dx < 17.5 && Math.floor(dx - 11) % 2 === 0) return 3;
  // the hull: a raked bow, a low waist, a forecastle and a tall stern castle
  if (y < WL + 0.4 && dx > -18 + (y - 53) * 0.8 && dx < 18.5 - (y - 51) * 0.12) {
    const u = (dx + 18) / 36;
    const deck = 54.8 - 1.4 * smooth(0.24, 0.1, u) - 3.8 * smooth(0.7, 0.8, u);
    if (y > deck) return 1;
  }
  if (Math.abs(dx - 18.4) < 0.5 && y > 48 && y < 52) return 1;
  for (const [mx, top, sails] of MASTS) {
    if (Math.abs(x - mx) < 0.55 && y > top && y < 55) return 1;
    for (const [a, b, hw] of sails) {
      if (y < a || y > b) continue;
      const v = (y - a) / (b - a), half = hw + 0.6 * v, u = (x - mx) / half;
      // the foot of each sail arches up off its yard below
      if (Math.abs(u) < 1 && y < b - 1.1 * (1 - u * u) * (b - a > 5.6 ? 1 : 0.5)) return 1;
    }
  }
  // the bowsprit and its jib, a pennant at the main truck
  if (seg(x, y, SX - 16, 53.4, SX - 28.5, 48) < 0.55) return 1;
  if (inside(x, y, JIB)) return 1;
  if (x > SX - 5 && x < SX + 0.5 && Math.abs(y - 24.3 - (SX - x) * 0.15) < 1 - (SX - x) * 0.14) return 1;
  // stays
  if (seg(x, y, SX - 11, 30, SX - 28, 48.2) < 0.3 || seg(x, y, SX + 12, 32, SX + 18, 50) < 0.3) return 2;
  if (seg(x, y, SX + 0.5, 25, SX - 11, 30.5) < 0.3 || seg(x, y, SX + 0.5, 25, SX + 12, 32.5) < 0.3) return 2;
  return 0;
}

// The kraken's arms, far ones first. Each rises from (bx, by) on the water at angle th0 from upright, bends over its
// length and winds up into a curl at its tip; the swaying and the curling each go round n times a loop.
interface Arm {
  bx: number; by: number; r0: number; len: number;
  th0: number; bend: number; curl: number;
  sway: number; n1: number; n2: number; ph: number;
}
const ARMS: Arm[] = [
  { bx: 71, by: 64, r0: 3, len: 40, th0: -0.25, bend: 0.4, curl: 6, sway: 0.3, n1: 3, n2: 2, ph: 0.6 },
  { bx: 144, by: 70, r0: 5.5, len: 66, th0: 0.3, bend: -0.5, curl: -6.2, sway: 0.26, n1: 2, n2: 1, ph: 2.4 },
  { bx: 55, by: 78, r0: 6.5, len: 76, th0: -0.1, bend: 0.4, curl: 6, sway: 0.24, n1: 2, n2: 3, ph: 4.1 },
  { bx: 181, by: 92, r0: 10, len: 110, th0: 0.16, bend: -0.5, curl: -6, sway: 0.15, n1: 1, n2: 2, ph: 1.3 },
  { bx: 24, by: 96, r0: 11, len: 126, th0: -0.12, bend: 0.55, curl: 6.2, sway: 0.13, n1: 1, n2: 1, ph: 5.2 },
];
const STEP = 0.5;
const MAXN = 280;

export default function krakenRising(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out = new Array<string>(N);

  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < P.length; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  const mat = new Uint8Array(N);
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  const halo = new Float32Array(N); // how much moonlight hangs in the air at each cell
  const lamp = new Float32Array(N);
  const LAN = [SX + 19, 48.2 + SY];

  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      const dx = xc - MOON[0], dy = y - MOON[1], md = Math.sqrt(dx * dx + dy * dy);
      const de = Math.max(0, md - MR);
      halo[k] = 0.4 * Math.exp(-de / 7) + 0.3 * Math.exp(-de / 30) + 0.14 * Math.exp(-de / 90);
      const ld = Math.hypot(xc - LAN[0], (y - LAN[1]) * 1.15);
      lamp[k] = Math.exp(-ld / 1.6) * 0.9 + Math.exp(-ld / 6) * 0.14;
      if (y >= HZ) {
        mat[k] = SEA;
        continue;
      }
      const sh = ship(xc, y);
      if (sh === 1) {
        mat[k] = HULL;
        // black, the rail and the sails' moonward edges barely lit
        R[k] = 0.012, G[k] = 0.014, B[k] = 0.02;
        continue;
      }
      if (sh === 3) {
        mat[k] = LAMP;
        continue;
      }
      if (md < MR) {
        mat[k] = DISC;
        // cream, warming toward the horizon, with its seas and a darker limb
        const low = smooth(MOON[1] - 6, HZ, y);
        let cr = 1, cg = mix(0.955, 0.83, low), cb = mix(0.83, 0.56, low);
        const mare = smooth(0.5, 0.62, fbm(xc * 0.075 + 3.3, y * 0.085 + 1.7, 4)) * 0.75 + smooth(0.56, 0.66, fbm(xc * 0.2 + 9, y * 0.2, 3)) * 0.25;
        cr = mix(cr, 0.8, mare * 0.62), cg = mix(cg, 0.73, mare * 0.62), cb = mix(cb, 0.6, mare * 0.62);
        const limb = 1 - 0.14 * smooth(MR - 5, MR, md);
        cr *= limb, cg *= limb, cb *= limb;
        if (sh === 2) (cr = 0.37), (cg = 0.42), (cb = 0.49);
        R[k] = cr, G[k] = cg, B[k] = cb;
        continue;
      }
      // the sky: indigo overhead, teal toward the sea, and the moon's light in the air
      mat[k] = SKY;
      const v = clamp(y / HZ), a = v * v;
      let cr = mix(0.05, 0.05, a), cg = mix(0.09, 0.27, a), cb = mix(0.22, 0.36, a);
      const hl = halo[k];
      cr += hl * 0.62, cg += hl * 0.86, cb += hl * 0.84;
      // a bright haze lying along the horizon
      const hz = Math.exp(-(HZ - y) / 5) * (0.07 + 0.25 * Math.exp(-Math.abs(dx) / 60));
      cr += hz * 0.55, cg += hz * 0.9, cb += hz * 0.9;
      if (sh === 2) (cr *= 0.4), (cg *= 0.4), (cb *= 0.4);
      R[k] = cr, G[k] = cg, B[k] = cb;
    }

  // thin cloud in long streaks, tileable so it drifts for ever
  const CW = 420, C0 = 14, C1 = 50;
  const ccov = new Float32Array(CW * (C1 - C0));
  for (let r = C0; r < C1; r++)
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5, f = x / CW;
      const n = fbm(x * 0.014, y * 0.2, 4) * (1 - f) + fbm((x - CW) * 0.014, y * 0.2, 4) * f;
      const band = Math.exp(-Math.pow((y - 31 - 4 * Math.sin((x / CW) * TAU)) / 5, 2)) + 0.6 * Math.exp(-Math.pow((y - 22 - 3 * Math.sin((x / CW) * TAU * 2 + 1)) / 3, 2));
      ccov[(r - C0) * CW + x] = smooth(0.46, 0.66, n) * clamp(band);
    }

  const stars: [number, number, number][] = [];
  for (let i = 0; i < 420; i++) {
    const x = Math.floor(hash(i, 21) * W), r = Math.floor(Math.pow(hash(i, 22), 1.3) * (HZ - 10));
    const k = r * W + x;
    if (mat[k] !== SKY || halo[k] > 0.2 || hash(i, 25) < 0.5) continue;
    stars.push([k, hash(i, 23) * 6.28, 1 + Math.floor(hash(i, 24) * 6)]);
  }

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[(Math.floor(k / W) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  // the arms this frame: which arm covers a cell, how far out from its spine (0 to 1), the offset from the spine as
  // a direction, which side of the spine, and how far along
  const tid = new Uint8Array(N);
  const tnd = new Float32Array(N), tox = new Float32Array(N), toy = new Float32Array(N), tac = new Float32Array(N), tq = new Float32Array(N), ts = new Float32Array(N);
  const spx = new Float32Array(MAXN), spy = new Float32Array(MAXN), spr = new Float32Array(MAXN), snx = new Float32Array(MAXN), sny = new Float32Array(MAXN);
  // drips: each falls from under a point on an arm, again and again
  const drips: [number, number, number, number][] = [];
  ARMS.forEach((a, j) => {
    const n = a.r0 > 5 ? 9 : a.r0 > 3 ? 6 : 3;
    for (let i = 0; i < n; i++) drips.push([j, 0.2 + 0.68 * hash(i, 300 + j), 8 + Math.floor(hash(i, 310 + j) * 9), hash(i, 320 + j)]);
  });
  const armX = new Float32Array(ARMS.length * MAXN), armY = new Float32Array(ARMS.length * MAXN), armR = new Float32Array(ARMS.length * MAXN);
  const armN = ARMS.map((a) => Math.min(MAXN - 1, Math.ceil(a.len / STEP)));

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, w = (u / LOOP) * TAU;
    const tick = Math.floor(u * 8);
    const flick = 0.86 + 0.08 * Math.sin(w * 31) + 0.06 * Math.sin(w * 73 + 1);
    const cdrift = (((t * 1.1) % CW) + CW) % CW;

    // --- lay the arms out ---------------------------------------------------------
    tid.fill(0);
    for (let j = 0; j < ARMS.length; j++) {
      const a = ARMS[j], n = armN[j], id = j + 1;
      let x = a.bx, y = a.by + 2.5, q = 0;
      const lean = a.th0 + 0.07 * Math.sin(w * a.n1 + a.ph);
      const wind = a.curl * (1 + 0.16 * Math.sin(w * a.n2 + a.ph * 1.7));
      for (let i = 0; i <= n; i++) {
        const s = i / n;
        const th = lean + a.bend * s + a.sway * s * Math.sin(w * a.n1 + a.ph - 2.6 * s) + wind * Math.pow(s, 5);
        const rr = a.r0 * (0.1 + 0.9 * Math.pow(1 - s, 0.8));
        spx[i] = x, spy[i] = y, spr[i] = rr, snx[i] = Math.cos(th), sny[i] = Math.sin(th);
        armX[j * MAXN + i] = x, armY[j * MAXN + i] = y, armR[j * MAXN + i] = rr;
        // stamp a disc
        const x0 = Math.max(0, Math.floor(x - rr)), x1 = Math.min(W - 1, Math.ceil(x + rr));
        const y0 = Math.max(0, Math.floor(y - rr)), y1 = Math.min(H - 1, Math.ceil(y + rr));
        const r2 = rr * rr;
        for (let cy = y0; cy <= y1; cy++) {
          const ddy = cy + 0.5 - y;
          if (s < 0.3 && cy + 0.5 > a.by) continue; // under the water
          for (let cx = x0; cx <= x1; cx++) {
            const ddx = cx + 0.5 - x, d2 = ddx * ddx + ddy * ddy;
            if (d2 >= r2) continue;
            const k = cy * W + cx, nd = Math.sqrt(d2) / rr;
            if (tid[k] === id && nd >= tnd[k]) continue;
            tid[k] = id, tnd[k] = nd;
            tox[k] = ddx / rr, toy[k] = ddy / rr;
            tac[k] = (ddx * snx[i] + ddy * sny[i]) / rr;
            tq[k] = q, ts[k] = s;
          }
        }
        x += Math.sin(th) * STEP, y -= Math.cos(th) * STEP;
        q += STEP / Math.max(1.2, rr);
      }
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k];
        let cr = R[k], cg = G[k], cb = B[k], fl = 0.03, flat = false;
        const id = tid[k];
        if (id) {
          // an arm: dark and wet, the edge that faces the moon rimmed with its light
          const a = ARMS[id - 1], nd = tnd[k];
          let lx = MOON[0] - (x + 0.5), ly = MOON[1] - y;
          const ll = Math.sqrt(lx * lx + ly * ly) + 1e-3;
          lx /= ll, ly /= ll;
          const face = (tox[k] * lx + toy[k] * ly) / (nd + 0.05); // 1 on the moonward edge, -1 on the far one
          const hl = 0.75 + 1.2 * halo[k];
          const rim = smooth(0.35, 0.9, nd) * smooth(-0.2, 0.7, face) * hl + smooth(0.82, 1, nd) * 0.1 * hl;
          // wet skin: streaks of water running down it, glinting
          const run = noise(tq[k] * 2.2 + u * 2.5, tac[k] * 2.5 + id * 7, 0);
          const sheen = smooth(0.62, 0.82, run) * smooth(0.95, 0.2, nd) * (0.15 + 0.5 * smooth(-0.6, 0.6, face)) * hl;
          cr = 0.012 + 0.02 * nd, cg = 0.022 + 0.035 * nd, cb = 0.034 + 0.04 * nd;
          // the round of the arm, faintly, on the side the moon sees
          const round = Math.max(0, face) * nd * 0.11 * hl;
          cr += round * 0.4, cg += round * 0.9, cb += round;
          cr += rim * 0.72 + sheen * 0.5, cg += rim * 0.9 + sheen * 0.85, cb += rim * 0.84 + sheen * 0.9;
          fl = 0;
        } else if (m === SEA) {
          const depth = (y - HZ) / (H - HZ);
          // swells in perspective, crowding toward the horizon and rolling toward us
          const sway = Math.sin(w * 2 + y * 0.21) * 0.7;
          const wv = noise((x + 0.5 - MOON[0]) * 0.42 / (0.32 + 2.3 * depth) + sway + 40, 13 / (depth + 0.11) + (u / LOOP) * 48, 48);
          const ch = noise(x * 0.9 + 11, y * 1.7 + (u / LOOP) * 96, 96);
          const wave = 0.72 * wv + 0.28 * ch;
          cr = mix(0.035, 0.012, depth), cg = mix(0.14, 0.055, depth), cb = mix(0.19, 0.1, depth);
          const facet = smooth(0.42, 0.8, wave);
          cr += facet * 0.04, cg += facet * 0.15, cb += facet * 0.16;
          // the moon's path: wide under the moon, wider toward us, glittering on the faces of the swells
          const dx = x + 0.5 - MOON[0];
          const hw = 17 + 46 * depth;
          const path = Math.exp(-(dx * dx) / (hw * hw)) * (1 - 0.35 * depth);
          const wide = Math.exp(-Math.abs(dx) / 80) * 0.22;
          const glit = smooth(0.5, 0.74, wave) * (path * 1.7 + wide * 0.5) + path * 0.16 * smooth(0.25, 0, depth);
          cr += glit, cg += glit * 0.93, cb += glit * 0.76;
          if (path > 0.25 && hash(k, tick) > 0.985 - 0.02 * path) (cr += 0.7), (cg += 0.68), (cb += 0.6);
          // the galleon's shadow lying on the path, broken
          if (y < WL + 9 && Math.abs(x + 0.5 - SX) < 19) {
            const sd = smooth(19, 13, Math.abs(x + 0.5 - SX)) * smooth(WL + 9, WL, y) * (0.5 + 0.5 * smooth(0.7, 0.3, wave));
            cr *= 1 - 0.85 * sd, cg *= 1 - 0.85 * sd, cb *= 1 - 0.8 * sd;
          }
          // each arm stands in its own dark reflection and a ring of foam
          for (let j = 0; j < ARMS.length; j++) {
            const a = ARMS[j], ax = x + 0.5 - a.bx, ay = y - a.by;
            if (ay < -a.r0 || ay > a.r0 * 4 || Math.abs(ax) > a.r0 * 3.2) continue;
            if (ay > 0) {
              const sd = smooth(a.r0 * 1.25, a.r0 * 0.6, Math.abs(ax + (wave - 0.5) * 3)) * smooth(a.r0 * 4, a.r0 * 0.5, ay) * 0.85;
              cr *= 1 - sd, cg *= 1 - sd, cb *= 1 - sd * 0.9;
            }
            const ex = ax / (a.r0 * 2.1), ey = (ay - 0.3) / (a.r0 * 0.42 + 0.8);
            const e = Math.sqrt(ex * ex + ey * ey);
            const ring = 0.5 + 0.5 * Math.sin(e * 5 - w * 12 - j);
            const foam = smooth(1.5, 0.75, e) * (0.3 + 0.7 * noise(x * 0.7 + j * 9, y * 1.1 + (u / LOOP) * 72, 72)) * (0.55 + 0.45 * ring);
            cr = mix(cr, 0.86, foam), cg = mix(cg, 0.95, foam), cb = mix(cb, 0.94, foam);
          }
          // the lantern's streak under the stern
          const ls = Math.exp(-Math.abs(x + 0.5 - LAN[0]) / (1 + depth * 5)) * smooth(0.4, 0.8, wave) * smooth(WL + 18, WL, y) * 1.6 * flick;
          const la = clamp(ls);
          cr = mix(cr, 1, la), cg = mix(cg, 0.5, la), cb = mix(cb, 0.12, la);
          fl = 0.03;
        } else if (m === LAMP) {
          (cr = 1), (cg = 0.6 * flick), (cb = 0.2 * flick), (fl = 1);
        } else {
          if ((m === SKY || m === DISC) && r >= C0 && r < C1) {
            const sx = x + cdrift, ix = Math.floor(sx), fx = sx - ix;
            const i0 = (r - C0) * CW + (ix % CW), i1 = (r - C0) * CW + ((ix + 1) % CW);
            const c = ccov[i0] + (ccov[i1] - ccov[i0]) * fx;
            if (c > 0.01) {
              if (m === DISC) {
                // across the face of the moon the cloud is a veil, darker than the disc
                const a = c * 0.6;
                cr = mix(cr, 0.5, a), cg = mix(cg, 0.5, a), cb = mix(cb, 0.54, a);
              } else {
                // in the sky it is lit from behind, brightest near the moon
                const hl = halo[k], a = c * 0.75;
                cr = mix(cr, 0.06 + hl * 0.95, a), cg = mix(cg, 0.1 + hl * 1.05, a), cb = mix(cb, 0.16 + hl * 0.95, a);
              }
            }
          }
          if (m === DISC) flat = true;
          else if (m === HULL) fl = 0;
        }
        // lamplight
        const g = lamp[k] * flick;
        if (g > 0.01 && m !== DISC && !id) (cr += g), (cg += g * 0.6), (cb += g * 0.22);

        if (flat) {
          // the moon: a full dot, its shading carried by its colour alone
          out[k] = "●";
          if (color) {
            const d = dith[k] * 0.07;
            color[k] = nearest(clamp(cr + d), clamp(cg + d), clamp(cb + d));
          }
          continue;
        }
        cr = tone[Math.min(1024, (cr * 256) | 0)], cg = tone[Math.min(1024, (cg * 256) | 0)], cb = tone[Math.min(1024, (cb * 256) | 0)];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.05);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }

    const pale = color ? nearest(0.91, 0.95, 0.94) : 0;
    const dot = (x: number, y: number, ch: string) => {
      const cx = Math.floor(x), cy = Math.floor(y);
      if (cx < 0 || cx >= W || cy < 0 || cy >= H) return;
      const k = cy * W + cx;
      if (mat[k] === HULL || mat[k] === LAMP) return;
      out[k] = ch;
      if (color) color[k] = pale;
    };
    // water pouring off the arch of each arm in a ragged veil, thinning as it falls
    for (let j = 1; j < ARMS.length; j++) {
      const a = ARMS[j], n = armN[j];
      let last = -1;
      for (let i = Math.round(0.5 * n); i < Math.round(0.84 * n); i++) {
        const b = j * MAXN + i, cx = Math.floor(armX[b]);
        if (cx === last || cx < 0 || cx >= W) continue;
        last = cx;
        const fall = (3 + 13 * noise(cx * 0.6 + j * 17, j * 3.3)) * (a.r0 / 8 + 0.3);
        const y0 = armY[b] + armR[b] * 0.8;
        for (let y = Math.ceil(y0); y < y0 + fall && y < a.by; y++) {
          if (y < 0 || tid[y * W + cx] === j + 1) continue;
          const v = noise(cx * 1.7 + j * 7, y * 0.4 - (u / LOOP) * 144, 144) - 0.35 * ((y - y0) / fall);
          if (v > 0.47) dot(cx + 0.5, y, v > 0.6 ? "•" : "·");
        }
      }
    }
    // drips, each with a short tail, and a splash where it lands
    for (const [j, s, per, ph] of drips) {
      const a = ARMS[j], i = Math.round(s * armN[j]), b = j * MAXN + i;
      const life = LOOP / per, age = ((u / life + ph) % 1) * life;
      const x = armX[b], y = armY[b] + armR[b] + 9 * age * age;
      if (y < a.by) {
        dot(x, y, "•");
        if (age > 0.25) dot(x, y - 1.2, "·");
      } else if (y < a.by + 9 * 0.5) {
        dot(x - 1, a.by + 0.5, "·"), dot(x + 1, a.by + 0.5, "·");
      }
    }
    // stars twinkle in the darker corners
    for (const [k, ph, sp] of stars) {
      const s = Math.sin(w * sp + ph);
      if (s > -0.3 && !tid[k] && out[k] !== "●") {
        out[k] = s > 0.75 ? "•" : "·";
        if (color) color[k] = nearest(0.82, 0.84, 0.95);
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
