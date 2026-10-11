/*
 * hidden lagoon: midday in a secret anchorage. Jungle cliffs close round a
 * pool of turquoise water, open only to a gap of blue sky; a waterfall drops
 * down the left-hand cliff in a white ribbon into its own spray, where a faint
 * rainbow stands, and palms lean out over a crescent of pale sand on the
 * right. A pirate sloop lies at anchor in the middle, sails furled, dark
 * against the sunlit water with her black flag at the masthead and her
 * reflection under her. The falls pour and the spray billows, the water
 * ripples and glitters where the sun strikes it, the palms sway, the flag
 * flaps, the sloop swings on her cable and two scarlet macaws fly across.
 *
 * The cliffs, sky and sand are painted once from noise, lit from the upper
 * right; each frame paints the water (its own colour, the cliffs upside down
 * in it, the sloop's shadow, the glitter) and lays the moving things over.
 * Then every cell is drawn as a halftone: a dot sized by its brightness,
 * ordered-dithered, in the palette colour nearest its own, the colour
 * brightened where the dot is small.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "hidden lagoon",
  category: "scenes",
  note: "a sloop at anchor in a turquoise lagoon, a waterfall, macaws at noon",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#03100d",
  palette: [
    // the gap of sky
    "#2f7fe0", "#4f9cf0", "#7fbcf8", "#b4dcfc", "#e6f4ff",
    // white water and cloud
    "#ffffff", "#e4f4f4",
    // the lagoon, deep to brilliant
    "#053038", "#08444e", "#0a5560", "#0e7078", "#128e90", "#18aaa6", "#22c4ba", "#3cdccc", "#6eeede", "#a8f8ec", "#d6fff6",
    // jungle, shadow to sunlit
    "#062014", "#0a301a", "#0f4422", "#165a2a", "#1e7232", "#2a8c3a", "#3aa644", "#54be4e", "#78d45c", "#a2e672", "#c8f48c",
    // the far wall, in haze
    "#2f6a5c", "#44826c", "#5e9a7c", "#7cb28c", "#9cc8a0", "#bcdcb4", "#d8ecc8",
    // sand
    "#8a6c40", "#b89458", "#dcbc78", "#f0d898", "#fbeab8", "#fff6d8",
    // rock
    "#3a3a34", "#5a584c", "#7c7868", "#a09c88",
    // hull and spars
    "#140e0a", "#2a1c12", "#4a3220", "#7a5630", "#b88a44",
    // macaws: scarlet, with gold and blue in the wing
    "#7a1410", "#c8201a", "#f03a28", "#ff6a4a", "#ffd23a", "#2a5cd8",
    // the rainbow's ends, and bone for the flag
    "#f08a3a", "#b48af0", "#f0ead8",
  ],
} satisfies Meta;

const W = 200, H = 100;
const LOOP = 30;
const SHORE = 58; // the far shore
const FX = 30; // the waterfall
const SX = 100, WLS = 74; // the sloop's mast, and her waterline
const DOTS = " ·•●";
const AREA = [1, 0.22, 0.52, 1]; // how much of a cell each dot covers
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const TAU = Math.PI * 2;

const SKY = 0, BACK = 1, LEFT = 2, RIGHT = 3, SAND = 4, WATER = 5;

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

// --- the lie of the land --------------------------------------------------------
// the far wall's treetops, low in the middle where the sky comes in
const backTop = (x: number) => 31 - 10 * smooth(78, 30, x) - 13 * smooth(128, 180, x) + 5 * (fbm(x * 0.05, 3, 3) - 0.5) + 1.6 * (fbm(x * 0.45, 9, 2) - 0.5);
// the near cliffs to either side, and where their feet meet the water or the sand
const leftEdge = (y: number) => 50 + 9 * fbm(y * 0.06, 1, 3) + 7 * smooth(18, 62, y) + 2.4 * (fbm(y * 0.4, 5, 2) - 0.5);
const leftFoot = (x: number) => 67.5 - x * 0.115 + 1.4 * (fbm(x * 0.2, 7, 2) - 0.5);
const rightEdge = (y: number) => 157 - 7 * smooth(20, 62, y) + 11 * (fbm(y * 0.055, 11, 3) - 0.5) + 2.4 * (fbm(y * 0.4, 15, 2) - 0.5);
const rightFoot = (x: number) => 65 + (x - 150) * 0.05;
// the sand: a spit curving out from under the right-hand cliff
const sand = (x: number, y: number) => 1 - Math.hypot((x - 207) / 64, (y - 79) / 14.5);
const fallX = (y: number) => FX + 1.6 * Math.sin(y * 0.075 + 1);

// the sun's shaft, slanting down from the upper right onto the water round the sloop
const shaft = (x: number, y: number) => {
  const d = (x - 96 - (74 - y) * 0.62) * 0.85;
  return Math.exp(-(d * d) / (2 * 11 * 11));
};

/*
 * The sloop, side on, her bow to the left: 1 dark timber, 2 the sunlit rail,
 * 3 a painted stripe, 4 furled canvas, 5 thin rigging, 6 a lit stern light.
 */
