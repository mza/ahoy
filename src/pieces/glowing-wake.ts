/*
 * glowing wake: a lone pirate sloop running away from us through a warm
 * night sea, toward the Milky Way rising out of the horizon ahead. Its hull
 * stirs the plankton, so the water it has passed through glows electric cyan:
 * a wake that opens toward us, sparkling as it fades. The lantern on its
 * stern swings, the flag at the masthead streams, and now and then a meteor
 * falls.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "glowing wake",
  category: "scenes",
  note: "a pirate sloop running at night, its wake aglow under the milky way",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#03050b",
  palette: [
    // night sky, navy to the glow along the horizon
    "#070b1a", "#0b1226", "#111a33", "#172342", "#1e2d52", "#273a63",
    // the Milky Way, violet-blue clouds to its white heart and warm core
    "#36406e", "#4a5384", "#5f689b", "#7a82b3", "#98a0c9", "#b8bedc", "#d8dcee", "#f2f3fa",
    "#6e5f7e", "#8f7686", "#b28f8c", "#d2a993", "#ecc6a2", "#fbe2c0",
    // stars
    "#ffffff", "#cfe0ff", "#fff1d6",
    // the plankton's glow, deep teal to electric cyan to white-hot
    "#06302f", "#0a4642", "#0e5f58", "#127a6f", "#17978a", "#1fb6a4", "#2fd3bd", "#52ecd2", "#8ff8e2", "#cffff3",
    "#0d3b4a", "#135468", "#1c7088",
    // the sea
    "#050912", "#08101d", "#0c1628", "#121e35", "#1a2843",
    // hull and sails
    "#10141d", "#171c28", "#202737", "#2b3346", "#3a4358", "#4d566c",
    // the lantern
    "#5a3a1c", "#9a5e22", "#d88a2c", "#f6b44c", "#ffd98a", "#fff1c8",
    // the island and its palm, and the flag's bones
    "#060a10", "#0a1018", "#e8e2d0",
  ],
} satisfies Meta;

const W = 200, H = 100;
const LOOP = 12;
const HZ = 56; // the horizon
const WL = 64; // the sloop's waterline at its stern
const CX = 100; // its stern's middle
const MX = 101, MT = 13; // its mast and masthead
const D0 = WL - HZ; // how far below the horizon the stern sits, which sets how fast the wake opens toward us
const SPREAD = 19; // how far the wake's arms open, in cells, for each D0 rows nearer
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
// The water slides aft past the hull at V a second, in lengths of wake; its texture repeats every PER noise cells, and
// both are picked so the picture comes back to where it started after LOOP seconds.
const F = 9, PER = 12, V = PER / (F * LOOP);
const CHEV = (2 * Math.PI * 9) / (V * LOOP);

const SKY = 0, ISLE = 1, SEA = 2, HULL = 3, SAIL = 4, SPAR = 5;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

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

function fbm(x: number, y: number, octaves: number): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f, 0);
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

// whether a point is inside a polygon
function inside(px: number, py: number, poly: number[][]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/*
 * The sloop seen from astern as it runs away from us: a rounded transom with lit windows, the mainsail swung out to
 * port on its boom and the jib boomed out to starboard, wing and wing, a topsail over the gaff.
 */
const hull = (x: number, y: number) => {
  const dx = x - CX;
  // a transom that swells out from the deck and tucks in at the waterline
  if (y < WL - 5.5 || y >= WL + 0.4) return false;
  const v = (y - (WL - 5.5)) / 5.9;
  const half = 8.6 + 1.2 * Math.sin(v * Math.PI * 0.8) - 3.2 * v * v * v;
  return Math.abs(dx) <= half;
};
const MAIN = [[MX - 0.5, MT + 8], [80, MT + 13], [75.5, WL - 9.5], [MX - 0.5, WL - 7.4]];
const TOP = [[MX - 0.5, MT + 0.5], [MX - 0.5, MT + 7], [88, MT + 11]];
const JIB = [[MX + 0.3, MT + 3], [102.5, WL - 8.5], [119, WL - 11.5]];
const SPARS: number[][] = [
  [75, WL - 9.7, MX, WL - 7.4, 0.55], // boom
  [79.5, MT + 13.2, MX, MT + 8, 0.5], // gaff
  [MX + 0.6, WL - 9.2, 119.5, WL - 11.8, 0.4], // the jib's pole
  [MX, MT, CX - 8, WL - 5.6, 0.2], // shrouds
  [MX, MT, CX + 8, WL - 5.6, 0.2],
  [CX - 0.5, WL - 5.5, CX - 0.5, WL - 9.5, 0.4], // the lantern's post
];

