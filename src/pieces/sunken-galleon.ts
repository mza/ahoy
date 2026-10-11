/*
 * sunken galleon: a wreck on the sea floor, listing on the sand with its masts
 * broken and its sails hanging from the yards like shrouds. Shafts of light
 * slant down through the blue-green water from a rippling surface, motes
 * drift, a school of fish turns past, a broken chest spills its gold in the
 * foreground and bubbles rise from it and from the hull.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 * Everything that moves is periodic in one loop, so it plays without a seam.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sunken galleon",
  category: "scenes",
  note: "a galleon wreck on the sea floor, sunbeams slanting down past its sails",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#020a12",
  palette: [
    "#04121c", "#061a26", "#082232", "#0a2b3d", "#0c3549", "#0f4055", "#124c61", "#16596c", "#1b6776",
    "#22767f", "#2b8687", "#36968e", "#45a596", "#58b3a0", "#70c2ab", "#8fd2bb", "#b3e2cf", "#d9f2e6",
    "#071629", "#0b1f3a", "#10294a",
    "#2a3b38", "#3a4d45", "#4d5f52", "#62735f", "#7c8b70", "#9aa585",
    "#120f0e", "#1c1714", "#2a221b", "#3a2f24", "#4e3f2e", "#6a5440",
    "#16261c", "#203826", "#2c4c30", "#3d6238",
    "#5f7c78", "#7f9a93", "#a3b8ad",
    "#5a3a10", "#8a5a16", "#b8801e", "#e0a62a", "#f6cb4e", "#fde58a", "#fff6c8",
    "#9fb7c2", "#c8dbe2", "#eef7fa",
    "#0f2a1a", "#18402a", "#255a36",
    "#0a1416", "#141f22", "#1f2c2f", "#2c3c3e",
  ],
} satisfies Meta;

const W = 200, H = 100;
const LOOP = 16; // seconds; everything that moves repeats in this
const TAU = Math.PI * 2;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// the wreck: its midships in the frame, how far it lists (bow down, to the left)
const OX = 112, OY = 83, LIST = -0.13, SC = 1.22; // and its size, in cells a unit
const CHEST = [38, 89]; // the chest's foot, front left
const WATER = 0, SURFACE = 1, REEF = 2, SAND = 3, ROCK = 4, HULL = 5, MAST = 6, CHESTW = 7, GOLD = 8;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
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

// distance from a point to a segment
function seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  const ex = ax + dx * k - px, ey = ay + dy * k - py;
  return Math.sqrt(ex * ex + ey * ey);
}

// the water's own colour at a depth: bright teal under the surface, deep blue below
function waterAt(y: number): [number, number, number] {
  // bright under the surface, a deep band, then a pale haze of backlit water
  // along the far distance behind the wreck, and dark again over the sand
  const a = smooth(-6, 46, y), haze = Math.exp(-(((y - 62) / 16) ** 2)), b = smooth(78, 100, y);
  const r = mix(0.15, 0.05, a) + 0.05 * haze, g = mix(0.5, 0.23, a) + 0.13 * haze, bl = mix(0.5, 0.29, a) + 0.11 * haze;
  return [mix(r, 0.02, b), mix(g, 0.1, b), mix(bl, 0.14, b)];
}

const floorY = (x: number) => 84 + 6 * fbm(x * 0.018 + 4, 2, 3) - 4 * Math.exp(-(((x - 40) / 30) ** 2)) + 2 * smooth(150, 200, x);

/*
 * The galleon in its own frame: s along its length (bow at -48, stern at +45),
 * h up from the keel. Returns 0 for water or a part: 1 planking, 2 rail,
 * 3 dark (gunports, the breach, stern windows), 4 a broken rib.
 */
function hull(s: number, h: number): number {
  const u = s / 48;
  const bottom = 1.5 + 8 * u * u;
  let top = 17 + 4 * u * u;
  if (s > 27) top += 7; // the stern castle
  if (s < -34) top += 3; // the forecastle
  if (h < bottom || h > top) return 0;
  // the bow's stem rakes forward as it rises; the transom leans back
  if (s < -40 - 8 * clamp((h - bottom) / 20)) return 0;
  if (s > 44 + 1.5 * (h / 30)) return 0;
  // broken at the rail amidships
  if (h > top - 1.6 && s > -8 && s < 14 && h > top - 1.6 + 2.5 * noise(s * 0.6, 3)) return 0;
  // the breach: a jagged hole low in the side, ribs showing
  const bx = (s - 4) / 9, by = (h - 8) / 5;
  const br = bx * bx + by * by;
  if (br < 1 + 0.35 * (noise(s * 0.7, h * 0.7) - 0.5)) return Math.abs(((s + 100) % 3.2) - 1.6) < 0.45 ? 4 : 3;
  if (h > top - 1.2) return 2;
  // a row of gunports, some with their lids gone
  if (h > 10.5 && h < 13 && s > -36 && s < 34 && ((s + 40) % 8) < 2.4) return 3;
  if (s > 34 && s < 42 && h > top - 5.5 && h < top - 3 && ((s - 34) % 3) < 1.6) return 3;
  return 1;
}

