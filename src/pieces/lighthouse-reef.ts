/*
 * lighthouse reef: a storm at night on a rocky headland. A tall banded
 * lighthouse stands on black crags, its lamp room alight, and its light goes
 * round: a strong beam of pale gold and a fainter one opposite. Each fans up
 * and over our heads as it turns toward us, then drops to the horizon as it
 * turns out to sea and lays a pool of gold on the water there, lighting the
 * rain, the bellies of the clouds and the crests beneath it as it passes.
 * Heavy seas go up in plumes against the rocks and fall back in drops; a
 * small ship under storm canvas labours past, black against a band of clear
 * sky, her lantern lit, and shows gold when a beam finds her.
 *
 * The beams are cones turning about the lamp, drawn in perspective. Sky,
 * rock and tower are shaded once; each frame the cloud is slid along, the
 * swell and the surf are shaded again and everything takes the beams' light.
 * Then every cell is drawn as a halftone dot sized by its brightness,
 * ordered-dithered, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "lighthouse reef",
  category: "scenes",
  note: "a lighthouse beam sweeping a storm, surf bursting on black rocks",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#04070a",
  palette: [
    // storm slate, blue-green, deep to pale
    "#2c5560", "#356874", "#3f7b86", "#4b8e98", "#5aa0a8", "#6cb0b6", "#82c0c3", "#9ccfcf", "#b6dcda",
    // bluer and greener slates
    "#3d6a8c", "#4f80a2", "#6496b4", "#3f8478", "#52998a", "#68ac9c",
    // greyed slate for cloud and spray
    "#6f8e92", "#86a4a6", "#9fb8b8", "#bccfcc",
    // foam
    "#d3e2de", "#e6f0ec", "#f8fbf8",
    // the beam where it lies on slate, olive to gold
    "#7fa894", "#98b592", "#b2c08c", "#cbc984", "#e0d07c",
    // gold, deep to white
    "#b8923a", "#d2aa48", "#e8c35c", "#f6d878", "#fde89c", "#fff3c2", "#fffbe6",
    // the storm lantern
    "#e0702a", "#ff9a3c", "#ffbe64",
    // the tower's paint and its bands
    "#c9d2cc", "#a8b6b2", "#0c1114",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HZ = 62; // the horizon
const TX = 134; // the tower's middle
const LAMPY = 16; // the height of the lamp
const GAL = 21.5; // the gallery under the lamp room
const LOOP = 16; // one turn of the lamp, in seconds
const TAU = Math.PI * 2;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, SEA = 1, ROCK = 2, TOWER = 3, GLASS = 4, CAP = 5;

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

// The headland: the row of its skyline and of its foot in the sea, for each column. It runs out to a point on the
// left in broken crags, carries the tower on a shelf and climbs to a cliff at the right-hand edge.
const rockTop = (x: number) => {
  const crag = 1 - Math.abs(2 * fbm(x * 0.085, 3.3, 4) - 1); // ridged: sharp tops, wide gullies
  const shelf = smooth(11, 20, Math.abs(x - TX));
  return 80.5 - 9 * smooth(84, 106, x) - 15 * smooth(152, 200, x) - (1 + 7.5 * shelf) * crag * smooth(84, 94, x) + 1.2 * shelf;
};
const rockBot = (x: number) => 79 + (x - 84) * 0.12 + (fbm(x * 0.11, 9.1, 3) - 0.5) * 3;
// reef rocks standing out in the surf: x, y of the waterline, half-width, height
const REEF: [number, number, number, number][] = [[36, 84, 8, 4.6], [70, 93, 10, 5.4], [12, 95, 8, 4]];
const reef = (x: number, y: number): boolean => {
  for (const [cx, cy, hw, ht] of REEF) {
    const u = (x - cx) / hw;
    if (Math.abs(u) >= 1 || y > cy + 0.6) continue;
    const top = cy - ht * (1 - u * u) * (0.55 + 0.9 * fbm(x * 0.35 + cx, 2.2, 2));
    if (y > top) return true;
  }
  return false;
};

// The tower: 1 painted wall, 2 a black band, 3 ironwork (gallery, rail, glazing bars, dome), 4 the glass of the lamp
// room, 5 a lit casement.
const wallHalf = (y: number, foot: number) => 5 + 3.6 * ((y - GAL) / (foot - GAL));
function tower(x: number, y: number, foot: number): number {
  const dx = Math.abs(x - TX);
  if (y >= GAL + 1.6 && y < foot) {
    const v = (y - GAL) / (foot - GAL);
    if (dx < wallHalf(y, foot)) {
      if (dx < 1.1 && Math.abs(v - 0.385) < 0.035) return 5;
      if (dx < 1.1 && Math.abs(v - 0.7) < 0.03) return 3;
      if (dx < 1.6 && v > 0.9 && dx * dx < (v - 0.9) * 40) return 3; // the door
      return (v > 0.13 && v < 0.29) || (v > 0.45 && v < 0.61) || (v > 0.77 && v < 0.9) ? 2 : 1;
    }
    if (y < GAL + 3.6 && dx < 8.6 - (y - GAL - 1.6) * 1.7) return 3; // brackets under the gallery
  }
  if (y >= GAL - 0.2 && y < GAL + 1.6 && dx < 8.8) return 3; // the gallery
  if (y >= GAL - 3 && y < GAL - 0.2 && dx > 5 && dx < 8.8 && (y < GAL - 2.2 || Math.abs(dx - 8.3) < 0.5 || Math.abs(dx - 6.4) < 0.4)) return 3; // its rail
  if (y >= LAMPY - 5.6 && y < GAL - 0.2 && dx < 5) {
    // the lamp room: glass between its frame and glazing bars
    if (dx > 4.2 || Math.abs(dx - 1.6) < 0.42 || Math.abs(y - (LAMPY - 2.6)) < 0.45) return 3;
    return 4;
  }
  if (y >= LAMPY - 6.8 && y < LAMPY - 5.6 && dx < 6) return 3; // the cornice
  if (y >= LAMPY - 11.6 && y < LAMPY - 6.8 && dx < 5.4 * Math.sqrt(clamp((y - (LAMPY - 11.6)) / 4.8))) return 3; // the dome
  if (y >= LAMPY - 15 && y < LAMPY - 11 && (dx < 0.55 || (dx < 1.3 && Math.abs(y - (LAMPY - 12.6)) < 1.1))) return 3; // ball and vane
  return 0;
}

// The ship in her own frame: x forward (her bow to the left of the picture), y up from the waterline.
// 1 hull and spars, 2 storm canvas, 3 the lantern.
const STORM_JIB = [[-17.5, 4.6], [-6.6, 14.5], [-7.4, 5.2]];
function shipAt(x: number, y: number): number {
  if (Math.abs(x - 12.2) < 0.75 && Math.abs(y - 6.6) < 0.75) return 3;
  if (y >= -0.6 && y < 5.4 && x > -12.5 - y * 0.75 && x < 12.5 + y * 0.1) {
    const deck = 3 + 1.1 * smooth(-7, -11, x) + 2.2 * smooth(6, 8.5, x);
    if (y < deck) return 1;
  }
  for (const [mx, top] of [[-6.5, 17.5], [0.5, 20.5], [7, 14.5]]) if (Math.abs(x - mx) < 0.5 && y > 2 && y < top) return 1;
  // reefed topsails on the fore and main, a rag of a jib
  for (const [mx, a, b, hw] of [[-6.5, 9, 13.6, 3.3], [0.5, 10, 16, 3.8]]) {
    if (y > a && y < b && Math.abs(x - mx) < hw - 0.5 * ((y - a) / (b - a))) return 2;
  }
  const j = STORM_JIB;
  const sgn = (ax: number, ay: number, bx: number, by: number) => (x - bx) * (ay - by) - (ax - bx) * (y - by);
  const d1 = sgn(j[0][0], j[0][1], j[1][0], j[1][1]), d2 = sgn(j[1][0], j[1][1], j[2][0], j[2][1]), d3 = sgn(j[2][0], j[2][1], j[0][0], j[0][1]);
  if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return 2;
  // bare yards, the bowsprit, the spanker's gaff
  if (seg(x, y, -12, 4, -19, 5.8) < 0.5) return 1;
  for (const [mx, yy, hw] of [[-6.5, 8.6, 3.8], [0.5, 9.6, 4.3], [-6.5, 14, 2.8], [0.5, 16.4, 3], [7, 10.5, 2.6]]) if (Math.abs(y - yy) < 0.5 && Math.abs(x - mx) < hw) return 1;
  return 0;
}
const SHX = 47, SHY = 66.5, SCALE = 1.5; // where she rides: her middle, and her waterline

// where the surf bursts: x, y, how high, phase in its four-second round. The biggest goes up right under the tower.
const BURSTS: [number, number, number, number][] = [[121, 83, 36, 0.2], [91, 80, 21, 0.55], [174, 90, 19, 0.88]];
const SPRAY = 30; // loose drops thrown from each burst
const BT = 2.9; // how long a burst lasts, in seconds, of the 4 between one and the next

export default function lighthouseReef(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out = new Array<string>(N);
  const BLACK = P.length - 1; // the bands' black, written straight in

  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < BLACK; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  const mat = new Uint8Array(N);
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  const floorA = new Float32Array(N).fill(0.03);
  const halo = new Float32Array(N); // the lamp's own glow in the wet air
  const take = new Float32Array(N); // how much of the beam's light a surface takes
  const rain = new Float32Array(N); // each cell's place in the rain: below 0 none, else its phase down a streak
  const rspd = new Uint8Array(N);
  const top = new Float32Array(W), bot = new Float32Array(W);
  for (let x = 0; x < W; x++) (top[x] = x + 0.5 > 84 ? rockTop(x + 0.5) : 999), (bot[x] = x + 0.5 > 84 ? rockBot(x + 0.5) : -999);
  const foot = top[TX] + 2.5;

  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      const ld = Math.hypot(xc - TX, (y - LAMPY) * 1.1);
      halo[k] = Math.exp(-ld / 5) * 0.8 + Math.exp(-ld / 15) * 0.42 + Math.exp(-ld / 48) * 0.1;
      // rain in slanting streaks, each column of it falling at its own pace
      const c = Math.floor(xc - y * 0.5 + 300);
      rain[k] = hash(c, 7) < 0.36 ? y / 24 + hash(c, 5) * 9 : -1;
      rspd[k] = 22 + Math.floor(hash(c, 6) * 16);

      const tw = tower(xc, y, foot);
      if (tw) {
        const u = (xc - TX) / (y > GAL + 1.6 ? wallHalf(y, foot) : 6);
        // a round tower: bright toward the open sea on the left, in shadow on the right, with a streak of the lamp's
        // gold down its lit side and warm under the gallery
        const shade = (0.3 + 0.66 * smooth(1.25, -0.8, u)) * (0.92 + 0.16 * fbm(xc * 0.5, y * 0.4, 2));
        const glint = Math.exp(-Math.pow((u + 0.5) / 0.2, 2)) * 0.3;
        const warm = Math.exp(-Math.max(0, y - GAL) / 9) * 0.3;
        if (tw === 1) (mat[k] = TOWER), (R[k] = 0.84 * shade + warm + glint), (G[k] = 0.93 * shade + warm * 0.8 + glint * 0.8), (B[k] = 0.9 * shade + warm * 0.4 + glint * 0.2), (take[k] = 0.3 * smooth(0.6, -0.6, u));
        else if (tw === 2) (mat[k] = CAP), (R[k] = 0.02 + glint * 0.5), (G[k] = 0.03 + glint * 0.4), (B[k] = 0.035 + glint * 0.12), (floorA[k] = 0);
        else if (tw === 3) (mat[k] = CAP), (R[k] = 0.02), (G[k] = 0.025), (B[k] = 0.03), (floorA[k] = 0);
        else if (tw === 4) mat[k] = GLASS;
        else (mat[k] = TOWER), (R[k] = 1), (G[k] = 0.62), (B[k] = 0.24), (floorA[k] = 0.6);
        continue;
      }
      const head = y > top[x] && y < bot[x];
      if (head || reef(xc, y)) {
        mat[k] = ROCK;
        // black wet rock: its skyline, the faces turned to the sea and a few wet ledges catch the light, gold near
        // the tower and cold slate elsewhere
        let up: number, sea = 0;
        if (head) {
          up = Math.exp(-(y - top[x]) / 1.5);
          sea = clamp((top[Math.max(0, x - 3)] - top[x]) / 3) * Math.exp(-(y - top[x]) / 5);
        } else up = reef(xc, y - 1.4) ? 0 : 1;
        const ledge = smooth(0.6, 0.72, fbm(xc * 0.2 + y * 0.12, y * 0.5, 3)) * (head ? smooth(top[x], top[x] + 4, y) : 0.5);
        const lit = clamp(0.55 * up + 0.8 * sea + 0.3 * ledge);
        const near = Math.exp(-Math.hypot(xc - TX, (y - foot) * 1.2) / 30);
        R[k] = 0.012 + lit * (0.2 + 0.75 * near), G[k] = 0.018 + lit * (0.34 + 0.5 * near), B[k] = 0.022 + lit * (0.36 + 0.02 * near);
        take[k] = 0.03 + 0.7 * lit;
        floorA[k] = 0;
        continue;
      }
      mat[k] = y < HZ ? SKY : SEA;
    }

  // the storm cloud, in a strip that tiles so it can blow across for ever: how thick, and how its belly is lit
  const CW = 360;
  const cden = new Float32Array(CW * HZ), cund = new Float32Array(CW * HZ);
  const dens = (x: number, y: number) => {
    const f = x / CW, sx = 0.013, sy = 0.04;
    const n = fbm(x * sx, y * sy, 5) * (1 - f) + fbm((x - CW) * sx, y * sy, 5) * f;
    // heavy overhead, thinning to torn rags over a band of clear sky along the horizon
    return n + 0.36 * smooth(HZ - 8, 24, y) - 0.2;
  };
  for (let r = 0; r < HZ; r++)
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5, d = dens(x, y);
      cden[r * CW + x] = smooth(0.4, 0.56, d);
      cund[r * CW + x] = clamp(0.4 + (d - dens(x + 2, y + 4)) * 9);
    }

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[(Math.floor(k / W) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  const shipM = new Uint8Array(N);
  const SX0 = Math.max(0, Math.floor(SHX - 34)), SX1 = Math.floor(SHX + 26), SY0 = Math.floor(SHY - 36), SY1 = Math.floor(SHY + 5);
  // the two beams this frame: direction on the page, spread, where each ends, strength, and its foot on the horizon
  const bvx = [0, 0], bvy = [0, 0], btan = [0, 0], brch = [0, 0], bgn = [0, 0], bpool = [0, 0], bvp = [0, 0];
  const WHITE = nearest(0.97, 0.98, 0.97), SPRAYC = nearest(0.83, 0.89, 0.87);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, w = (u / LOOP) * TAU;
    const cdrift = (((t * 2.2) % CW) + CW) % CW;

    // --- the beams ------------------------------------------------------------------
    // The lamp turns at a steady pace and throws two beams, a strong one and a fainter one opposite. On the page a
    // beam points along (vx, vy): flat when it lies across our view, up and over us as it comes round toward us,
    // down to the horizon as it turns away, where it ends in a pool of light on the sea.
    let toward0 = 0;
    for (let i = 0; i < 2; i++) {
      const phi = -2.02 + w + i * Math.PI, cs = Math.cos(phi), sn = Math.sin(phi);
      const vx = cs + 0.15 * sn, vy = -0.34 * sn, vl = Math.sqrt(vx * vx + vy * vy);
      const toward = Math.max(0, sn), away = Math.max(0, -sn);
      bvx[i] = vx / vl, bvy[i] = vy / vl;
      btan[i] = (0.14 * (1 + 1.4 * toward * toward)) / vl;
      brch[i] = bvy[i] > 0.02 ? (HZ - LAMPY) / bvy[i] : 1e6;
      bgn[i] = (i ? 0.5 : 1) * (0.88 + 0.12 * toward);
      bvp[i] = TX + bvx[i] * brch[i];
      bpool[i] = (i ? 0.55 : 1.15) * away * smooth(0.02, 0.2, bvy[i]);
      if (!i) toward0 = toward;
    }
    const beam = (px: number, py: number): number => {
      let s = 0;
      for (let i = 0; i < 2; i++) {
        const vx = bvx[i], vy = bvy[i], al = px * vx + py * vy, reach = brch[i];
        if (al <= 0.5 || al > reach * 1.05) continue;
        const q = Math.abs(px * vy - py * vx) / (al * btan[i] + 1.6);
        if (q >= 1) continue;
        const k = 1 - q;
        s += smooth(0, 0.45, k) * (0.62 + 0.38 * k) * bgn[i] * Math.exp(-al / 300) * (reach < 1e5 ? smooth(reach * 1.05, reach * 0.9, al) : 1);
      }
      return s;
    };
    // the light the beams lay on the sea where they graze it
    const pool = (xc: number, depth: number): number => {
      let s = 0;
      for (let i = 0; i < 2; i++) if (bpool[i] > 0.01) s += bpool[i] * Math.exp(-Math.pow((xc - bvp[i]) / (24 + 70 * depth), 2));
      return s;
    };
    const flash = 0.85 + 0.25 * toward0;

    // --- the ship, pitching and lifting on the swell --------------------------------
    const pitch = 0.1 * Math.sin(w * 3 + 1) + 0.035 * Math.sin(w * 7), heave = 0.9 * Math.sin(w * 3 + 2.4);
    const pc = Math.cos(pitch), ps = Math.sin(pitch);
    for (let r = SY0; r < SY1; r++)
      for (let x = SX0; x < SX1; x++) {
        const dx = x + 0.5 - SHX, dy = SHY + heave - (r + 0.5);
        shipM[r * W + x] = shipAt((dx * pc - dy * ps) / SCALE, (dx * ps + dy * pc) / SCALE);
      }
    const shipLit = clamp(beam(SHX - TX, SHY - 12 - LAMPY) * 1.1 + pool(SHX, 0) * 0.9);
    const lflick = 0.85 + 0.1 * Math.sin(w * 37) + 0.05 * Math.sin(w * 91 + 1);

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k], xc = x + 0.5;
        let cr = R[k], cg = G[k], cb = B[k], fl = floorA[k];
        const px = xc - TX, py = y - LAMPY;
        let b = 0;
        const sm = r >= SY0 && r < SY1 && x >= SX0 && x < SX1 ? shipM[k] : 0;
        if (sm) {
          // the ship: black against the clear sky, until a beam finds her and her canvas shows gold
          if (sm === 3) (cr = 1), (cg = 0.58 * lflick), (cb = 0.2 * lflick), (fl = 1);
          else {
            const c = sm === 2 ? 0.03 + 0.9 * shipLit : 0.012 + 0.28 * shipLit;
            (cr = c), (cg = c * 0.9), (cb = c * 0.62 + 0.012), (fl = 0);
          }
        } else if (m === SKY) {
          b = beam(px, py);
          // the clear sky behind the cloud, a bright band of it along the horizon
          const low = Math.exp(-Math.pow((HZ - y) / 25, 2));
          let sr = 0.05 + 0.5 * low, sg = 0.1 + 0.76 * low, sb = 0.15 + 0.66 * low;
          let sx = x - cdrift;
          if (sx < 0) sx += CW;
          const ix = Math.floor(sx), fx = sx - ix, i0 = r * CW + (ix % CW), i1 = r * CW + ((ix + 1) % CW);
          const c = cden[i0] + (cden[i1] - cden[i0]) * fx, un = cund[i0] + (cund[i1] - cund[i0]) * fx;
          // cloud: rolling slate masses, their bellies and torn edges paler
          const body = 0.2 + 0.62 * un * un + 0.42 * c * (1 - c) + 0.12 * low;
          sr = mix(sr, 0.5 * body, c), sg = mix(sg, 0.74 * body, c), sb = mix(sb, 0.9 * body, c);
          // the beam in the wet air, and on the cloud's belly
          const a = clamp(b * 1.2), L = 0.74 + 0.2 * c * un;
          cr = mix(sr, L, a), cg = mix(sg, 0.8 * L, a), cb = mix(sb, 0.36 * L, a);
        } else if (m === SEA) {
          const depth = (y - HZ) / (H - HZ);
          // rows of swell rolling in, in perspective: a lit face, a dark trough, a broken white top
          const lz = Math.log(depth + 0.12);
          const sw = noise((x * 0.06) / (0.3 + 1.2 * depth) + 17, lz * 3.2 + 40);
          const ch = noise(x * 0.5 + 3 - (u / LOOP) * 24, y * 1.1 + (u / LOOP) * 64, 64);
          const roll = Math.sin(lz * 15 - w * 8 + sw * 6 + x * 0.012);
          const wave = 0.5 + 0.34 * roll + 0.3 * (ch - 0.5);
          const face = smooth(0.28, 0.78, wave);
          cr = mix(0.035, 0.02, depth) + face * 0.14, cg = mix(0.11, 0.07, depth) + face * 0.44, cb = mix(0.13, 0.09, depth) + face * 0.42;
          // the horizon's clear band lying on the far water
          const far = Math.exp(-(y - HZ) / 7) * 0.5 * (0.4 + 0.6 * face);
          cr += far * 0.55, cg += far * 0.9, cb += far * 0.85;
          // whitecaps along the tops of the swell, and streaks of foam trailing down their backs
          const cap = smooth(0.74, 0.86, wave) * (0.45 + 0.55 * ch) + smooth(0.6, 0.75, noise(x * 0.09 + 50 - (u / LOOP) * 6, y * 0.8 + (u / LOOP) * 32, 32)) * smooth(0.45, 0.7, wave) * 0.5;
          // the beams mirrored in the water under them, their pools where they graze the sea, and the lamp's own path
          b = beam(px, 2 * HZ - y - LAMPY) * 0.75 + pool(xc, depth) * Math.exp(-(y - HZ) / 11);
          const lp = Math.exp(-Math.abs(px) / (4 + depth * 30)) * 0.5 * flash * smooth(HZ, HZ + 8, y);
          const gl = (b + lp) * (0.14 + 0.86 * smooth(0.4, 0.72, wave));
          cr += gl, cg += gl * 0.84, cb += gl * 0.42;
          // foam where the sea meets the rock, surging up it and sliding back
          let foam = clamp(cap) * 0.85;
          if (x > 82 && y > bot[x] - 1) {
            const surge = 3 + 2 * Math.sin(w * 4 + x * 0.16) + 1.5 * noise(x * 0.3, (u / LOOP) * 48, 48);
            foam = Math.max(foam, smooth(surge + 2.5, surge * 0.3, y - bot[x]) * (0.45 + 0.55 * noise(x * 0.8 + 5, y * 0.9 + (u / LOOP) * 96, 96)));
          }
          for (const [cx, cy, hw] of REEF) {
            const ex = (xc - cx) / (hw + 3), ey = (y - cy - 0.6) / 2.6;
            if (ey < -0.3 || ey > 1 || ex < -1 || ex > 1) continue;
            foam = Math.max(foam, smooth(1, 0.4, ex * ex + ey * ey) * (0.4 + 0.6 * ch) * (0.7 + 0.3 * Math.sin(w * 4 + cx)));
          }
          if (foam > 0.01) {
            const fb = 0.8 + 0.2 * clamp(b + halo[k] * 2);
            cr = mix(cr, fb * 0.92 + b * 0.2, foam), cg = mix(cg, fb, foam), cb = mix(cb, fb * 0.97 - b * 0.15, foam);
          }
          fl = 0.03;
        } else if (m === GLASS) {
          // the lamp room: always alight, flaring as the lens comes round to face us
          const core = Math.exp(-Math.hypot(px, py) / 3);
          cr = 1, cg = 0.84 + 0.14 * core * flash, cb = 0.4 + 0.55 * core * flash, fl = 1;
        } else {
          b = beam(px, py) * take[k] + halo[k] * take[k] * 0.8;
          cr += b, cg += b * 0.84, cb += b * 0.42;
        }
        if (m !== GLASS && !sm) {
          // a sea breaking on the rock: a plume going up hard and bright, hanging, then coming apart as it falls
          for (let i = 0; i < BURSTS.length; i++) {
            const bu = BURSTS[i], dx = xc - bu[0], dy = bu[1] - y;
            if (dy < -3 || dy > bu[2] + 3 || dx < -20 || dx > 20) continue;
            const a = ((((u / 4 + bu[3]) % 1) + 1) % 1) * (4 / BT);
            if (a >= 1) continue;
            const up = a < 0.34 ? Math.sin((a / 0.34) * 1.5708) : 1 - 0.6 * Math.pow((a - 0.34) / 0.66, 2);
            const ht = bu[2] * up;
            const tex = noise(xc * 0.55 + i * 31, y * 0.45 + (a < 0.34 ? -a * 18 : (a - 0.34) * 16) + i * 7);
            if (dy > ht - 5 * tex) continue;
            const hw = (1.6 + 0.2 * Math.max(0, dy) + bu[2] * 0.06) * (1 + 0.8 * a);
            const e = Math.abs(dx - 0.05 * dy * dy * a) / hw + (tex - 0.5) * 0.8;
            if (e >= 1) continue;
            // falling, it breaks into drops from the top down
            const breakup = smooth(0.4, 1, a) * (0.35 + 0.65 * clamp(dy / bu[2]));
            const drops = smooth(breakup * 0.85, breakup * 0.85 + 0.12, noise(xc * 0.9 + i * 5, y * 0.8 - a * 20));
            const sp = smooth(1, 0.72, e) * drops * (dy < 0 ? smooth(-3, 0, dy) : 1);
            if (sp > 0.02) {
              const wb = beam(px, py);
              const fb = (0.78 + 0.22 * smooth(0.8, 0.1, e)) * (0.9 + 0.1 * clamp(wb + halo[k] * 2.2));
              cr = mix(cr, fb * 0.95 + wb * 0.15, sp), cg = mix(cg, fb, sp), cb = mix(cb, fb * 0.98 - wb * 0.2, sp);
              fl = Math.max(fl, 0.05);
            }
          }
          // the lamp's glow, and the rain, bright where the light is on it
          const hl = halo[k] * flash;
          if (m === SKY || m === SEA) (cr += hl), (cg += hl * 0.82), (cb += hl * 0.4);
          const rn = rain[k];
          if (rn >= 0) {
            const ph = rn - (u / LOOP) * rspd[k];
            const f = ph - Math.floor(ph);
            if (f < 0.3) {
              const bb = m === SKY ? b : m === SEA ? 0 : beam(px, py);
              const s = (0.12 + bb * 0.6 + hl * 0.5) * (1 - f * 2.5);
              cr += s * 0.9, cg += s, cb += s * 0.86;
            }
          }
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

    // loose drops thrown out of each burst, rising, hanging and falling back
    for (let i = 0; i < BURSTS.length; i++) {
      const bu = BURSTS[i];
      const a = ((((u / 4 + bu[3]) % 1) + 1) % 1) * (4 / BT);
      if (a >= 1) continue;
      const tau = a * BT;
      for (let j = 0; j < SPRAY; j++) {
        const hmax = bu[2] * (0.45 + 0.75 * hash(j, 400 + i)), ta = 0.34 * BT * (0.75 + 0.5 * hash(j, 410 + i));
        const g = (2 * hmax) / (ta * ta);
        const x = Math.floor(bu[0] + (hash(j, 420 + i) - 0.42) * 15 * tau), yy = bu[1] - (g * ta * tau - 0.5 * g * tau * tau);
        const r = Math.floor(yy);
        if (yy > bu[1] || r < 0 || x < 0 || x >= W) continue;
        const k = r * W + x;
        if (mat[k] === GLASS) continue;
        out[k] = hash(j, 430 + i) > 0.5 ? "•" : "·";
        if (color) color[k] = j & 1 ? WHITE : SPRAYC;
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