export default function glowingWake(): Frame {
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
  const floorA = new Float32Array(N).fill(0.03);
  const band = new Float32Array(N);

  // --- the sky and the Milky Way -----------------------------------------------
  // The band rises out of the sea right behind the sloop, its warm core low on the horizon, and arches off the top
  // right; a dark rift of dust runs up its middle.
  const ax = CX - 24, ay = HZ + 2, dxm = 0.62, dym = -0.78;
  const skyAt = (x: number, y: number, k: number): [number, number, number] => {
    const v = clamp(y / HZ);
    const a = Math.pow(v, 2.2);
    let r = mix(0.006, 0.03, a), g = mix(0.01, 0.05, a), b = mix(0.03, 0.1, a);
    const px = x - ax, py = y - ay;
    const u = px * dxm + py * dym, d = -px * dym + py * dxm;
    const spread = 13 + u * 0.12; // wider as it climbs toward us
    const tex = fbm(u * 0.05, d * 0.1, 5);
    let m = Math.exp(-(d * d) / (2 * spread * spread)) * (0.05 + 1.3 * Math.pow(tex, 2.4));
    const rift = smooth(0.46, 0.7, fbm(u * 0.055 + 11, d * 0.18 + 3, 4)) * Math.exp(-((d - 1) * (d - 1)) / 40);
    m *= 1 - 0.85 * rift;
    const core = Math.exp(-((u - 20) * (u - 20)) / (2 * 22 * 22)) * Math.exp(-(d * d) / (2 * 12 * 12));
    m *= 1 + 1.8 * core;
    m *= smooth(HZ + 1, HZ - 7, y);
    // a broad glow of the core over the horizon
    const halo = Math.exp(-((x - CX + 10) * (x - CX + 10)) / (2 * 40 * 40)) * Math.exp(-(HZ - y) / 9) * 0.07;
    const w = clamp(core * 1.4);
    r += m * mix(0.42, 0.95, w) + halo * 0.9, g += m * mix(0.46, 0.74, w) + halo * 0.7, b += m * mix(0.78, 0.55, w) + halo * 0.6;
    band[k] = m;
    return [r, g, b];
  };

  // low islands on the far horizon, one with palms against the glow
  const isle = (x: number) =>
    HZ - Math.max(0, (2.6 + 2.6 * fbm(x * 0.07, 4, 3)) * smooth(132, 140, x) * smooth(176, 166, x), (1.2 + 1.6 * fbm(x * 0.09, 8, 3)) * smooth(22, 30, x) * smooth(58, 48, x));
  const palm = (x: number, y: number, bx: number, h: number, lean: number) => {
    const t = clamp((HZ - 2 - y) / h);
    const cx = bx + lean * t * t;
    if (y > HZ - 2 - h && y < HZ - 1 && Math.abs(x - cx) < 0.55 + 0.3 * (1 - t)) return true;
    const tx = bx + lean, ty = HZ - 2 - h;
    for (let i = 0; i < 6; i++) {
      const ang = -2.8 + i * 0.95, len = 4 + 1.4 * hash(i, bx);
      for (let q = 0; q <= 1; q += 0.12) {
        const fx = tx + Math.cos(ang) * len * q, fy = ty + Math.sin(ang) * len * q * 0.6 + 2.4 * q * q;
        if (Math.abs(x - fx) < 0.7 && Math.abs(y - fy) < 0.55 * (1.2 - q)) return true;
      }
    }
    return false;
  };

  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      let m = SKY, cr = 0, cg = 0, cb = 0, fl = 0.03;
      if (y < HZ) {
        [cr, cg, cb] = skyAt(xc, y, k);
        if (y >= isle(xc) || palm(xc, y, 150, 9, 2.5) || palm(xc, y, 156, 7, -2)) (m = ISLE), (cr = 0.01), (cg = 0.016), (cb = 0.026), (fl = 0.01);
      } else {
        m = SEA;
        const p = (y - HZ) / (H - HZ);
        cr = mix(0.02, 0.004, p), cg = mix(0.035, 0.008, p), cb = mix(0.07, 0.02, p);
        fl = 0.01;
      }
      if (hull(xc, y)) {
        m = HULL;
        // black timber with a lighter wale, three lit stern windows, the wake's light along the waterline
        const dx = xc - CX, top = WL - 5.5;
        cr = 0.012, cg = 0.014, cb = 0.022;
        if (Math.abs(y - (top + 0.6)) < 0.5) (cr = 0.05), (cg = 0.055), (cb = 0.07);
        if (y > top + 1.6 && y < top + 2.9 && (Math.abs(dx) < 1.1 || Math.abs(Math.abs(dx) - 4) < 1.1)) (cr = 0.95), (cg = 0.58), (cb = 0.2), (fl = 0.25);
        const lit = Math.exp(-(WL + 0.4 - y) / 1.2) * 0.6;
        cr += lit * 0.12, cg += lit * 0.75, cb += lit * 0.62;
        fl = Math.max(fl, 0);
      } else if (inside(xc, y, MAIN) || inside(xc, y, TOP) || inside(xc, y, JIB)) {
        m = SAIL;
        // dark canvas, its seams and patches faint, lit from beneath by the glowing water
        const seam = Math.abs(((y - MT) / 3.6) % 1) < 0.16 ? 0.75 : 1;
        const patch = hash(Math.floor(xc / 5), Math.floor(y / 4)) > 0.88 ? 0.78 : 1;
        const below = Math.exp(-(WL - 7 - y) / 4.5) * 0.8;
        cr = 0.022 * seam * patch, cg = 0.026 * seam * patch, cb = 0.038 * seam * patch;
        cr += below * 0.035, cg += below * 0.36, cb += below * 0.33;
        fl = 0;
      } else {
        let spar = Math.abs(xc - MX) < 0.55 && y >= MT && y < WL - 5;
        for (const [sx, sy, ex, ey, wd] of SPARS) if (seg(xc, y, sx, sy, ex, ey) < wd) spar = true;
        if (spar) (m = SPAR), (cr = 0.012), (cg = 0.014), (cb = 0.02), (fl = 0);
      }
      mat[k] = m;
      R[k] = cr, G[k] = cg, B[k] = cb;
      floorA[k] = fl;
    }
  // the sails' edges pick up the sky behind them
  for (let r = 1; r < HZ; r++)
    for (let x = 1; x < W - 1; x++) {
      const k = r * W + x;
      if (mat[k] !== SAIL) continue;
      for (const j of [k - 1, k + 1, k - W]) {
        if (mat[j] !== SKY) continue;
        R[k] += R[j] * 0.45, G[k] += G[j] * 0.45, B[k] += B[j] * 0.45;
        break;
      }
    }
  // the sky as the sea mirrors it
  const RR = R.slice(), RG = G.slice(), RB = B.slice();

  // stars: thick in the Milky Way, sparse elsewhere
  const stars: [number, number, number, number][] = [];
  for (let r = 0; r < HZ - 1; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      if (mat[k] !== SKY) continue;
      const odds = 0.012 + 0.07 * clamp(band[k] * 1.4);
      if (hash(x * 3 + 1, r * 5 + 2) < odds) stars.push([k, 0.45 + 0.55 * hash(x, r + 9), hash(x + 4, r) * 6.28, Math.floor(1 + hash(x, r + 2) * 3)]);
    }

  // The wake on the water, for each cell below the stern: how far behind the sloop it is, as a share of the way from
  // the stern to us (0 at the stern), and where across it the cell falls (0 down its middle, 1 on an arm).
  const age = new Float32Array(N), across = new Float32Array(N).fill(9);
  for (let r = WL; r < H; r++) {
    const y = r + 0.5, dz = y - HZ;
    const a = 1 - D0 / dz; // the ground's depth, in perspective
    const half = SPREAD * (dz / D0 - 1) + 6.5;
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      age[k] = a;
      across[k] = (x + 0.5 - CX) / half;
    }
  }
  const glow = new Float32Array(N);

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[(Math.floor(k / W) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }
  const TAU = Math.PI * 2;

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const flow = V * u;
    const tick = Math.floor(u * 8); // the plankton sparkle eight times a second
    // the lantern swings on its post over the stern
    const sway = 0.9 * Math.sin((TAU * 2 * u) / LOOP);
    const LX = CX - 0.5 + sway, LY = WL - 10.8;
    const flick = 0.85 + 0.15 * Math.sin(u * 9.1) * Math.sin(u * 2.3 + 1);

    // the plankton's light: a churn straight behind the stern, two arms opening toward us, waves across between them
    glow.fill(0);
    for (let r = WL - 1; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let g = 0;
        if (r >= WL) {
          const a = age[k], v = across[k], av = Math.abs(v);
          if (av < 1.25) {
            const along = a * F - flow * F;
            const n1 = noise(along, v * 4 + 5, PER);
            const n2 = noise(along * 2.1, v * 9 + 17, 0);
            const decay = Math.exp(-a * 1.7);
            const centre = Math.exp(-v * v * 18) * (0.2 + 1.5 * Math.pow(n1, 2.2)) * (0.7 + 0.6 * n2);
            const chev = 0.5 + 0.5 * Math.sin((a - flow) * CHEV - av * 2.5);
            const arms = Math.exp(-(av - 1) * (av - 1) * 30) * (0.3 + 0.7 * chev * chev);
            const between = smooth(1, 0.3, av) * chev * chev * 0.18 * n2;
            g = decay * (centre * 1.45 + arms * 1.15 + between * 1.4) + Math.exp(-a * 30) * Math.exp(-v * v * 6) * 0.8;
          }
        }
        // where the hull meets the water
        const hx = x + 0.5 - CX, hy = y - (WL + 0.3);
        if (Math.abs(hx) < 12 && hy > -1.5 && hy < 1.8) g += Math.exp(-hy * hy * 1.6) * smooth(12, 7, Math.abs(hx)) * (0.45 + 0.4 * noise(hx * 0.4 + 3, u * 2, 0));
        glow[k] = g;
      }
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k];
        let cr = R[k], cg = G[k], cb = B[k], fl = floorA[k];
        if (m === SEA) {
          // the sky above, upside down and broken by the swell
          const p = (y - HZ) / (H - HZ);
          const sw = Math.sin(x * 0.21 / (0.25 + p) + y * 1.3 - (TAU * 3 * u) / LOOP) + 0.6 * Math.sin(x * 0.07 - y * 0.9 + (TAU * 2 * u) / LOOP);
          let sr = Math.round(HZ - 1 - (y - HZ) * 1.25 + sw * (0.4 + 2.5 * p));
          sr = sr < 0 ? 0 : sr > HZ - 1 ? HZ - 1 : sr;
          let sx = Math.round(x + sw * 1.5 * p);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          const j = sr * W + sx, lit = 0.34 * (1 - 0.6 * p) * (0.7 + 0.3 * sw);
          cr += RR[j] * lit, cg += RG[j] * lit, cb += RB[j] * lit;
          // the lantern and the stern windows laid on the water as a broken warm streak
          const ld = Math.abs(x + 0.5 - LX) / (1 + p * 4);
          const streak = Math.exp(-ld / 1.4) * smooth(WL, WL + 2, y) * smooth(H, WL + 6, y) * smooth(-0.2, 0.9, sw) * 0.5 * flick;
          cr += streak, cg += streak * 0.6, cb += streak * 0.22;
        }
        const g = glow[k];
        if (g > 0.01 && (m === SEA || m === HULL)) {
          // living light, teal at its edges, nearly white where it is thickest
          const hot = smooth(0.7, 1.6, g);
          const a = m === HULL ? 0.35 : 1;
          cr += a * g * mix(0.05, 0.55, hot), cg += a * g * mix(0.75, 1, hot), cb += a * g * mix(0.65, 0.92, hot);
          fl = Math.max(fl, 0.05);
          // and the plankton flashing in it
          if (m === SEA && hash(k, tick + 31) > 1 - 0.06 * clamp(g * 1.4)) (cr = 0.75), (cg = 1), (cb = 0.95);
        }
        // the lantern's own light on the stern, the sails and the air
        const ldx = x + 0.5 - LX, ldy = y - LY;
        const ld2 = ldx * ldx + ldy * ldy;
        if (ld2 < 200) {
          const lg = (Math.exp(-ld2 / 4) * 0.8 + Math.exp(-Math.sqrt(ld2) / 3.5) * 0.18) * flick;
          cr += lg, cg += lg * 0.62, cb += lg * 0.25;
        }
        cr = tone[Math.max(0, Math.min(1024, (cr * 256) | 0))], cg = tone[Math.max(0, Math.min(1024, (cg * 256) | 0))], cb = tone[Math.max(0, Math.min(1024, (cb * 256) | 0))];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.05);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const sc = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * sc), clamp(cg * sc), clamp(cb * sc));
        }
      }
    }

    // the lantern: a small lit box on its post
    for (let r = Math.floor(LY - 1.2); r <= Math.floor(LY + 1.2); r++)
      for (let x = Math.floor(LX - 0.8); x <= Math.floor(LX + 0.8); x++) {
        const k = r * W + x;
        const c = Math.abs(x + 0.5 - LX) < 0.6 && Math.abs(r + 0.5 - LY) < 0.7;
        out[k] = c ? "●" : "•";
        if (color) color[k] = nearest(1, c ? 0.92 : 0.72, c ? 0.6 : 0.3);
      }

    // the flag at the masthead, streaming to port, its skull and bones in bone white
    for (let i = 0; i < 9; i++)
      for (let j = 0; j < 5; j++) {
        const wave = Math.sin(i * 0.8 - (TAU * 4 * u) / LOOP) * (i / 9) * 1.1;
        const x = MX - 1 - i, r = Math.round(MT - 5.5 + j + wave);
        const k = r * W + x;
        const bone = (i === 4 && j === 2) || (j === 1 && (i === 3 || i === 5)) || (j === 3 && (i === 3 || i === 5));
        out[k] = bone ? "•" : "●";
        if (color) color[k] = bone ? nearest(0.91, 0.89, 0.82) : nearest(0.03, 0.035, 0.05);
      }

    // stars twinkle
    for (const [k, b, ph, sp] of stars) {
      const s = b * (0.7 + 0.3 * Math.sin((TAU * sp * u) / LOOP + ph));
      if (s < 0.5) continue;
      out[k] = s > 0.88 ? "●" : s > 0.7 ? "•" : "·";
      if (color) color[k] = nearest(0.95, 0.96, 1);
    }

    // two meteors a loop, each a streak that burns out
    for (const [t0, x0, y0, x1, y1] of [
      [2.6, 38, 8, 66, 24],
      [8.4, 186, 6, 164, 20],
    ]) {
      const a = (u - t0) / 0.7;
      if (a < 0 || a > 1) continue;
      for (let i = 0; i < 14; i++) {
        const q = a - i * 0.028;
        if (q < 0) break;
        const x = Math.round(mix(x0, x1, q)), r = Math.round(mix(y0, y1, q));
        const k = r * W + x;
        if (mat[k] !== SKY) continue;
        const fade = (1 - i / 14) * (1 - a * 0.6);
        out[k] = fade > 0.6 ? "●" : fade > 0.3 ? "•" : "·";
        if (color) color[k] = nearest(0.85 + 0.15 * fade, 0.9, 1);
      }
    }

    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
