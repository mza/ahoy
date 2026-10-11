/*
 * ghost ship: a three-masted ship made of pale light, seen from off her
 * quarter as she slides through fog on a black, flat sea. Hull, spars and
 * torn sails are drawn in ghost green and cyan, brightest along their edges
 * and thin enough between them that the fog shows through; a green lantern
 * burns at her stern and at each masthead, and a thin crescent moon hangs
 * over her bow. Fog banks drift across behind her and in front at different
 * speeds, lit green where they pass through her halo. Her glow breathes, she
 * rises and falls on a swell that isn't there, the tatters of her sails stir,
 * her reflection wavers down the water, and corpse lights wander over it.
 *
 * The ship is painted once as light: an intensity and a tint for every cell,
 * with each sail keeping the noise that tore it so its holes can move. Each
 * frame lifts or drops her by whole cells, lays the fog over and under her,
 * and mirrors her in the sea. Then every cell is drawn as a halftone: a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest
 * its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ghost ship",
  category: "scenes",
  note: "a spectral ship glowing green in the fog under a crescent moon",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#020807",
  palette: [
    // night sky and sea, black-green to deep teal
    "#04100f", "#061816", "#09221f", "#0c2d2a", "#103a36", "#154843",
    // fog, deep teal to pale
    "#1a5851", "#216b62", "#2a8075", "#369689", "#48ac9d", "#62c0b0", "#86d2c3", "#aee2d5",
    // ghost green, deep to luminous
    "#0a3a22", "#0f5230", "#156c3e", "#1c884c", "#24a65c", "#30c46e", "#44de84", "#66f29e", "#90ffb8", "#bcffd2",
    // ghost cyan
    "#0c4650", "#12606a", "#197c86", "#229aa2", "#30b8bc", "#4ad4d4", "#74ecea", "#a4faf4", "#d0fffa",
    // bone white, the brightest of it
    "#e4ffe6", "#f4fff0", "#fffff4",
    // the moon, cold and pale
    "#8ea6b8", "#b4c8d6", "#d8e4ec", "#f0f6fa",
    // corpse lights
    "#c8f07a", "#e8ffb0",
  ],
} satisfies Meta;

const W = 200, H = 100;
const LOOP = 96; // seconds for the fog to come round again
const HZ = 60; // the horizon
const MOON = [30, 15];
const X0 = 42, LEN = 110; // the hull's near side runs from her bow at X0 to her quarter
const XQ = X0 + LEN, XT = XQ + 13; // her quarter, and the far edge of her transom
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const TAU = Math.PI * 2;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// value noise; with a period it repeats along x every that many cells
function noise(x: number, y: number, period: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  let x0 = xi, x1 = xi + 1;
  if (period) {
    x0 = ((xi % period) + period) % period;
    x1 = (x0 + 1) % period;
  }
  const a = hash(x0, yi), b = hash(x1, yi), c = hash(x0, yi + 1), d = hash(x1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves: number, period = 0): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f + i * 17, period * f);
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

// distance from a point to a segment
function seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  const ex = ax + dx * k - px, ey = ay + dy * k - py;
  return Math.sqrt(ex * ex + ey * ey);
}

/*
 * The ship, from off her starboard quarter: her bow is away to the left and
 * her stern near us on the right, so her waterline falls toward us along her
 * length and her transom shows, turned a little our way.
 */
