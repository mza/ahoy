/*
 * aurora passage: the far north at night. A pirate ship under bare poles and
 * one reefed topsail, black against the sky, threads a channel between
 * icebergs. Over her hangs the aurora: curtains of green light, violet and
 * rose at their upper edges, folded across the stars. The curtains ripple and
 * drift, brightening and fading in slow waves, and the still black water gives
 * the whole display back, softened and broken. The bergs take the green on the
 * faces turned to it, a lantern burns warm at the ship's stern, and a little
 * ice floats past.
 *
 * Each ribbon is a hem, a line that wanders and folds back on itself, with
 * rays standing on every point of it; each berg is cut into flat faces.
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "aurora passage",
  category: "scenes",
  note: "a ship threads the ice under curtains of northern lights",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#03050c",
  palette: [
    // night sky and black water
    "#04060f", "#070b1a", "#0b1226", "#101a33", "#162544",
    // the aurora's green, deep to white-hot
    "#0a3a26", "#0f5a36", "#148046", "#1ca657", "#2ccb68", "#4fe880", "#86f7a4", "#c4ffd0",
    // teal, where green turns to violet
    "#0e5a54", "#17897a", "#2fc0a2", "#6fe8cc",
    // violet
    "#2a1a52", "#44287e", "#633aa6", "#8452c6", "#a878de", "#cba6f0",
    // rose, at the curtains' upper edges
    "#5a1e4a", "#8a2c66", "#b84284", "#de66a2", "#f49cc4",
    // ice, white to deep blue shadow
    "#f2fbff", "#d6ecf8", "#b4d6ee", "#8fbbe0", "#6c9bcc", "#4c7ab0", "#345c92", "#234272", "#172d54", "#0e1d3a",
    // ice lit by the aurora
    "#d8ffe6", "#a6f2c8", "#78dcae", "#52b894", "#3a8f80",
    // the lantern
    "#fff0c0", "#ffd27a", "#f6a442", "#d0702a", "#8a4420",
    // hull and spars
    "#05070c", "#0b0e16",
    // stars
    "#ffffff", "#cfe0ff",
  ],
} satisfies Meta;

const W = 200, H = 100;
const WL = 66; // the horizon and every waterline
const LOOP = 60;
const TAU = Math.PI * 2;
const SHIP = 92; // the ship's mainmast, before she glides
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, ICE = 1;

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

// noise along a line that comes round again every `per` cells, so a drift can loop
function ring(x: number, per: number, seed: number): number {
  const xi = Math.floor(x), f = x - xi, u = f * f * (3 - 2 * f);
  const a = hash((((xi % per) + per) % per), seed), b = hash(((((xi + 1) % per) + per) % per), seed);
  return a + (b - a) * u;
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
 * The ship, side on, her bow to the left, x measured from her mainmast: 1 timber and rope, 2 the rail where it
 * catches the sky, 3 the stern lantern, 4 canvas. Bare poles, and one topsail set, reefed down small.
 */