const deckAt = (x: number) => 68 - 1.7 * ((x - 101) / 22) ** 2 - (x > 113 ? 1.5 : 0);
function sloop(x: number, y: number): number {
  if (x >= 78 && x <= 124 && y < WLS + 3) {
    const dk = deckAt(x);
    if (y >= dk && x >= 79 + Math.max(0, y - 66.4) * 0.8 && x <= 123.5 - Math.max(0, y - 66) * 0.3) {
      if (y < dk + 0.9) return 2;
      if (y >= dk + 1.9 && y < dk + 2.9) return 3;
      if (x > 114.5 && x < 121.5 && y >= dk + 3.2 && y < dk + 4.4 && Math.floor(x - 114.5) % 3 < 2) return 6;
      return 1;
    }
  }
  // the furled topsail on its yard, the mainsail stowed along the boom
  if (Math.abs(x - SX) < 9.5 && y > 31.6 && y < 33.5 + 0.5 * Math.sin(x * 1.3)) return 4;
  const boom = 61 - (x - SX) * 0.045;
  if (x > SX + 1 && x < SX + 20 && y > boom - 2.6 - 0.5 * Math.sin(x * 1.1) && y < boom - 0.5) return 4;
  if (seg(x, y, 68.5, 55.5, 64.5, 60.3) < 0.95) return 4; // the jib, bundled at the foot of its stay
  if (Math.abs(x - SX) < 0.95 && y > 15.5 && y < deckAt(SX) + 0.5) return 1; // the mast
  if (Math.abs(x - SX) < 11 && Math.abs(y - 31) < 0.65) return 1; // the yard
  if (Math.abs(x - SX) < 2.4 && Math.abs(y - 29) < 0.6) return 1; // the top
  if (seg(x, y, SX, 61, SX + 22, 60) < 0.7) return 1; // the boom
  if (seg(x, y, 80, 66.6, 62.5, 61.2) < 0.8) return 1; // the bowsprit
  for (const [ax, ay, bx, by] of [
    [SX, 17, 62.5, 61.2], [SX, 30, 73, 64.2], [SX, 17, 123, 65.2], // stays
    [SX, 29.5, 92.5, 67.6], [SX, 29.5, 107.5, 67.6], [SX, 29.5, 96, 67.8], [SX, 29.5, 104, 67.8], // shrouds
    [SX - 10.5, 31, SX, 20], [SX + 10.5, 31, SX, 20], // lifts
    [81, 69.5, 73.5, 74.5], // the anchor cable
  ])
    if (seg(x, y, ax, ay, bx, by) < 0.42) return 5;
  return 0;
}