const along = (x: number) => (x - X0) / LEN;
const waterline = (x: number) => {
  if (x < X0) return 66;
  if (x <= XQ) return 66 + 6 * along(x);
  return 72 - 1.9 * clamp((x - XQ) / (XT - XQ));
};
// the sheer: a forecastle, a low waist, a tall stern castle, all larger as they near us
const deck = (x: number) => {
  const s = clamp(along(x));
  const rise = 9.5 + 3.2 * Math.exp(-(((s - 0.03) / 0.07) ** 2)) + 7.5 * smooth(0.7, 0.85, s) + 1.6 * (2 * s - 1) ** 2;
  return 66 + 6 * s - (0.82 + 0.18 * s) * rise;
};
const MASTS: [number, number][] = [[64, 14], [98, 4], [128, 16]]; // x and top
// sails: mast, the yard's row, the foot's row, half-width at the yard and at the foot, how torn
const SAILS: [number, number, number, number, number, number][] = [
  [0, 18, 32, 8.5, 10, 0.5], [0, 35, 53, 11, 12.5, 0.72],
  [1, 8, 19, 7.5, 9, 0.42], [1, 22, 37, 10.5, 12.5, 0.62], [1, 40, 56, 13, 14.5, 0.8],
  [2, 20, 33, 8.5, 10, 0.55], [2, 36, 52, 10.5, 12, 0.76],
];
const TILT = 0.11; // the yards run away from us to the right, so their far ends sit higher
const RIG: [number, number, number, number, number][] = [
  [36, 57.5, 17, 48.5, 0.85], // the bowsprit
  [64, 14, 18, 48.5, 0.36], [64, 34, 28, 53, 0.36], // forestays
  [98, 4, 64, 14, 0.36], [98, 21, 64, 34, 0.36], [128, 16, 98, 21, 0.36], [128, 16, 151, 53, 0.36],
  [64, 20, 54, 59.5, 0.36], [64, 20, 74, 60.5, 0.36], // shrouds
  [98, 10, 86, 61, 0.36], [98, 10, 110, 62.5, 0.36],
  [128, 22, 119, 61, 0.36], [128, 22, 137, 58.5, 0.36],
];
const LAMPS: [number, number][] = [[64.5, 12.2], [98.5, 2.4], [128.5, 14.2], [XQ + 6.5, 48.4]];