const MASTS: [number, number][] = [[-10, 38], [0, 32], [10, 41]];
const YARDS: [number, number, number][] = [
  [-10, 43, 4.5], [-10, 51, 6.5],
  [0, 37, 4.5], [0, 45, 7], [0, 53, 8.5],
  [10, 46, 4], [10, 54, 5.5],
];
const ROPES: [number, number, number, number][] = [
  [0, 32, -28, 55.5], [-10, 38, -23, 57.5], [10, 41, 18, 58], [0, 32, 10, 41], [-10, 38, 0, 32],
  [-10, 38, -14, 61], [-10, 38, -6.5, 61.5], [0, 32, -4, 61.5], [0, 32, 4, 61.5], [10, 41, 7, 61], [10, 41, 13.5, 60],
];
const LAMP = [19.5, 56.5];
function ship(sx: number, y: number): number {
  if (Math.abs(sx - LAMP[0]) < 1.5 && Math.abs(y - LAMP[1]) < 1.5) return 3;
  // the hull: a raked bow, a sheer that rises to either end, a step up to the stern castle
  const deck = 62 - 0.011 * sx * sx - (sx > 9 ? 1.6 : 0);
  if (y > deck && y < WL + 0.5 && sx > -17 - (WL - y) * 0.9 && sx < 16.5 + (WL - y) * 0.35) return y < deck + 1 ? 2 : 1;
  if (Math.abs(sx - 19.5) < 0.5 && y > 57 && y < 60 && sx < 20) return 1;
  if (seg(sx, y, -17, 60.5, -28, 55.5) < 0.55) return 1;
  for (const [mx, top] of MASTS) if (Math.abs(sx - mx) < 0.5 && y > top && y < 62) return 1;
  for (const [mx, yy, hw] of YARDS) if (Math.abs(y - yy) < 0.5 && Math.abs(sx - mx) < hw) return 1;
  // the reefed main topsail: a short band of canvas under its yard
  if (y > 37.5 && y < 41 && Math.abs(sx) < 4 + (y - 37.5) * 0.3 && Math.abs(sx) > 0.5) return 4;
  // the flag at the main truck
  if (sx > 0.5 && sx < 5 && y > 30 && y < 32.2 - (sx - 0.5) * 0.12) return 1;
  for (const [ax, ay, bx, by] of ROPES) if (seg(sx, y, ax, ay, bx, by) < 0.36) return 1;
  return 0;
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
 * The two bergs, old and weathered, cut into faces. Each face is [tone, brightness, its corners]: 0 a face turned
 * from the light, deep blue; 1 a face turned to us or the sky, pale blue-white; 2 a face turned to the aurora, which
 * tints it green. The first face that holds a point has it.
 */
const FACES: [number, number, number[][]][] = [
  // to port: a long sloping top, a notch, a block that overhangs the channel, a low shelf at the water
  [1, 1.0, [[0, 40], [6, 37], [14, 35], [24, 31], [30, 30], [30.6, 34], [24, 35.5], [14, 39.5], [6, 41.5], [0, 44]]],
  [0, 0.8, [[0, 44], [6, 41.5], [12, 40], [10, 67], [0, 67]]],
  [1, 0.72, [[12, 40], [14, 39.5], [22, 36.2], [20, 67], [10, 67]]],
  [1, 0.86, [[22, 36.2], [24, 35.5], [30.6, 34], [31, 36], [31, 67], [20, 67]]],
  [0, 0.75, [[31, 36], [35, 37], [36, 39], [36, 67], [31, 67]]],
  [1, 1.0, [[36, 33], [44, 34], [47, 36], [46, 38.5], [36, 37.5]]],
  [0, 0.6, [[42.5, 47], [44, 47], [45, 56], [43, 58], [41.5, 58]]],
  [1, 0.9, [[36, 37.5], [42, 38.2], [41, 67], [36, 67]]],
  [2, 0.95, [[42, 38.2], [46, 38.5], [48, 42], [44, 47], [45, 56], [45, 67], [41, 67]]],
  [2, 1.0, [[45, 56], [52, 58], [58, 60], [61, 63], [59.5, 63.6], [57, 61.6], [51, 59.6], [45, 58]]],
  [0, 0.95, [[45, 58], [51, 59.6], [57, 61.6], [59.5, 63.6], [61, 63], [62.5, 67], [45, 67]]],
  // to starboard: a shelf, a cliff leaning out over it, a sloping top, a notch and a higher block behind
  [2, 1.0, [[140, 63], [146, 61], [152, 60], [153, 61.6], [146, 62.6], [141, 64.2]]],
  [0, 0.95, [[138, 67], [140, 63], [141, 64.2], [146, 62.6], [153, 61.6], [153, 67]]],
  [1, 1.0, [[153, 41], [160, 38], [170, 36], [176, 37], [176.4, 41], [170, 40], [160, 42], [157, 43.5]]],
  [2, 0.92, [[152, 60], [153, 52], [151, 46], [153, 41], [157, 43.5], [158, 67], [153, 67]]],
  [1, 0.86, [[157, 43.5], [160, 42], [168, 40.3], [167, 67], [158, 67]]],
  [1, 0.72, [[168, 40.3], [170, 40], [176.4, 41], [177, 42], [177, 67], [167, 67]]],
  [0, 0.75, [[177, 42], [180, 42], [181, 44], [181, 67], [177, 67]]],
  [1, 1.0, [[181, 36], [188, 33], [196, 34], [200, 36], [200, 39.5], [196, 38], [188, 37], [181, 40]]],
  [2, 0.8, [[181, 40], [188, 37], [188, 67], [181, 67]]],
  [0, 0.85, [[188, 37], [196, 38], [200, 39.5], [200, 67], [188, 67]]],
];

export default function auroraPassage(): Frame {
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
  const green = new Float32Array(N); // how much of the aurora's light a face of ice takes
  const haze = new Float32Array(N); // the glow low over the horizon

  // --- the bergs ---------------------------------------------------------------
  const BOX = FACES.map(([, , pts]) => [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))]);
  const face = (x: number, y: number): number => {
    for (let i = 0; i < FACES.length; i++) if (x >= BOX[i][0] && x <= BOX[i][1] && inside(x, y, FACES[i][2])) return i;
    return -1;
  };

  for (let r = 0; r < WL; r++) {
    const y = r + 0.5;
    for (let x = 0; x < W; x++) {
      const k = r * W + x, px = x + 0.5;
      // the sky: black-blue, a little paler toward the horizon
      const v = y / WL;
      let cr = mix(0.006, 0.02, v * v), cg = mix(0.01, 0.045, v * v), cb = mix(0.035, 0.1, v * v);
      haze[k] = Math.exp(-(WL - y) / 6) * (0.4 + 0.6 * Math.exp(-Math.pow((px - 96) / 55, 2)));
      const f = face(px, y);
      if (f >= 0) {
        mat[k] = ICE;
        const [tone, bright] = FACES[f];
        // old ice: a soft grain, faint melt lines, the upper edge catching the sky, a dark wet band at the water
        const grain = 0.93 + 0.14 * fbm(px * 0.22 + f * 9, y * 0.45, 3);
        const melt = 1 - 0.1 * smooth(0.62, 0.7, fbm(px * 0.05 + f * 3, y * 0.6, 2));
        const rim = face(px, y - 1.2) < 0 ? 1 : 0;
        const wet = smooth(WL - 3.2, WL - 1.2, y);
        const b = bright * grain * melt * (1.06 - 0.12 * v) * (1 - 0.62 * wet);
        if (tone === 0) (cr = 0.13 * b), (cg = 0.28 * b), (cb = 0.62 * b);
        else if (tone === 1) (cr = 0.78 * b), (cg = 0.91 * b), (cb = 1.04 * b);
        else (cr = 0.6 * b), (cg = 0.8 * b), (cb = 0.84 * b), (green[k] = b);
        if (rim) (cr += 0.2), (cg += 0.24), (cb += 0.22);
      }
      (R[k] = cr), (G[k] = cg), (B[k] = cb);
    }
  }

  // --- the ship, drawn once and moved by whole cells -----------------------------
  const SX0 = -32, SW = 56;
  const sprite = new Uint8Array(SW * WL);
  for (let r = 0; r < WL; r++) for (let i = 0; i < SW; i++) sprite[r * SW + i] = ship(SX0 + i + 0.5, r + 0.5);

  const stars: [number, number, number, number][] = [];
  for (let i = 0; i < 620; i++) {
    const x = Math.floor(hash(i, 21) * W), r = Math.floor(hash(i, 22) * (WL - 4));
    const k = r * W + x;
    if (mat[k] !== SKY) continue;
    stars.push([k, hash(i, 23) * TAU, 1 + Math.floor(hash(i, 24) * 7), 0.4 + 0.6 * hash(i, 25)]);
  }

  // ice afloat in the foreground: [row, cells it drifts in a loop, half-length, half-height, where along its lane]
  const FLOES: [number, number, number, number, number][] = [
    [73.5, 100, 3.5, 1, 150], [80.5, 100, 5, 1, 40], [88.5, 200, 7.5, 1.5, 128], [95.5, 200, 11, 1.5, 30],
  ];
  // the few ripples on the still water: the row each lies along
  const RIPS = [68.5, 71.5, 74.5, 78.5, 82.5, 86.5, 91.5, 96.5];

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  /*
   * The aurora's ribbons. Each is a hem, a line that wanders across the sky and doubles back on itself where the
   * curtain folds, with rays standing on every point of it: [the hem's height, its slope, how far it wanders up and
   * down, how hard it folds, the folds' pitch, how tall the rays stand, brightness, where it starts and ends, where
   * its light gathers, which way it drifts].
   */
  const RIBS: number[][] = [
    [59, 0, 2.4, 21, 0.054, 17, 1.15, -60, 260, 94, 1],
    [30, -0.075, 3.5, 25, 0.047, 10, 0.8, -60, 176, 52, -1],
    [22, 0.085, 3, 19, 0.06, 9, 0.7, 104, 270, 168, 1],
  ];
  // a ray's light by how far up it we are, in sixteenths of its height: green, teal, violet, rose, then nothing
  const QN = 48;
  const rayR = new Float32Array(QN), rayG = new Float32Array(QN), rayB = new Float32Array(QN);
  for (let i = 0; i < QN; i++) {
    const q = i / 16;
    const a = (1.0 * Math.exp(-q * 0.95) + 0.16) * smooth(2.4, 1.35, q);
    const teal = smooth(0.45, 0.9, q), vio = smooth(0.8, 1.35, q), rose = smooth(1.3, 2.0, q);
    let cr = mix(0.12, 0.08, teal), cg = mix(1, 0.85, teal), cb = mix(0.4, 0.75, teal);
    (cr = mix(cr, 0.55, vio)), (cg = mix(cg, 0.26, vio)), (cb = mix(cb, 1, vio));
    (cr = mix(cr, 1, rose)), (cg = mix(cg, 0.3, rose)), (cb = mix(cb, 0.56, rose));
    (rayR[i] = a * cr), (rayG[i] = a * cg), (rayB[i] = a * cb);
  }
  const SKYN = WL * W;
  const LR = new Float32Array(SKYN), LG = new Float32Array(SKYN), LB = new Float32Array(SKYN); // the aurora's light
  const hull = new Uint8Array(SKYN); // where the ship stands this frame
  const CR = new Float32Array(W), CG = new Float32Array(W), CB = new Float32Array(W); // each column's light, for the water

  // this frame's picture above the water, kept to be mirrored in it
  const AR = new Float32Array(SKYN), AG = new Float32Array(SKYN), AB = new Float32Array(SKYN);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, ph = (u / LOOP) * TAU, turn = u / LOOP;
    const flick = 0.86 + 0.09 * Math.sin(t * 6.1) + 0.05 * Math.sin(t * 13.7 + 1);
    // how brightly the whole display burns just now, for the ice and the haze
    const aur = 0.78 + 0.16 * Math.sin(ph * 2) + 0.06 * Math.sin(ph * 5 + 1);

    // walk each hem and stand its rays on it
    LR.fill(0), LG.fill(0), LB.fill(0);
    const DS = 0.3, GAIN = 9;
    for (let c = 0; c < RIBS.length; c++) {
      const [y0, slope, wander, fold, pitch, tall, bright, s0, s1, gather, dir] = RIBS[c];
      for (let s = s0; s < s1; s += DS) {
        const bend = s * pitch + c * 2.3 + ph * dir;
        const xs = s + fold * Math.sin(bend);
        if (xs < -1 || xs >= W) continue;
        const ys = y0 + slope * s + wander * Math.sin(s * 0.021 + c * 1.7 - ph * dir) + 4 * Math.cos(bend) + 0.8 * Math.sin(s * 0.13 + ph * 3);
        // fine rays along the ribbon, slow waves of brightness travelling down it, and its ends fading out
        const fine = 0.3 + 0.7 * Math.pow(ring(s * 0.85 + turn * 68 * dir, 68, 50 + c), 1.3);
        const band = 0.6 + 0.4 * ring(s * 0.15 - turn * 12 * dir, 12, 60 + c);
        const wave = 0.5 + 0.5 * Math.sin(s * 0.023 + c * 1.9 - ph * 2 * dir);
        const ends = smooth(s0, s0 + 40, s) * smooth(s1, s1 - 40, s);
        // where the hem turns back, its samples crowd one column: let the light pile up there, but not without limit
        const crowd = Math.min(1, 0.08 + Math.abs(1 + fold * pitch * Math.cos(bend)) * 0.9);
        const w = DS * crowd * bright * fine * band * ends * (0.3 + 0.45 * wave * wave + 0.5 * Math.exp(-Math.pow((xs - gather) / 50, 2)));
        const th = tall * (0.7 + 0.6 * ring(s * 0.07 + turn * 14 * dir, 14, 70 + c));
        const x0 = Math.floor(xs - 0.5), fx = xs - 0.5 - x0;
        for (let side = 0; side < 2; side++) {
          const x = x0 + side, ws = w * (side ? fx : 1 - fx);
          if (x < 0 || x >= W || ws < 1e-4) continue;
          for (let r = Math.min(WL - 1, Math.floor(ys + 0.5)); r >= 0; r--) {
            const h = ys - (r + 0.5);
            const qi = h <= 0 ? 0 : ((h / th) * 16) | 0;
            if (qi >= QN) break;
            const foot = h < 0 ? 1 + h * 2 : 1;
            // the hem itself: a crisp bright line, green-white
            const hem = Math.exp(-Math.max(0, h) / 1.1) * 0.9;
            const k = r * W + x, a = ws * foot;
            (LR[k] += a * (rayR[qi] + hem * 0.55)), (LG[k] += a * (rayG[qi] + hem)), (LB[k] += a * (rayB[qi] + hem * 0.62));
          }
        }
      }
    }

    for (let k = 0; k < SKYN; k++) {
      let cr = R[k], cg = G[k], cb = B[k];
      if (mat[k] === ICE) {
        const g = green[k] * aur;
        (cr -= g * 0.1), (cg += g * 0.16), (cb -= g * 0.16);
      } else {
        const hz = haze[k] * aur;
        (cr += hz * 0.04), (cg += hz * 0.3), (cb += hz * 0.18);
        // the light keeps its colour as it brightens, and only whitens where it is fiercest
        const m = Math.max(LR[k], LG[k], LB[k]) * GAIN;
        if (m > 0.004) {
          const sc = ((1 - Math.exp(-m)) / m) * GAIN, wh = smooth(2.2, 5, m) * 0.5;
          (cr += LR[k] * sc + wh), (cg += LG[k] * sc + wh * 0.4), (cb += LB[k] * sc + wh * 0.8);
        }
      }
      (AR[k] = cr), (AG[k] = cg), (AB[k] = cb);
    }

    // the ship, gliding a few cells up the channel and back
    hull.fill(0);
    const ox = SHIP + Math.round(3.4 * Math.sin(ph)) + SX0;
    const LX = ox - SX0 + LAMP[0], LY = LAMP[1];
    for (let r = 28; r < WL; r++)
      for (let i = 0; i < SW; i++) {
        const s = sprite[r * SW + i];
        if (!s) continue;
        const x = ox + i;
        if (x < 0 || x >= W) continue;
        const k = r * W + x;
        hull[k] = 1;
        if (s === 3) (AR[k] = 1.6 * flick), (AG[k] = 0.95 * flick), (AB[k] = 0.3 * flick);
        else if (s === 2) (AR[k] = 0.02 + AR[k] * 0.08), (AG[k] = 0.06 + AG[k] * 0.14), (AB[k] = 0.06 + AB[k] * 0.1);
        else if (s === 4) (AR[k] = 0.1 + AR[k] * 0.1), (AG[k] = 0.2 + AG[k] * 0.12), (AB[k] = 0.2 + AB[k] * 0.1);
        else (AR[k] = 0.01), (AG[k] = 0.012), (AB[k] = 0.018);
      }
    // the lantern's warm light on the air and the stern
    for (let r = Math.floor(LY - 7); r <= Math.floor(LY + 7); r++)
      for (let x = Math.floor(LX - 8); x <= Math.floor(LX + 8); x++) {
        if (x < 0 || x >= W || r < 0 || r >= WL) continue;
        const k = r * W + x, d = Math.hypot(x + 0.5 - LX, (r + 0.5 - LY) * 1.15);
        const g = (Math.exp(-d / 1.3) * 1.0 + Math.exp(-d / 3.5) * 0.14) * flick;
        (AR[k] += g), (AG[k] += g * 0.6), (AB[k] += g * 0.22);
      }

    // what each column of the lower sky holds, to be drawn out down the water
    for (let x = 0; x < W; x++) {
      let a = 0, b = 0, c = 0;
      for (let r = 34; r < WL; r++) (a += AR[r * W + x]), (b += AG[r * W + x]), (c += AB[r * W + x]);
      (CR[x] = a / 32), (CG[x] = b / 32), (CB[x] = c / 32);
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let cr: number, cg: number, cb: number, fl = 0.02;
        if (r < WL) {
          (cr = AR[k]), (cg = AG[k]), (cb = AB[k]);
          if (mat[k] === ICE) fl = 2;
        } else {
          // still black water: everything above, upside down, drawn out into long soft smears
          const depth = (y - WL) / (H - WL);
          let sx = x + Math.round(Math.sin(y * 0.7 + ph * 3 + x * 0.05) * 0.8 * depth);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          const sr = Math.max(0, Math.round(WL - 1 - (r - WL) * 1.5));
          const j = sr * W + sx;
          const keep = mix(0.95, 0.7, depth);
          if (mat[j] === ICE) {
            // the bergs stand in it clean, a shade darker
            (cr = AR[j] * 0.62), (cg = AG[j] * 0.66), (cb = AB[j] * 0.74), (fl = 2);
          } else {
            const j1 = Math.max(0, sr - 2) * W + sx, j2 = Math.max(0, sr - 5) * W + sx, j3 = Math.max(0, sr - 9) * W + sx;
            const col = 0.75 - 0.35 * depth;
            cr = (AR[j] * 0.34 + AR[j1] * 0.28 + AR[j2] * 0.22 + AR[j3] * 0.16) * keep * 0.55 + CR[sx] * col + 0.006;
            cg = (AG[j] * 0.34 + AG[j1] * 0.28 + AG[j2] * 0.22 + AG[j3] * 0.16) * keep * 0.55 + CG[sx] * col + 0.012;
            cb = (AB[j] * 0.34 + AB[j1] * 0.28 + AB[j2] * 0.22 + AB[j3] * 0.16) * keep * 0.55 + CB[sx] * col + 0.03;
          }
          // the lantern laid on the water, a short warm streak
          const streak = Math.exp(-Math.abs(x + 0.5 - LX) / 1.1) * smooth(WL + 11, WL + 1, y) * 0.9 * flick;
          (cr += streak), (cg += streak * 0.6), (cb += streak * 0.22);
          // a few thin dark ripples, each a broken line that creeps along
          for (let i = 0; i < RIPS.length; i++) {
            const dy = y - RIPS[i];
            if (dy < -1.2 || dy > 1.2) continue;
            const line = dy - 0.7 * Math.sin(x * 0.045 + i * 2 + ph * (1 + (i % 3)));
            if (line > -0.5 && line <= 0.5 && ring(x * 0.035 + i * 3.1 + turn * 7 * (i % 2 ? 1 : -1), 7, 90 + i) > 0.42) (cr *= 0.16), (cg *= 0.16), (cb *= 0.3), (fl = fl > 1 ? 0.02 : fl);
          }
          // ice afloat, drifting astern: flat pale slabs, dark along the edge nearest us
          for (const [fy, per, rx, ry, at] of FLOES) {
            const dy = y - fy;
            if (dy < -ry || dy > ry + 1) continue;
            let dx = (x + 0.5 - at - turn * per) % per;
            if (dx < 0) dx += per;
            if (dx > per / 2) dx -= per;
            const adx = Math.abs(dx);
            if (dy <= ry && adx < rx - Math.abs(dy) * 1.3) {
              if (dy > ry - 1) (cr = 0.14), (cg = 0.3), (cb = 0.6);
              else (cr = 0.72 - 0.06 * aur), (cg = 0.86 + 0.06 * aur), (cb = 0.96);
              fl = 2;
            } else if (dy > ry && adx < rx - ry * 1.3 + 1) (cr *= 0.2), (cg *= 0.2), (cb *= 0.3), (fl = fl > 1 ? 0.02 : fl);
          }
        }

        cr = tone[Math.max(0, Math.min(1024, (cr * 256) | 0))], cg = tone[Math.max(0, Math.min(1024, (cg * 256) | 0))], cb = tone[Math.max(0, Math.min(1024, (cb * 256) | 0))];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.05);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (fl > 1) {
          // ice is solid: every dot full, its colour carrying the light and the shadow
          const d = dith[k] * 0.07;
          out[k] = peak > 0.5 + dith[k] * 0.3 ? "●" : "•";
          if (color) color[k] = nearest(clamp(cr + d), clamp(cg + d), clamp(cb + d));
        } else if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }

    // stars twinkle in the dark between the ribbons
    for (const [k, p0, sp, b] of stars) {
      if (hull[k] || LG[k] + LB[k] > 0.3) continue;
      const s = b * (0.7 + 0.3 * Math.sin(ph * sp + p0));
      if (s < 0.3) continue;
      out[k] = s > 0.85 ? "●" : s > 0.55 ? "•" : "·";
      if (color) color[k] = nearest(0.85, 0.9, 1);
    }

    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