export default function hiddenLagoon(): Frame {
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
  const fall = new Float32Array(N); // the waterfall's ribbon, 1 down its middle
  const sun = new Float32Array(N); // on the water: how much of the shaft falls there
  const shoal = new Float32Array(N); // on the water: how near the sand
  const ship = new Uint8Array(N);

  // canopy: clumps of leaves lit from the upper right, 0 in their shadows, 1 on their crowns
  const canopy = (x: number, y: number, f: number) => {
    const h = (a: number, b: number) => fbm(a * 0.13 * f, b * 0.17 * f, 4);
    const d = h(x + 1.3, y - 1.3) - h(x - 1.3, y + 1.3);
    return clamp(0.5 + d * 4.2 * Math.sqrt(1 / f)) * (0.75 + 0.5 * fbm(x * 0.04, y * 0.05, 2));
  };

  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      ship[k] = sloop(xc, y);
      let m = SKY, cr = 0, cg = 0, cb = 0;
      const sh = shaft(xc, y);
      const le = leftEdge(y), re = rightEdge(y);
      if (xc < le && y < leftFoot(xc)) {
        m = LEFT;
        // sunlit jungle with deep green between the crowns, darker toward the edge of the picture
        const c = canopy(xc, y, 1) * mix(0.55, 1, smooth(0, 50, xc));
        cr = mix(0.02, 0.5, c * c), cg = mix(0.13, 0.82, c), cb = mix(0.08, 0.2, c);
        // its edge against the far wall stays in shade, to stand off from it
        const rim = smooth(4, 0, le - xc);
        cr *= 1 - 0.55 * rim, cg *= 1 - 0.5 * rim, cb *= 1 - 0.4 * rim;
        // the fall runs down a cleft of dark wet rock
        const fx = fallX(y), fd = Math.abs(xc - fx);
        const cleft = smooth(9 + 3 * fbm(y * 0.2, 3, 2), 3.5, fd) * smooth(3, 7, y);
        if (cleft > 0) {
          const rock = 0.1 + 0.16 * fbm(xc * 0.5, y * 0.14, 3);
          cr = mix(cr, rock * 0.9, cleft), cg = mix(cg, rock, cleft), cb = mix(cb, rock * 0.95, cleft);
        }
        const hw = (1.5 + y * 0.04) * smooth(1, 9, y);
        if (y > 1.5 && fd < hw) fall[k] = 1 - fd / hw;
        // boulders at its foot
        const foot = leftFoot(xc) - y;
        if (foot < 2.2 && fbm(xc * 0.3, 2, 2) > 0.45) (cr = 0.2 + 0.1 * foot), (cg = 0.21 + 0.1 * foot), (cb = 0.2 + 0.08 * foot);
      } else if (xc > re && y < rightFoot(xc) && !(sand(xc, y) > 0 && y > rightFoot(xc) - 1)) {
        m = RIGHT;
        // the right-hand cliff has its back to the sun: deep green, its crowns only just lit
        const c = clamp(canopy(xc, y, 1) * 1.35 * mix(1, 0.7, smooth(160, 200, xc)));
        cr = mix(0.02, 0.3, c * c), cg = mix(0.13, 0.68, c), cb = mix(0.1, 0.2, c);
        const rim = smooth(2.2, 0, xc - re) * smooth(62, 30, y);
        cr += rim * 0.4, cg += rim * 0.5, cb += rim * 0.1;
      } else if (y >= SHORE && sand(xc, y) > 0) {
        m = SAND;
        const s = sand(xc, y);
        // pale gold, rippled, wet and darker along the water's edge
        const rip = 0.94 + 0.07 * Math.sin(y * 1.4 + xc * 0.25 + 2 * fbm(xc * 0.1, y * 0.2, 2));
        const wet = smooth(0.07, 0.0, s);
        cr = mix(1.04, 0.8, wet) * rip, cg = mix(0.97, 0.68, wet) * rip, cb = mix(0.74, 0.44, wet) * rip;
      } else if (y >= SHORE) {
        m = WATER;
        // the sun pools round the sloop, and the water pales over the shoal by the sand
        const px = (xc - 102) / 78, py = (y - 79) / 24;
        sun[k] = clamp(0.12 + Math.exp(-(px * px + py * py)) * 0.6 + sh * 0.5 * smooth(SHORE, SHORE + 8, y));
        shoal[k] = smooth(-0.55, 0, sand(xc, y));
      } else if (y > backTop(xc)) {
        m = BACK;
        // the far wall, pale with distance, mist at its foot
        const c = canopy(xc, y, 1.7);
        cr = mix(0.14, 0.62, c), cg = mix(0.4, 0.86, c), cb = mix(0.36, 0.42, c);
        const top = smooth(5, 0, y - backTop(xc));
        cr += top * 0.12, cg += top * 0.1;
        const haze = 0.2 + 0.55 * smooth(36, SHORE, y);
        cr = mix(cr, 0.72, haze), cg = mix(cg, 0.9, haze), cb = mix(cb, 0.82, haze);
        cr += sh * 0.2, cg += sh * 0.16, cb += sh * 0.06;
      } else {
        // sky: deep blue overhead, paler toward the trees, one bright cloud
        const v = clamp(y / 34);
        cr = mix(0.16, 0.56, v * v), cg = mix(0.45, 0.8, v), cb = mix(0.93, 1, v);
        const cl = smooth(0.5, 0.66, fbm(xc * 0.045 + 3, y * 0.13 + 1, 4)) * smooth(2, 9, y) * 0.95;
        cr = mix(cr, 1, cl), cg = mix(cg, 1, cl), cb = mix(cb, 1, cl);
      }
      mat[k] = m;
      R[k] = cr, G[k] = cg, B[k] = cb;
    }

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[(Math.floor(k / W) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.45;

  // moving things are stamped here each frame: 0 nothing, else a colour
  const over = new Uint8Array(N);
  const INK: number[][] = [
    [0, 0, 0],
    [0.05, 0.3, 0.1], // 1 frond in shadow
    [0.42, 0.84, 0.22], // 2 frond in sun
    [0.74, 0.96, 0.42], // 3 its bright spine
    [0.3, 0.2, 0.12], // 4 trunk
    [0.72, 0.54, 0.3], // 5 trunk, lit
    [0.94, 0.16, 0.1], // 6 macaw
    [1, 0.82, 0.22], // 7 its gold
    [0.16, 0.36, 0.85], // 8 its blue
    [0.03, 0.03, 0.03], // 9 the flag
    [0.94, 0.92, 0.85], // 10 its bones
    [0.5, 0.07, 0.05], // 11 macaw in shade
    [0.2, 0.62, 0.16], // 12 frond, its body
  ];
  const stamp = (x: number, y: number, c: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    if (xi >= 0 && xi < W && yi >= 0 && yi < H) over[yi * W + xi] = c;
  };
  // palms: foot, crown, how far the trunk bows, and the length of the fronds
  const PALMS: number[][] = [
    [171, 75, 147, 41, 9, 15], [186, 80, 172, 50, 6, 13], [160, 71, 152, 58, 3, 9],
  ];
  const palm = (p: number[], i: number, ph: number) => {
    const [bx, by, cx0, cy, bow, len] = p;
    const sway = Math.sin(ph * 3 + i * 1.9) + 0.4 * Math.sin(ph * 7 + i);
    const cx = cx0 + sway * 0.9;
    // the trunk, bowed
    for (let q = 0; q <= 1; q += 0.012) {
      const x = mix(bx, cx, q) + bow * Math.sin(q * Math.PI) * 0.5, y = mix(by, cy, q * (2 - q));
      const wd = 1.3 - 0.5 * q;
      for (let d = -wd; d <= wd; d += 0.5) stamp(x + d, y, d > wd - 0.9 ? 5 : 4);
    }
    // the fronds, arching out and drooping, each a spine with leaflets hanging from it
    for (let f = 0; f < 11; f++) {
      const a = -Math.PI * (-0.08 + (f / 10) * 1.16) + 0.07 * sway * Math.sin(f * 2.1 + ph * 5);
      const l = len * (0.78 + 0.3 * hash(f, i + 40));
      const droop = l * (0.2 + 0.34 * Math.abs(Math.cos(a))) + sway * 0.5 * Math.cos(a);
      for (let q = 0; q <= 1; q += 0.03) {
        const x = cx + Math.cos(a) * l * q, y = cy + Math.sin(a) * l * q * 0.75 + droop * q * q;
        const leaf = (1.2 + 2.6 * Math.sin(Math.min(1, q * 1.25) * Math.PI)) * (0.7 + 0.3 * Math.sin(q * 40));
        for (let d = leaf; d >= 0; d -= 0.5) stamp(x, y + d, d < 0.6 ? 3 : d < 1.7 ? 2 : d > leaf - 0.6 ? 1 : 12);
      }
    }
    stamp(cx, cy, 4), stamp(cx + 1, cy + 0.6, 4), stamp(cx - 1, cy + 0.6, 4);
  };
  // a macaw: body, long tail, and wings at one of the beats of its stroke
  const macaw = (bx: number, by: number, beat: number) => {
    const up = Math.sin(beat); // 1 wings up, -1 down
    // the far wing first, so the body lies over it
    for (let q = 0; q <= 1; q += 0.05) {
      // each wing sweeps back as it rises and falls, blue at its tip, a gold bar across it
      const wy = by + 0.5 - up * 6.5 * q - 1.2 * Math.sin(q * Math.PI) * (1 - Math.abs(up));
      const wx = bx + 0.5 + q * 3.2;
      const chord = 5.2 * (1 - q * 0.7);
      for (let d = -chord * 0.4; d <= chord * 0.6; d += 0.5) stamp(wx + d, wy, q > 0.7 ? 8 : q > 0.42 ? 7 : 6);
    }
    for (let d = -3.5; d <= 3.5; d += 0.5) stamp(bx + d, by, 6), stamp(bx + d, by + 1, Math.abs(d) < 2.6 ? 6 : 11);
    stamp(bx - 4, by - 0.4, 6), stamp(bx - 5, by - 0.4, 6), stamp(bx - 5, by + 0.6, 6), stamp(bx - 6, by + 0.4, 7); // head and beak, flying left
    for (let d = 3.5; d <= 11; d += 0.5) stamp(bx + d, by + 0.5 + (d - 3.5) * 0.1, d > 7.5 ? 8 : 6); // the long tail
  };

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, ph = (u / LOOP) * TAU;
    const tick = Math.floor(u * 7.5);
    const swing = Math.round(1.6 * Math.sin(ph * 2 + 0.5)); // the sloop on her cable
    const pour = (u / LOOP) * 36 * 6; // the falls' streaks, six lengths of their pattern a loop

    over.fill(0);
    for (let i = 0; i < PALMS.length; i++) palm(PALMS[i], i, ph);
    // the macaws cross once a loop, right to left, one a little behind and below the other
    for (let i = 0; i < 2; i++) {
      const way = (((u / LOOP + 0.3 - i * 0.055) % 1) + 1) % 1;
      const bx = 216 - way * 240, by = 22 + i * 6.5 + 4 * Math.sin(way * TAU * 1.5 + i) + 0.8 * Math.sin(ph * 40 + i * 2);
      macaw(bx, by, ph * 40 + i * 2 + Math.PI / 2);
    }
    // the black flag at the masthead, streaming to the right
    for (let i = 0; i < 12; i++) {
      const wave = Math.sin(i * 0.75 - ph * 36) * (0.25 + i * 0.1);
      for (let j = 0; j < 6; j++) {
        const bone = (i === 5 && (j === 2 || j === 3)) || (i === 6 && j >= 1 && j <= 3) || (i === 7 && (j === 2 || j === 3)) || ((i === 4 || i === 8) && (j === 1 || j === 4));
        stamp(SX + swing + 1.5 + i, 15.5 + j + wave + i * 0.08, bone ? 10 : 9);
      }
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k];
        let cr = R[k], cg = G[k], cb = B[k];
        if (m === WATER) {
          const p = (y - SHORE) / (H - SHORE);
          const sn = sun[k], sl = shoal[k];
          // ripples: long ones rolling toward us, finer ones across them
          const w = noise(y * 0.9 - (u / LOOP) * 32, x * 0.11 / (0.5 + p) + 20, 32);
          const face = smooth(0.25, 0.75, w);
          // the cliffs and the sky, upside down and broken
          const wob = Math.sin(y * 1.5 - ph * 14 + Math.sin(x * 0.09 + ph * 3) * 1.5) * (0.4 + 1.6 * p);
          let sx = Math.round(x + wob);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          let sr = Math.round(SHORE - 1 - (y - SHORE) * 1.25 + (w - 0.5) * 5 * p);
          sr = sr < 0 ? 0 : sr > SHORE - 1 ? SHORE - 1 : sr;
          const j = sr * W + sx;
          // its own colour: deep blue-green in shadow, brilliant where the sun reaches down into it
          const lite = clamp(sn * (0.8 + 0.3 * face) + 0.12 * face);
          cr = mix(0.01, 0.22, lite * lite), cg = mix(0.3, 0.97, lite), cb = mix(0.38, 0.88, lite);
          const keep = (0.42 - 0.26 * sn) * (0.6 + 0.4 * face);
          cr = mix(cr, R[j] * 0.7, keep), cg = mix(cg, G[j] * 0.85, keep), cb = mix(cb, B[j] * 0.8, keep);
          // pale over the shoal, and a line of foam lapping the sand
          if (sl > 0) {
            cr = mix(cr, 0.72, sl * 0.8), cg = mix(cg, 0.98, sl * 0.8), cb = mix(cb, 0.86, sl * 0.8);
            if (sl > 0.9 + 0.07 * Math.sin(ph * 5 + y * 0.6 + x * 0.2)) (cr = 1), (cg = 1), (cb = 1);
          }
          // the sloop's reflection, dark and wavering
          const d = y - WLS;
          if (d > 0 && d < 30) {
            const rx = Math.round(x - swing + wob * 0.8), ry = Math.round(WLS - 0.5 - d * 1.1);
            if (rx >= 0 && rx < W && ry >= 0) {
              const s = ship[ry * W + rx];
              if (s && s !== 5) {
                const a = (s === 4 ? 0.4 : 0.92) * smooth(30, 6, d) * (0.7 + 0.3 * (1 - face));
                cr = mix(cr, 0.01, a), cg = mix(cg, 0.16, a), cb = mix(cb, 0.2, a);
              }
            }
          }
          // rings spreading from the foot of the falls, and its churn
          const fdx = x + 0.5 - FX - 3, fdy = (y - 64) * 2.2, fd = Math.sqrt(fdx * fdx + fdy * fdy);
          if (fd < 60) {
            const ring = Math.sin(fd * 0.55 - ph * 30) * smooth(60, 8, fd);
            cr += ring * 0.05, cg += ring * 0.13, cb += ring * 0.13;
            const churn = smooth(17, 3, fd) * (0.45 + 0.75 * noise(y * 0.8 - (u / LOOP) * 40, x * 0.4 + 9, 40));
            cr = mix(cr, 0.95, clamp(churn)), cg = mix(cg, 1, clamp(churn)), cb = mix(cb, 1, clamp(churn));
          }
          // glitter where the sun strikes
          const gl = sn * smooth(0.55, 0.9, w);
          cr += gl * 0.55, cg += gl * 0.3, cb += gl * 0.3;
          if (sn > 0.45 && hash(k, tick) > 1 - 0.13 * (sn - 0.42) * (0.3 + face)) (cr = 1), (cg = 1), (cb = 0.96);
        }
        // the falls: white water streaking down
        const f = fall[k];
        if (f > 0) {
          const s1 = noise(y * 0.3 - pour, x * 0.9 + 3, 36), s2 = noise(y * 0.75 - pour * 2, x * 1.7 + 11, 72);
          const v = clamp((0.35 + 0.5 * s1 + 0.35 * s2) * (0.6 + 0.4 * f) * smooth(0, 0.3, f) * 1.5);
          cr = mix(cr, mix(0.7, 1, v), v), cg = mix(cg, mix(0.88, 1, v), v), cb = mix(cb, mix(0.96, 1, v), v);
        }
        // spray billowing at its foot, a rainbow standing in it
        if (x < 70 && r > 40 && r < 76) {
          const dx = x + 0.5 - FX - 2, dy = y - 63;
          const n = noise((y + x * 0.3) * 0.16 + (u / LOOP) * 16, x * 0.14 + 2 * Math.sin(ph * 2), 16);
          const body = Math.exp(-(dx * dx) / 190 - (dy * dy) / (dy < 0 ? 95 : 20));
          const a = clamp(body * (0.45 + 1.2 * n) * 1.25 - 0.12);
          if (a > 0) {
            cr = mix(cr, 0.93, a), cg = mix(cg, 0.98, a), cb = mix(cb, 1, a);
          }
          const bow = Math.hypot(x + 0.5 - FX - 13, (y - 66) * 1.05);
          if (bow > 12.5 && bow < 19 && y < 64) {
            const q = (bow - 12.5) / 6.5, veil = clamp(body * 2.6 + 0.2) * smooth(0, 0.15, q) * smooth(1, 0.85, q) * 0.62;
            // violet inside, red outside
            const hr = q < 0.5 ? mix(0.6, 0.3, q * 2) : mix(0.3, 1, (q - 0.5) * 2);
            const hg = q < 0.5 ? mix(0.4, 1, q * 2) : mix(1, 0.3, (q - 0.5) * 2);
            const hb = q < 0.5 ? mix(1, 0.5, q * 2) : mix(0.5, 0.15, (q - 0.5) * 2);
            cr = mix(cr, hr, veil), cg = mix(cg, hg, veil), cb = mix(cb, hb, veil);
          }
        }
        // the sloop
        const sx2 = x - swing;
        if (r < WLS && sx2 >= 0 && sx2 < W) {
          const s = ship[r * W + sx2];
          if (s === 1) (cr = 0.035), (cg = 0.028), (cb = 0.025);
          else if (s === 2) (cr = 0.5), (cg = 0.36), (cb = 0.2);
          else if (s === 3) (cr = 0.78), (cg = 0.56), (cb = 0.2);
          else if (s === 4) (cr = 0.9), (cg = 0.82), (cb = 0.62);
          else if (s === 5) (cr *= 0.22), (cg *= 0.22), (cb *= 0.22);
          else if (s === 6) (cr = 1), (cg = 0.8), (cb = 0.3);
        }
        const o = over[k];
        if (o) (cr = INK[o][0]), (cg = INK[o][1]), (cb = INK[o][2]);

        cr = clamp(cr), cg = clamp(cg), cb = clamp(cb);
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(Math.pow(peak, 0.7) * 1.06 - 0.03);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (color) {
          const s = Math.min(1 / peak, 1 / AREA[step]);
          color[k] = nearest(cr * s, cg * s, cb * s);
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