export default function ghostShip(): Frame {
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

  // --- the ship as light, in her own coordinates --------------------------------
  const sI = new Float32Array(N); // hull, spars and rigging: how bright
  const sHue = new Float32Array(N); // 0 green, 1 cyan
  const sThr = new Float32Array(N); // sails: how much of the cloth is gone (0 where there is no sail)
  const sEat = new Float32Array(N); // the noise that tore it
  const sBody = new Float32Array(N); // the cloth's own faint light, and its bright hems
  const solid = new Uint8Array(N);

  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      let I = 0, hue = 0.2;
      // rigging, thin and faint
      for (const [ax, ay, bx, by, wd] of RIG) {
        const d = seg(xc, y, ax, ay, bx, by);
        if (d < wd + 0.25) I = Math.max(I, wd > 0.5 ? 0.95 : 0.34 * smooth(wd + 0.25, wd - 0.2, d) + 0.1);
      }
      // sails
      for (let i = 0; i < SAILS.length; i++) {
        const [mi, y0, y1, w0, w1, torn] = SAILS[i];
        const mx = MASTS[mi][0], lift = -TILT * (xc - mx);
        const v = (y - y0 - lift) / (y1 - y0);
        if (v < 0 || v > 1.12) continue;
        // the leeches curve in, the foot hangs in rags
        const half = mix(w0, w1, v) - 1.6 * Math.sin(clamp(v) * Math.PI);
        const uu = (xc - mx) / half;
        if (Math.abs(uu) > 1) continue;
        const rag = 1 - 0.3 * noise(xc * 0.42 + i * 13, 3.3, 0) + 0.24 * noise(xc * 0.9 + i * 5, 9.1, 0);
        if (v > rag) continue;
        const eat = fbm(xc * 0.15 + i * 7.3, y * 0.19, 3) + (1 - v) * 0.2;
        const hem = Math.min((1 - Math.abs(uu)) * half, v * (y1 - y0) + 0.3, (rag - v) * (y1 - y0) + 0.2);
        const fold = 0.5 + 0.5 * Math.sin(uu * 5.2 + v * 2 + i);
        sThr[k] = 0.24 + torn * 0.27;
        sEat[k] = eat;
        sBody[k] = 0.3 + 0.16 * fold + 0.12 * (1 - v) + 0.8 * smooth(1.6, 0.4, hem);
      }
      // yards, over the heads of the sails
      for (const [mi, y0, , w0] of SAILS) {
        const mx = MASTS[mi][0];
        if (Math.abs(xc - mx) < w0 + 2 && Math.abs(y - (y0 - 0.9 - TILT * (xc - mx))) < 0.75) (I = 1.05), (hue = 0.45);
      }
      // masts
      for (const [mx, top] of MASTS) if (Math.abs(xc - mx) < 0.95 && y > top && y < deck(mx) + 1) (I = 1.0), (hue = 0.4);
      // the hull's near side, raked forward at the stem
      let inHull = false, frac = 0;
      const dk = deck(xc), wl = waterline(xc) + 3;
      if (xc >= X0 && xc <= XQ) inHull = y >= dk && y < wl;
      else if (xc < X0) inHull = y >= deck(X0) && y < wl && X0 - xc < (67.5 - y) * 1.05;
      if (inHull) {
        frac = (y - dk) / (wl - 3 - dk);
        const s = along(xc);
        I = 0.3 + 0.14 * fbm(xc * 0.3, y * 1.4, 2);
        // the wales, bands of timber along her side
        if (Math.abs(frac - 0.3) < 0.06 || Math.abs(frac - 0.68) < 0.05) I = 0.5;
        // gunports, lit from within
        const gp = (s - 0.14) / 0.075, gi = Math.round(gp);
        if (gi >= 0 && gi <= 7 && Math.abs(gp - gi) * 0.075 * LEN < 1.25 && Math.abs(frac - 0.5) < 0.1) I = 0.95;
        hue = 0.1;
      }
      // the transom, with two rows of lit lights
      if (xc > XQ && xc <= XT) {
        const q = (xc - XQ) / (XT - XQ);
        const top = deck(XQ) - 0.6 * q, bot = waterline(xc) + 3;
        if (y >= top && y < bot) {
          inHull = true;
          const f = (y - top) / (bot - 3 - top);
          I = 0.24;
          const pane = Math.abs(((q * 4) % 1) - 0.5) < 0.3 && q > 0.08 && q < 0.95;
          if (pane && (Math.abs(f - 0.2) < 0.07 || Math.abs(f - 0.46) < 0.07)) I = 1.05;
          if (Math.abs(f - 0.7) < 0.035) I = 0.5;
          hue = 0.3;
        }
      }
      if (inHull) solid[k] = 1;
      // the stern lantern's post
      if (Math.abs(xc - LAMPS[3][0]) < 0.6 && y > LAMPS[3][1] && y < deck(XQ) + 0.5) I = Math.max(I, 0.8);
      sI[k] = I;
      sHue[k] = hue;
    }
  // the hull's outline burns brightest
  for (let r = 1; r < H - 1; r++)
    for (let x = 1; x < W - 1; x++) {
      const k = r * W + x;
      if (!solid[k]) continue;
      if (!solid[k - 1] || !solid[k + 1] || !solid[k - W]) (sI[k] = 1.1), (sHue[k] = 0.25);
      else if (!solid[k - 2] || !solid[k + 2] || !solid[k - 2 * W]) sI[k] = Math.max(sI[k], 0.55);
    }

  // the lanterns' light, and the halo the whole ship throws into the air
  const lamp = new Float32Array(N), halo = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      let g = 0;
      for (const [lx, ly] of LAMPS) {
        const d = Math.hypot(x + 0.5 - lx, r + 0.5 - ly);
        if (d < 30) g += Math.exp(-(d * d) / 2.2) * 1.5 + Math.exp(-d / 2.6) * 0.5 + Math.exp(-d / 9) * 0.1;
      }
      lamp[k] = g;
      halo[k] = Math.max(sI[k], sThr[k] > 0 && sEat[k] > sThr[k] ? sBody[k] : 0) + g * 0.6;
    }
  const tmp = new Float32Array(N);
  for (let pass = 0; pass < 3; pass++) {
    const rad = 7;
    for (let r = 0; r < H; r++) {
      let s = 0;
      for (let x = -rad; x <= rad; x++) s += halo[r * W + Math.max(0, Math.min(W - 1, x))];
      for (let x = 0; x < W; x++) {
        tmp[r * W + x] = s / (2 * rad + 1);
        s += halo[r * W + Math.min(W - 1, x + rad + 1)] - halo[r * W + Math.max(0, x - rad)];
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let r = -rad; r <= rad; r++) s += tmp[Math.max(0, Math.min(H - 1, r)) * W + x];
      for (let r = 0; r < H; r++) {
        halo[r * W + x] = s / (2 * rad + 1);
        s += tmp[Math.min(H - 1, r + rad + 1) * W + x] - tmp[Math.max(0, r - rad) * W + x];
      }
    }
  }
  // how much of her light stands over each column, for the path on the water
  const column = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let r = 0; r < 76; r++) s += halo[r * W + x];
    column[x] = s / 30;
  }

  // where the sea closes over her hull, and the line her reflection hangs from
  const cut = new Int16Array(W).fill(H), mirror = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    mirror[x] = waterline(Math.max(X0 - 12, Math.min(XT + 2, x + 0.5)));
    if (x >= X0 - 14 && x <= XT + 1) cut[x] = Math.round(mirror[x]);
  }

  // --- the night behind her -------------------------------------------------
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      const md = Math.hypot(xc - MOON[0], y - MOON[1]);
      const mh = Math.exp(-md / 7) * 0.16 + Math.exp(-md / 30) * 0.07;
      if (y < HZ) {
        const v = Math.pow(y / HZ, 1.8);
        R[k] = mix(0.004, 0.02, v) + mh * 0.75;
        G[k] = mix(0.016, 0.085, v) + mh * 0.92;
        B[k] = mix(0.02, 0.095, v) + mh;
      } else {
        const p = (y - HZ) / (H - HZ);
        R[k] = mix(0.012, 0.003, p), G[k] = mix(0.05, 0.016, p), B[k] = mix(0.055, 0.02, p);
      }
    }
  const stars: [number, number, number][] = [];
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(hash(i, 21) * W), r = Math.floor(Math.pow(hash(i, 22), 1.6) * 34);
    if (Math.hypot(x - MOON[0], r - MOON[1]) < 11) continue;
    stars.push([r * W + x, hash(i, 23) * TAU, 1 + Math.floor(hash(i, 24) * 4)]);
  }

  // --- fog, in banks that tile across the picture -----------------------------
  const bank = (seed: number, sx: number, sy: number, lo: number, hi: number, env: (y: number) => number) => {
    const f = new Float32Array(N);
    for (let r = 0; r < H; r++) {
      const e = env(r + 0.5);
      if (e < 0.01) continue;
      for (let x = 0; x < W; x++) f[r * W + x] = smooth(lo, hi, fbm(x * (sx / W), r * sy + seed, 4, sx)) * e;
    }
    return f;
  };
  const bell = (y: number, c: number, w: number) => Math.exp(-(((y - c) / w) ** 2));
  // far: a bank along the horizon and long streaks high among her masts
  const fogFar = bank(3, 4, 0.085, 0.3, 0.56, (y) => Math.max(bell(y, 53, 11) * smooth(HZ + 5, HZ - 3, y), 0.95 * bell(y, 22, 8)));
  // middle: thinner, higher, quicker
  const fogMid = bank(41, 5, 0.12, 0.38, 0.6, (y) => bell(y, 39, 12) * smooth(HZ + 2, HZ - 6, y));
  // near: low on the water in front of her
  const fogNear = bank(87, 3, 0.1, 0.32, 0.58, (y) => bell(y, 71, 7) + bell(y, 95, 8));

  // corpse lights: where each wanders, how far, how fast
  const WISPS: number[][] = [
    [26, 80, 16, 4, 3, 5, 0.3], [172, 78, 14, 3.5, 4, 7, 2.1], [66, 91, 22, 3, 5, 4, 4.0], [142, 90, 18, 3, 2, 9, 5.2], [186, 93, 9, 2.5, 7, 6, 1.1],
  ];

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[(Math.floor(k / W) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }
  const SHIPROWS = 78;
  const FG = new Float32Array(N), FH = new Float32Array(N);
  const wx = new Float32Array(WISPS.length), wy = new Float32Array(WISPS.length), wb = new Float32Array(WISPS.length);

  // a fog bank's thickness at a cell, the bank having drifted by so many cells
  const fogAt = (f: Float32Array, r: number, x: number, drift: number) => {
    const sx = x + drift, ix = Math.floor(sx), fx = sx - ix;
    const a = f[r * W + (((ix % W) + W) % W)], b = f[r * W + ((((ix + 1) % W) + W) % W)];
    return a + (b - a) * fx;
  };

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, ph = (u / LOOP) * TAU;
    const pulse = 0.9 + 0.11 * Math.sin(ph * 12 + 0.8); // a breath every eight seconds
    const bob = Math.round(1.35 * Math.sin(ph * 8 + 0.9)); // a swell every twelve
    const flick = 0.88 + 0.08 * Math.sin(ph * 131) + 0.05 * Math.sin(ph * 317 + 1);
    const dFar = -(u / LOOP) * W, dMid = -(u / LOOP) * W * 2, dNear = -(u / LOOP) * W * 3;
    const thick1 = 0.8 + 0.2 * Math.sin(ph * 5), thick2 = 0.78 + 0.22 * Math.sin(ph * 7 + 2), thick3 = 0.8 + 0.2 * Math.sin(ph * 4 + 4);

    // the ship this frame: lifted or dropped, her sails' holes stirring
    for (let r = 0; r < SHIPROWS; r++) {
      const rs = r - bob;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        if (rs < 0 || r >= cut[x]) {
          FG[k] = 0;
          continue;
        }
        const j = rs * W + x;
        let I = sI[j], h = sHue[j];
        const thr = sThr[j];
        if (thr > 0) {
          const th = thr + 0.035 * Math.sin(ph * 19 + x * 0.21 + rs * 0.16) + 0.02 * Math.sin(ph * 43 - x * 0.5);
          const e = sEat[j];
          if (e > th) {
            const s = sBody[j] + 0.8 * smooth(th + 0.075, th + 0.01, e);
            if (s > I) (I = s), (h = 0.85);
          }
        }
        // a bright line where she meets the sea
        if (r === cut[x] - 1 && x >= X0 - 2 && x <= XT) (I = 1.15), (h = 0.3);
        FG[k] = I * pulse;
        FH[k] = h;
      }
    }
    for (let i = 0; i < WISPS.length; i++) {
      const [cx, cy, ax, ay, fa, fb, p0] = WISPS[i];
      wx[i] = cx + ax * Math.sin(ph * fa + p0) + 2 * Math.sin(ph * 23 + p0 * 3);
      wy[i] = cy + ay * Math.sin(ph * fb + p0 * 2) + 0.8 * Math.sin(ph * 37 + p0);
      wb[i] = clamp(0.62 + 0.5 * Math.sin(ph * (11 + i * 2) + p0 * 5));
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let cr = R[k], cg = G[k], cb = B[k];
        const rs = r - bob;
        const hl = rs >= 0 && rs < H ? halo[rs * W + x] * pulse : 0;
        if (r >= HZ) {
          // the sea: flat, black, a little long ripple, and her light hanging down in it
          const p = (y - HZ) / (H - HZ);
          const w = noise(y * 1.15 - (u / LOOP) * 64, x * 0.1 + 40, 32);
          const face = smooth(0.3, 0.72, w);
          cr += face * 0.004, cg += face * 0.022, cb += face * 0.024;
          const m = mirror[x], d = y - m;
          if (d > 1) {
            const wob = Math.sin(y * 1.7 - ph * 46 + Math.sin(x * 0.13 + ph * 9) * 1.4) * (0.3 + 0.09 * d);
            let sx = Math.round(x + wob);
            sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
            let sr = Math.round(mirror[sx] - 0.5 - d * 1.55 + (w - 0.5) * 0.12 * d);
            sr = sr < 0 ? 0 : sr > SHIPROWS - 1 ? SHIPROWS - 1 : sr;
            const j = sr * W + sx;
            const keep = mix(0.2, 1.1, face) * mix(1, 0.55, p);
            const g = FG[j] * keep, h = FH[j];
            cr += g * mix(0.2, 0.25, h), cg += g * mix(0.95, 0.9, h), cb += g * mix(0.5, 0.85, h);
            // and under it all a broad green path
            const path = column[sx] * (0.25 + 0.75 * face) * Math.exp(-d / 30) * pulse * 0.8;
            cr += path * 0.15, cg += path * 0.9, cb += path * 0.55;
          }
          // the moon, faintly, on the far water
          const mp = Math.exp(-Math.abs(x + 0.5 - MOON[0]) / (2 + p * 16)) * smooth(0.55, 0.8, w) * smooth(HZ + 14, HZ, y) * 0.3;
          cr += mp * 0.8, cg += mp * 0.92, cb += mp;
        }
        // fog behind her, cold where the moon finds it, green inside her halo
        const fb = r < HZ + 6 ? Math.min(1, fogAt(fogFar, r, x, dFar) * thick1 + fogAt(fogMid, r, x, dMid) * thick2 * 0.8) : 0;
        if (fb > 0.01) {
          const a = fb * 0.9;
          const dn = (0.5 + 0.9 * fb) * (1 - 0.6 * clamp(hl * 2.5)), lr = 0.26 * dn + hl * 0.1, lg = 0.5 * dn + hl * 0.8, lb = 0.54 * dn + hl * 0.42;
          cr = mix(cr, lr, a), cg = mix(cg, lg, a), cb = mix(cb, lb, a);
        }
        // her halo in the bare air
        cr += hl * 0.03, cg += hl * 0.2, cb += hl * 0.13;
        // the ship herself
        if (r < SHIPROWS) {
          const I = FG[k];
          if (I > 0.01) {
            const h = FH[k], white = smooth(0.72, 1.0, I);
            cr += I * mix(mix(0.2, 0.3, h), 0.95, white);
            cg += I * mix(mix(1, 0.92, h), 1, white);
            cb += I * mix(mix(0.52, 0.95, h), 0.88, white);
          }
        }
        if (rs >= 0 && r < cut[x]) {
          const lg = lamp[rs * W + x] * flick;
          if (lg > 0.01) (cr += lg * 0.55), (cg += lg), (cb += lg * 0.6);
        }
        // fog in front of her
        if (r > 52) {
          const fn = fogAt(fogNear, r, x, dNear) * thick3;
          if (fn > 0.01) {
            const a = fn * 0.8;
            const dn = (0.5 + 0.9 * fn) * (1 - 0.5 * clamp(hl * 2.5)), lr = 0.26 * dn + hl * 0.1, lg = 0.46 * dn + hl * 0.8, lb = 0.5 * dn + hl * 0.42;
            cr = mix(cr, lr, a), cg = mix(cg, lg, a), cb = mix(cb, lb, a);
          }
        }
        // corpse lights over the water
        if (r > 66)
          for (let i = 0; i < wx.length; i++) {
            const dx = x + 0.5 - wx[i], dy = y - wy[i];
            if (dx > 9 || dx < -9 || dy < -9 || dy > 12) continue;
            const d2 = dx * dx + dy * dy;
            let g = Math.exp(-d2 / 1.3) * 1.5 + Math.exp(-Math.sqrt(d2) / 2.2) * 0.3;
            // each one's light dropped on the water under it
            if (dy > 1.5) g += Math.exp(-Math.abs(dx) / 0.9) * Math.exp(-dy / 4) * 0.45;
            g *= wb[i];
            cr += g * 0.75, cg += g, cb += g * 0.5;
          }

        cr = tone[Math.min(1024, (cr * 256) | 0)], cg = tone[Math.min(1024, (cg * 256) | 0)], cb = tone[Math.min(1024, (cb * 256) | 0)];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(0.02 + 0.98 * Math.pow(peak, 1.1) * 1.05);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }

    // the crescent moon: a disc with a bite out of it
    for (let r = MOON[1] - 8; r <= MOON[1] + 8; r++)
      for (let x = MOON[0] - 8; x <= MOON[0] + 8; x++) {
        const dx = x + 0.5 - MOON[0], dy = r + 0.5 - MOON[1];
        if (dx * dx + dy * dy >= 6.6 * 6.6) continue;
        const bx = dx - 3.6, by = dy + 1.6;
        if (bx * bx + by * by < 6.3 * 6.3) continue;
        const k = r * W + x;
        out[k] = "●";
        if (color) color[k] = nearest(0.92, 0.96, 1);
      }
    for (const [k, p0, sp] of stars) {
      const s = Math.sin(ph * sp * 9 + p0);
      if (s > -0.3 && out[k] === " ") {
        out[k] = s > 0.8 ? "•" : "·";
        if (color) color[k] = nearest(0.7, 0.8, 0.85);
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