export default function sunkenGalleon(): Frame {
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

  const cl = Math.cos(LIST), sl = Math.sin(LIST);
  // the ship's frame and the screen's: s along the ship, h up from its keel
  const toWorld = (s: number, h: number): [number, number] => [OX + (s * cl + h * sl) * SC, OY + (s * sl - h * cl) * SC];
  const toShip = (x: number, y: number): [number, number] => {
    const dx = (x - OX) / SC, dy = (y - OY) / SC;
    return [dx * cl + dy * sl, dx * sl - dy * cl];
  };

  // the masts, in the ship's frame: the foremast snapped short, the mainmast
  // broken with its top hanging down the rigging, the mizzen standing
  const spars: [number, number, number, number, number][] = [
    [-24, 19, -24, 33, 1.3], [-24, 33, -23, 35, 0.8],
    [2, 18, 2, 43, 1.6], [2, 43, 13, 28, 1.1],
    [27, 26, 25, 54, 1.3],
    // yards
    [-31, 31, -16, 30, 0.7], [-12, 38, 15, 37, 0.8], [18, 47, 33, 46, 0.65], [16, 38, 35, 37, 0.7],
    // the bowsprit, and standing rigging gone slack
    [-42, 21, -58, 28, 0.9],
  ];
  const rigging: [number, number, number, number][] = [
    [-58, 28, -24, 33], [-24, 33, 2, 43], [25, 54, 44, 25], [2, 43, -38, 21], [25, 54, 2, 40], [-23, 35, -40, 20],
  ];
  // the sails left on the yards: [middle of the yard, half its width, its height, the hang, a seed]
  const sails: [number, number, number, number, number][] = [
    [-23.5, 7, 30.5, 9, 1], [1.5, 13, 37.5, 17, 2], [25.5, 7, 46.5, 12, 3], [25.5, 9, 37.5, 9, 4],
  ];

  const mat = new Uint8Array(N);
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  const floorA = new Float32Array(N);
  const beam = new Float32Array(N); // how much of the light shafts a cell takes
  const caustic = new Float32Array(N); // how much of the caustic net falls on it

  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      let [cr, cg, cb] = waterAt(y);
      let m = WATER, fl = 0.05, bm = 1, ca = 0;
      // haze: the water is never one flat tone
      const veil = 0.92 + 0.16 * fbm(xc * 0.03, y * 0.05, 3);
      cr *= veil, cg *= veil, cb *= veil;
      if (y < 7) {
        // the surface seen from below, a bright skin broken by ripples
        m = SURFACE;
        const a = smooth(7, 0.5, y);
        cr = mix(cr, 0.55, a), cg = mix(cg, 0.86, a), cb = mix(cb, 0.82, a);
        fl = 0.12;
      }
      // far reef in the haze behind the wreck
      const reef = 70 - 9 * fbm(xc * 0.025 + 11, 5, 4) - 6 * Math.exp(-(((xc - 20) / 25) ** 2));
      if (y > reef) {
        m = REEF;
        const d = smooth(reef, reef + 14, y);
        const tex = fbm(xc * 0.2, y * 0.25, 3);
        const w = waterAt(y);
        const a = 0.18 + 0.2 * d + 0.08 * (tex - 0.5);
        cr = mix(w[0], 0.02, a), cg = mix(w[1], 0.08, a), cb = mix(w[2], 0.12, a);
        bm = 0.7;
      }
      // the hull, its masts and rigging
      const [s, h] = toShip(xc, y);
      const part = hull(s, h);
      if (part) {
        m = HULL;
        // weed-dark timber, gone green; lit from above where its planks face up
        const plank = (h % 2.4) < 0.35 ? 0.65 : 1;
        const weed = fbm(s * 0.15, h * 0.3, 3);
        let tr = 0.09 * plank, tg = 0.085 * plank, tb = 0.065 * plank;
        tr = mix(tr, 0.05, weed * 0.6), tg = mix(tg, 0.12, weed * 0.6), tb = mix(tb, 0.08, weed * 0.6);
        if (part === 2) (tr = 0.24), (tg = 0.27), (tb = 0.22), (ca = 0.8);
        if (part === 3) (tr = 0.01), (tg = 0.02), (tb = 0.035);
        if (part === 4) (tr = 0.14), (tg = 0.12), (tb = 0.09);
        // barnacles and pale growth
        if (part === 1 && hash(x * 7, r * 3) > 0.96) (tr = 0.3), (tg = 0.34), (tb = 0.3);
        // the far water still hangs in front of it
        const w = waterAt(y);
        cr = mix(tr, w[0], 0.14), cg = mix(tg, w[1], 0.14), cb = mix(tb, w[2], 0.14);
        fl = 0.04;
        bm = 0.35;
        if (part === 1) ca = 0.25 * smooth(8, 20, h);
      }
      let onSpar = false;
      for (const [s0, h0, s1, h1, wd] of spars) if (seg(s, h, s0, h0, s1, h1) < wd) onSpar = true;
      let onLine = false;
      for (const [s0, h0, s1, h1] of rigging) if (seg(s, h, s0, h0, s1, h1) < 0.42) onLine = true;
      if (onSpar || (onLine && !part)) {
        m = MAST;
        const w = waterAt(y);
        const v = onSpar ? 0.06 : 0.04;
        cr = mix(v * 0.9, w[0], onSpar ? 0.12 : 0.35), cg = mix(v, w[1], onSpar ? 0.12 : 0.35), cb = mix(v * 0.8, w[2], onSpar ? 0.12 : 0.35);
        fl = onSpar ? 0.08 : 0.03;
        bm = 0.6;
      }
      // the sea floor, and rocks at the corners
      const fy = floorY(xc);
      if (y > fy) {
        m = SAND;
        const depth = smooth(fy, H, y);
        const ripple = 0.82 + 0.18 * Math.sin(xc * 0.62 + 2.2 * Math.sin(y * 0.33) + y * 0.4);
        const tex = 0.85 + 0.3 * fbm(xc * 0.2, y * 0.4, 3);
        const lit = (0.45 + 0.4 * smooth(fy, fy + 5, y) - 0.25 * smooth(fy + 6, H, y)) * ripple * tex;
        cr = 0.42 * lit, cg = 0.5 * lit, cb = 0.42 * lit;
        // shells and stones
        if (hash(x * 3, r * 11) > 0.992) (cr = 0.55), (cg = 0.58), (cb = 0.5);
        fl = 0.07;
        bm = 0.5;
        ca = 1;
      }
      const rockL = 88 + 7 * fbm(xc * 0.08, 1, 3) + (xc - 0) * 0.42;
      const rockR = 86 + 6 * fbm(xc * 0.08, 7, 3) + (W - xc) * 0.5;
      if (y > rockL && xc < 26 || (y > rockR && xc > 168)) {
        m = ROCK;
        const tex = fbm(xc * 0.25, y * 0.3, 3);
        const top = xc < 26 ? rockL : rockR;
        const lip = smooth(top + 2, top, y);
        cr = 0.02 + 0.05 * tex + 0.12 * lip, cg = 0.04 + 0.06 * tex + 0.16 * lip, cb = 0.05 + 0.06 * tex + 0.14 * lip;
        fl = 0.03;
        bm = 0.3;
        ca = 0.6 * lip;
      }
      mat[k] = m;
      R[k] = cr, G[k] = cg, B[k] = cb;
      floorA[k] = fl;
      beam[k] = bm;
      caustic[k] = ca;
    }
  }

  // the wreck's upper edges catch the light from above, so its silhouette reads against the haze
  for (let r = 1; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, m = mat[k], up = mat[k - W];
      if ((m === HULL || m === MAST) && (up === WATER || up === REEF)) {
        (R[k] += 0.12), (G[k] += 0.24), (B[k] += 0.22), (floorA[k] = 0.1);
        if (r + 1 < H && mat[k + W] === m) (R[k + W] += 0.04), (G[k + W] += 0.08), (B[k + W] += 0.07);
      }
    }

  // the chest: an iron-bound box, its lid thrown back and split, gold spilling out
  const [CX, CY] = CHEST;
  const gold: [number, number, number][] = []; // a coin: its cell, and when it glints
  for (let r = CY - 14; r < CY + 1; r++)
    for (let x = CX - 12; x < CX + 14; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      const fx = xc - CX, fy = y - CY;
      let part = 0;
      // the box, seen a little from above
      if (fx > -8 && fx < 8 && fy > -8 && fy <= 0) part = 1;
      // its top, open, the heap of coins inside
      if (fx > -7 + (fy + 11) * 0.3 && fx < 9 && fy > -11 && fy <= -8) part = 2;
      // the lid, thrown back and leaning, split along one side
      const lx = fx + 6 + (fy + 11) * 0.55, ly = -fy - 11;
      if (lx > 0 && lx < 15 && ly > 0 && ly < 4.5 && !(lx > 10 && ly > 2.2)) part = 3;
      if (!part) continue;
      if (part === 2) {
        mat[k] = GOLD;
        const g = 0.75 + 0.35 * hash(x * 5, r * 7);
        (R[k] = 0.95 * g), (G[k] = 0.68 * g), (B[k] = 0.22 * g), (floorA[k] = 0.3);
        gold.push([k, hash(x, r * 3) * LOOP, 0.6 + hash(x * 9, r) * 0.8]);
      } else {
        mat[k] = CHESTW;
        const band = Math.abs(fx + 4.5) < 0.8 || Math.abs(fx - 4.5) < 0.8 || (part === 1 && Math.abs(fy + 1) < 0.6);
        const g = 0.8 + 0.3 * hash(x * 3, r * 5);
        const top = part === 3 ? 0.08 : 0;
        if (band) (R[k] = 0.1 * g), (G[k] = 0.12 * g), (B[k] = 0.12 * g);
        else (R[k] = (0.3 + top) * g), (G[k] = (0.2 + top * 0.6) * g), (B[k] = (0.1 + top * 0.4) * g);
        // the lock, gold too
        if (part === 1 && Math.abs(fx) < 1.2 && fy > -6.5 && fy < -4.5) (R[k] = 0.85), (G[k] = 0.6), (B[k] = 0.2);
        floorA[k] = 0.06;
      }
      beam[k] = 0.4;
      caustic[k] = part === 1 ? 0.3 : 0.6;
    }
  // coins spilled over the lip and across the sand
  for (let i = 0; i < 70; i++) {
    const a = hash(i, 201), d = Math.pow(hash(i, 202), 1.6);
    const x = Math.round(CX + 7 + d * 22 * Math.cos(a * 2.2 - 0.5)), r = Math.round(CY - 1 + d * 6 * Math.sin(a * 2.2 - 0.2) + d * 2);
    if (x < 0 || x >= W || r < 0 || r >= H) continue;
    const k = r * W + x;
    if (mat[k] !== SAND && mat[k] !== CHESTW) continue;
    mat[k] = GOLD;
    const g = 0.6 + 0.4 * hash(i, 203);
    (R[k] = 0.9 * g), (G[k] = 0.62 * g), (B[k] = 0.18 * g), (floorA[k] = 0.25);
    gold.push([k, hash(i, 204) * LOOP, 0.5 + hash(i, 205)]);
  }
  // a warm glow round the gold
  const glow = new Float32Array(N);
  for (let r = CY - 26; r < H; r++)
    for (let x = CX - 30; x < CX + 40; x++) {
      if (x < 0 || x >= W || r < 0) continue;
      const dx = x + 0.5 - (CX + 3), dy = (r + 0.5 - (CY - 9)) * 1.2;
      glow[r * W + x] = Math.exp(-Math.sqrt(dx * dx + dy * dy) / 7) * 0.35;
    }

  // kelp rooted on the rocks and sand, its sway worked out per frame
  const kelp: [number, number, number, number][] = []; // root x, root y, height, phase
  for (let i = 0; i < 9; i++) {
    const left = i < 5;
    const x = left ? 4 + i * 4.5 + hash(i, 61) * 3 : 172 + (i - 5) * 6 + hash(i, 61) * 3;
    kelp.push([x, left ? 96 : 95, 22 + hash(i, 62) * 26, hash(i, 63) * TAU]);
  }

  // the school: each fish's place in the shoal, and its own small wander
  const fish: [number, number, number][] = [];
  for (let i = 0; i < 64; i++) {
    const a = hash(i, 71) * TAU, d = Math.sqrt(hash(i, 72));
    fish.push([Math.cos(a) * d * 17, Math.sin(a) * d * 6, hash(i, 73) * TAU]);
  }

  // bubbles: from the chest's heap and from the breach, rising and wobbling
  const bubbles: [number, number, number, number, number][] = []; // x, start y, height risen per loop, phase, wobble
  const [bhx, bhy] = toWorld(4, 9);
  for (let i = 0; i < 26; i++) {
    const fromChest = i < 14;
    const x0 = fromChest ? CX + 1 + hash(i, 81) * 4 : bhx + hash(i, 81) * 4 - 2;
    const y0 = fromChest ? CY - 10 : bhy;
    bubbles.push([x0, y0, y0 * (1 + Math.floor(hash(i, 82) * 2)), hash(i, 83), 0.5 + hash(i, 84) * 1.5]);
  }

  // motes: specks of drifting matter catching the light
  const motes: [number, number, number, number][] = [];
  for (let i = 0; i < 120; i++) motes.push([hash(i, 91) * W, 8 + hash(i, 92) * 80, hash(i, 93) * TAU, 0.4 + hash(i, 94) * 0.8]);

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.55 + (hash(k, 77) - 0.5) * 0.25;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  // the shafts, along u = x + y * SLANT: a sum of slow travelling bands
  const SLANT = 0.55, UN = Math.ceil(W + H * SLANT) + 2;
  const shaftU = new Float32Array(UN);
  // each beam: where it falls along u, how far it drifts, its width, its strength, its phase
  const BEAMS = [
    [52, 6, 5, 1, 0], [88, 5, 3, 0.7, 1.3], [118, 7, 7, 1, 2.4], [150, 4, 3.5, 0.75, 3.9], [178, 6, 5.5, 0.85, 5.1], [26, 4, 3, 0.55, 4.4],
  ];
  const fr = new Float32Array(N), fg = new Float32Array(N), fb = new Float32Array(N);
  const over = new Float32Array(N); // how much of an overlay's colour replaces the scene

  return (t, { color } = {}) => {
    const ph = (t / LOOP) * TAU;
    for (let u = 0; u < UN; u++) {
      let s = 0;
      for (const [c, drift, w, a, p] of BEAMS) {
        const d = (u - c - drift * Math.sin(ph + p)) / (w * (0.8 + 0.25 * Math.sin(ph * 2 + p)));
        s += a * Math.exp(-d * d) * (0.75 + 0.25 * Math.sin(ph * 3 + p * 2));
      }
      shaftU[u] = Math.min(1, s);
    }
    over.fill(0);

    // sails, hanging from their yards and lifting on the current
    for (const [sm, sw, sh, len, seed] of sails) {
      for (let j = 0; j <= len + 1; j += 0.4)
        for (let i = -sw; i <= sw; i += 0.4) {
          const drop = j / len;
          const sway = Math.sin(ph + seed + j * 0.25) * 2.2 * drop + Math.sin(ph * 2 + seed * 3 + i * 0.3) * 0.6 * drop;
          const ragged = len * (0.7 + 0.35 * noise(i * 0.45 + seed * 9, seed)) + 2 * Math.sin(ph + i * 0.5 + seed);
          if (j > ragged) continue;
          // tattered: holes worn through
          if (noise((i + sway) * 0.55 + seed * 4, j * 0.5) > 0.73) continue;
          const [wx, wy] = toWorld(sm + i + sway, sh - j);
          const x = Math.round(wx), r = Math.round(wy);
          if (x < 0 || x >= W || r < 0 || r >= H) continue;
          const k = r * W + x;
          if (over[k]) continue;
          // pale and thin, lit where it hangs into the light
          const lit = 0.75 + 0.25 * Math.sin(i * 0.4 + ph + seed);
          fr[k] = 0.42 * lit, fg[k] = 0.58 * lit, fb[k] = 0.54 * lit;
          over[k] = 0.72;
        }
    }
    // kelp swaying
    for (const [kx, ky, kh, kp] of kelp) {
      for (let j = 0; j < kh; j += 0.5) {
        const f = j / kh;
        const x = Math.round(kx + Math.sin(ph + kp + j * 0.12) * 4 * f * f + Math.sin(ph * 2 + j * 0.3) * 0.6 * f);
        const r = Math.round(ky - j);
        if (x < 0 || x >= W || r < 0) continue;
        for (const dx of [0, 1]) {
          const k = r * W + x + dx;
          if (x + dx >= W) continue;
          const g = 0.6 + 0.4 * Math.sin(j * 0.9 + kp);
          fr[k] = 0.05 * g, fg[k] = 0.17 * g, fb[k] = 0.09 * g;
          over[k] = 1;
        }
      }
    }
    // the school, sweeping across and back, turning at each end
    const sx = 100 + 62 * Math.sin(ph), sy = 21 + 6 * Math.sin(ph * 2 + 0.6);
    const dir = Math.cos(ph) >= 0 ? 1 : -1;
    const turn = Math.abs(Math.cos(ph)); // narrow end-on as it turns
    for (const [fx0, fy0, fp] of fish) {
      const fx = sx + fx0 * (0.35 + 0.65 * turn) + Math.sin(ph * 3 + fp) * 1.2;
      const fy = sy + fy0 + Math.sin(ph * 4 + fp) * 0.8;
      for (let seg2 = 0; seg2 < 2; seg2++) {
        const x = Math.round(fx - dir * seg2 * turn), r = Math.round(fy);
        if (x < 0 || x >= W || r < 0 || r >= H) continue;
        const k = r * W + x;
        const flash = 0.55 + 0.45 * Math.max(0, Math.sin(ph * 6 + fp + fx * 0.1));
        const v = (seg2 ? 0.7 : 1) * flash;
        fr[k] = 0.78 * v, fg[k] = 0.92 * v, fb[k] = 0.98 * v;
        over[k] = 1;
      }
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      const depthFade = 0.25 + 0.75 * Math.exp(-y / 45);
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr = R[k], cg = G[k], cb = B[k], fl = floorA[k];
        // light shafts: brightest high up, fading with depth
        const sh = shaftU[(x + y * SLANT) | 0] * beam[k] * depthFade;
        cr += sh * 0.2, cg += sh * 0.36, cb += sh * 0.3;
        if (m === SURFACE) {
          const w = Math.sin(x * 0.21 + Math.sin(x * 0.05 - ph) * 3 + ph * 2) * Math.sin(x * 0.07 - ph + y * 0.6);
          const g = smooth(0.2, 0.9, w) * smooth(7, 1, y);
          cr += g * 0.4, cg += g * 0.5, cb += g * 0.45;
        }
        // the caustic net, rippling over the sand, the rocks and the hull's top
        const ca = caustic[k];
        if (ca > 0) {
          const a = Math.sin(x * 0.42 + Math.sin(y * 0.55 + ph) * 1.8 + ph);
          const b = Math.sin(x * 0.29 - y * 0.47 + Math.sin(x * 0.17 - ph) * 2 - ph);
          const c = Math.pow(1 - Math.abs(a + b) * 0.5, 7) * ca * (0.5 + 0.5 * shaftU[(x + y * SLANT) | 0]);
          cr += c * 0.3, cg += c * 0.42, cb += c * 0.36;
        }
        // the gold's warmth on everything near it
        const gw = glow[k];
        if (gw > 0) (cr += gw * 0.9), (cg += gw * 0.6), (cb += gw * 0.15);
        const o = over[k];
        if (o > 0) {
          cr = mix(cr, fr[k], o), cg = mix(cg, fg[k], o), cb = mix(cb, fb[k], o);
          fl = Math.max(fl, 0.05);
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

    // coins glint in turn
    for (const [k, when, sp] of gold) {
      const d = ((t - when) % LOOP + LOOP) % LOOP;
      if (d < 0.35 * sp) {
        out[k] = "●";
        if (color) color[k] = nearest(1, 0.97, 0.8);
      }
    }
    // bubbles, rising a whole number of times a loop
    for (const [bx, by, rise, bp, wob] of bubbles) {
      const yy = by - (((t / LOOP + bp) % 1) * rise) % by;
      const x = Math.round(bx + Math.sin(ph * Math.round(4 * wob) + bp * 9) * 1.2), r = Math.round(yy);
      if (x < 0 || x >= W || r < 1 || r >= H) continue;
      const k = r * W + x;
      out[k] = yy > 40 ? "•" : "·";
      if (color) color[k] = nearest(0.75, 0.95, 0.95);
    }
    // motes drifting in the light
    for (const [mx, my, mp, ms] of motes) {
      const x = Math.round(mx + Math.sin(ph + mp) * 3 * ms), r = Math.round(my + Math.sin(ph * 2 + mp) * 1.5);
      if (x < 0 || x >= W || r < 0 || r >= H) continue;
      const k = r * W + x;
      if (mat[k] !== WATER && mat[k] !== REEF) continue;
      const lit = shaftU[(x + (r + 0.5) * SLANT) | 0];
      if (lit < 0.15) continue;
      out[k] = "·";
      if (color) color[k] = nearest(0.6 * lit + 0.2, 0.85 * lit + 0.2, 0.8 * lit + 0.2);
    }

    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
