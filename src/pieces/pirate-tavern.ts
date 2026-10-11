/*
 * pirate tavern: a dockside tavern at night, seen from inside. Across a long
 * table three tankards and a flintlock stand dark against a candle's light;
 * beyond them a tall leaded casement opens on the harbour, where a ship rides
 * at anchor under the moon, its riding light lit. An iron lantern swings on
 * its chain in front of the glass, and barrels stand in the corner.
 *
 * Shaded in colour per cell: the room is near black, so what reads is what the
 * lights pick out. The candle rims everything on the table and throws its
 * shadows across the boards, the lantern's pool swings with it, and the moon
 * lays the casement's panes on the table and rims the tankards from behind.
 * Then each cell is drawn as a halftone dot, sized by its brightness,
 * ordered-dithered, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "pirate tavern",
  category: "scenes",
  note: "a candle-lit dockside tavern at night, the harbour through the glass",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#070504",
  palette: [
    // wood, dark to light
    "#1a100a", "#24160d", "#2f1d10", "#3d2614", "#4f3119", "#643f1f", "#7c5027", "#966232", "#b2783e", "#cc904c",
    // candlelight
    "#e3a85a", "#f2c071", "#fbd68e", "#ffe8b0", "#fff6dc",
    // flame
    "#ff8a2a", "#ffa940", "#ffc65e", "#ffe49a",
    // embers
    "#5a2416", "#8c3a20",
    // pewter
    "#2c2c31", "#3f3f45", "#57575e", "#76767c", "#9a9a9e", "#c4c4c4",
    // the harbour by moonlight
    "#08112a", "#0f1b3e", "#172752", "#213668", "#2e4a82", "#41639d", "#5d82b8", "#86a6d0", "#b6cbe6", "#e2ecf8",
    // gold
    "#8a6418", "#c99a2e", "#f5d36a",
    // greys
    "#111216", "#1b1d23",
  ],
} satisfies Meta;

const W = 200, H = 100;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const BEAM = 5; // the ceiling beam's underside
const WIN = [92, 14, 186, 66]; // the casement, frame outside to outside
const MID = [139, 39]; // its mullions
const SEA = 47; // the waterline seen through it
const MOON = [170, 24];
const TOPB = 64, TOPF = 84, LIP = 86, APRON = 94; // the table: back edge, front edge, lip, apron foot
const STAND = 73.5; // where things stand on it
const CANDLE: [number, number] = [80, 49.5]; // the flame
const PIVOT = [156, BEAM]; // where the lantern hangs from

const WALL = 0, BEAMS = 1, VIEW = 2, FRAME = 3, TABLE = 4, FLOOR = 5, BARREL = 6, PEWTER = 7, FOAM = 8, WAX = 9, IRON = 10, COIN = 11, GUN = 12;

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

// how far a flame carries: a bright core, a warm pool and a faint fill
const reach = (d: number, s: number) => Math.exp(-d / (4 * s)) * 0.6 + Math.exp(-d / (13 * s)) * 0.45 + Math.exp(-d / (36 * s)) * 0.08;

// the lantern in its own frame, u across and v down from the pivot: 1 chain, 2 iron, 3 lit glass, 4 flame
function lantern(u: number, v: number): number {
  const au = Math.abs(u);
  if (v < 0) return 0;
  if (v < 10) return au < 0.55 ? 1 : 0;
  if (v < 11) return au < 1.3 && au > 0.4 ? 2 : 0;
  if (v < 13.5) return au <= 1.5 + (v - 11) * 1.4 ? 2 : 0;
  if (v < 23) {
    if (au > 4.4) return 0;
    if (au > 3.6 || au < 0.4 || v < 14.3) return 2;
    if (au < 1.3 && v > 16.5 && v < 20.5) return 4;
    return 3;
  }
  if (v < 24.6) return au <= 4.8 - (v - 23) * 0.8 ? 2 : 0;
  return 0;
}

export default function pirateTavern(): Frame {
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
  const floorA = new Float32Array(N).fill(0.02);
  const up = new Float32Array(N).fill(0.5); // which way a surface faces, up 1 to down 0
  const obj = new Int16Array(N).fill(-1); // which object a cell belongs to, for rims and shadows
  const set = (k: number, m: number, r: number, g: number, b: number, fl = 0.02) => {
    mat[k] = m;
    R[k] = r, G[k] = g, B[k] = b;
    floorA[k] = fl;
  };

  // --- the room: beam, dark planked wall, the floor under the table ------------
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      if (y < BEAM) {
        const s = 0.8 + 0.3 * fbm(xc * 0.2, y * 0.6, 3);
        set(k, BEAMS, 0.2 * s, 0.12 * s, 0.07 * s);
        up[k] = y > BEAM - 1.2 ? 0 : 0.4;
      } else if (y < APRON) {
        const p = Math.floor((xc + 2) / 8), f = ((xc + 2) / 8) % 1;
        const s = (0.7 + 0.5 * hash(p, 3)) * (f < 0.08 ? 0.3 : 1) * (0.8 + 0.4 * fbm(xc * 0.9, y * 0.05, 3));
        set(k, WALL, 0.13 * s, 0.08 * s, 0.05 * s);
      } else {
        set(k, FLOOR, 0.08, 0.05, 0.03, 0);
        up[k] = 1;
      }
    }

  // --- the casement and the harbour beyond ------------------------------------------
  const [wx0, wy0, wx1, wy1] = WIN;
  const VR = new Float32Array(N), VG = new Float32Array(N), VB = new Float32Array(N);
  const isWater = new Uint8Array(N);
  const stay = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
    const t = (x - ax) / (bx - ax);
    return t >= 0 && t <= 1 && Math.abs(y - (ay + (by - ay) * t)) < 0.5;
  };
  // the ship: a black hull, two masts with their yards and furled sails, and the stays
  const ship = (x: number, y: number) => {
    const deck = 42.6 - (x < 104 ? (104 - x) * 0.45 : 0) - (x > 124 ? (x - 124) * 0.7 : 0);
    if (x > 99 && x < 129 && y > deck && y < SEA + 0.4 - Math.max(0, x - 126) * 0.6 - Math.max(0, 102 - x) * 0.4) return true;
    if (x > 123 && x < 128.5 && y > 38.5 && y < 42.5) return true; // the stern castle
    for (const [mx, top] of [[108, 18], [118, 21]]) {
      if (Math.abs(x - mx) < 0.55 && y > top && y < 43) return true;
      for (const [yy, half] of [[top + 3, 4], [top + 9, 5.2], [top + 15, 6]]) if (Math.abs(y - yy) < 0.85 && Math.abs(x - mx) < half) return true;
    }
    return stay(x, y, 108, 18, 95, 42) || stay(x, y, 108, 18, 118, 21) || stay(x, y, 118, 21, 128, 39) || (y > 40.5 && y < 41.4 && x > 93 && x < 101);
  };
  for (let r = wy0; r < wy1; r++)
    for (let x = wx0; x < wx1; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      const edge = xc < wx0 + 2.5 || xc > wx1 - 2.5 || y < wy0 + 2.5 || y > wy1 - 2.5;
      const mull = Math.abs(xc - MID[0]) < 1.1 || Math.abs(y - MID[1]) < 1;
      if (edge || mull) {
        set(k, FRAME, 0.22, 0.14, 0.08);
        obj[k] = 0;
        up[k] = y > wy1 - 2.5 ? 1 : 0.5;
        continue;
      }
      let cr: number, cg: number, cb: number;
      if (y < SEA) {
        // a clear night sky, glowing round the moon and down toward the sea
        const v = clamp((y - wy0) / (SEA - wy0));
        cr = mix(0.06, 0.2, v * v), cg = mix(0.1, 0.27, v * v), cb = mix(0.26, 0.46, v * v);
        const dx = xc - MOON[0], dy = y - MOON[1], d = Math.sqrt(dx * dx + dy * dy);
        const halo = Math.exp(-d / 4) * 0.5 + Math.exp(-d / 13) * 0.22 + Math.exp(-d / 40) * 0.1;
        cr += halo * 0.8, cg += halo * 0.86, cb += halo;
        // the far shore across the harbour, a row of lit panes
        const shore = SEA - 1.2 - 2.4 * fbm(xc * 0.07, 3, 3) * smooth(132, 144, xc);
        if (xc > 132 && y > shore) {
          cr = 0.03, cg = 0.04, cb = 0.08;
          if (y > SEA - 1.3 && hash(x, 9) > 0.72) (cr = 1), (cg = 0.7), (cb = 0.35);
        }
      } else {
        isWater[k] = 1;
        const depth = clamp((y - SEA) / (wy1 - SEA));
        cr = 0.05 + 0.04 * (1 - depth), cg = 0.09 + 0.06 * (1 - depth), cb = 0.2 + 0.1 * (1 - depth);
      }
      const dark = ship(xc, y);
      if (dark) (cr = 0), (cg = 0), (cb = 0.01);
      VR[k] = cr, VG[k] = cg, VB[k] = cb;
      set(k, VIEW, cr, cg, cb, dark ? -0.4 : 0.1);
    }

  // --- barrels in the corner --------------------------------------------------------
  const barrel = (id: number, cx: number, hw: number, top: number) => {
    for (let r = Math.floor(top - 2); r < TOPB; r++)
      for (let x = Math.floor(cx - hw - 1); x <= cx + hw + 1; x++) {
        if (x < 0 || x >= W) continue;
        const k = r * W + x, y = r + 0.5, xc = x + 0.5;
        const v = (y - top) / (TOPB + 10 - top);
        const bulge = hw * (0.86 + 0.14 * Math.sin(Math.PI * clamp(v)));
        const u = (xc - cx) / bulge;
        if ((xc - cx) ** 2 / (hw * hw * 0.74) + ((y - top) ** 2) / 4 < 1 && y < top + 1.5) {
          set(k, BARREL, 0.3, 0.19, 0.1);
          up[k] = 1;
          obj[k] = id;
          continue;
        }
        if (v < 0 || Math.abs(u) > 1) continue;
        const curve = Math.sqrt(1 - u * u);
        const stave = Math.abs(((u * 4.5 + 10) % 1) - 0.5) < 0.07 ? 0.55 : 1;
        const s = (0.4 + 0.6 * curve) * stave * (0.8 + 0.3 * fbm(xc * 0.6, y * 0.08, 2));
        const hoop = [0.1, 0.24].some((h) => Math.abs(v - h) < 0.03);
        if (hoop) set(k, IRON, 0.1 * s + 0.03, 0.1 * s + 0.03, 0.1 * s + 0.04);
        else set(k, BARREL, 0.32 * s, 0.2 * s, 0.1 * s);
        up[k] = 0.5;
        obj[k] = id;
      }
  };
  barrel(1, 24, 13, 30);
  barrel(2, 50, 10, 38);

  // --- the table, full width across the foreground ------------------------------------
  for (let r = TOPB; r < APRON; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      if (y < TOPF) {
        const s = (0.75 + 0.4 * fbm(xc * 0.04, y * 1.1, 3)) * (Math.abs(((y - TOPB) / 3.3) % 1) < 0.1 ? 0.55 : 1);
        set(k, TABLE, 0.42 * s, 0.27 * s, 0.15 * s, 0.03);
        up[k] = 1;
      } else if (y < LIP) {
        set(k, TABLE, 0.5, 0.32, 0.18, 0.03); // the worn front edge, catching the light
        up[k] = 0.9;
      } else set(k, TABLE, 0.12, 0.07, 0.04, 0.01), (up[k] = 0.2);
    }

  // --- what stands on it -----------------------------------------------------------------
  const tankard = (id: number, cx: number, foam: boolean, handleLeft: boolean) => {
    for (let r = 54; r < 74; r++)
      for (let x = cx - 9; x <= cx + 9; x++) {
        const k = r * W + x, y = r + 0.5, dx = x + 0.5 - cx, hx = handleLeft ? -dx : dx;
        const body = Math.abs(dx) < 4.8 && y > 59 && y < STAND;
        const rim = Math.abs(dx) < 5.2 && y > 58 && y <= 59.4;
        const handle = hx > 4.6 && hx < 8.4 && y > 60.5 && y < 69 && !(hx > 5.9 && hx < 7.1 && y > 62 && y < 67.5);
        if (foam && Math.abs(dx) < 4.8 && y > 56.4 + Math.abs(Math.sin(dx * 1.3)) * 1.1 && y <= 59) {
          set(k, FOAM, 0.8, 0.72, 0.55, 0.04);
          obj[k] = id;
          up[k] = 1;
          continue;
        }
        if (!(body || rim || handle)) continue;
        const band = Math.abs(y - 62) < 0.6 || Math.abs(y - 69.5) < 0.6 ? 0.6 : 1;
        set(k, PEWTER, 0.16 * band, 0.16 * band, 0.18 * band, 0.02);
        obj[k] = id;
        up[k] = rim ? 1 : 0.5;
      }
  };
  tankard(3, 104, true, false);
  tankard(4, 125, false, false);
  tankard(5, 168, false, false);
  // the candlestick and its candle
  const [cx, cy] = CANDLE;
  for (let r = 48; r < 74; r++)
    for (let x = cx - 7; x <= cx + 7; x++) {
      const k = r * W + x, y = r + 0.5, dx = x + 0.5 - cx;
      const wax = y > cy + 2.4 && y < 64 && Math.abs(dx) < 1.6;
      const drip = y > cy + 4 && y < cy + 10 && Math.abs(dx + 1.7) < 0.5;
      const stick = (y >= 64 && y < 69.5 && Math.abs(dx) < 1.2) || (y >= 63.4 && y < 64.6 && Math.abs(dx) < 3.2);
      const foot = y >= 69.5 && y < STAND && Math.abs(dx) < 2.4 + (y - 69.5) * 1.6;
      if (wax || drip) set(k, WAX, 0.42, 0.37, 0.28, 0.04), (obj[k] = 6);
      else if (stick || foot) set(k, PEWTER, 0.2, 0.2, 0.22, 0.02), (obj[k] = 6), (up[k] = foot ? 0.9 : 0.5);
    }
  // a flintlock laid on the boards
  for (let r = 64; r < 74; r++)
    for (let x = 30; x < 62; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 88.5; // drawn from its plan, 88 cells to the left
      const barrelLine = xc > 122 && xc < 140 && Math.abs(y - (69 - (xc - 122) * 0.08)) < 0.7;
      const stock = xc >= 138 && xc < 146 && y > 67.4 - (xc - 138) * 0.1 && y < 70.4 + (xc - 138) * 0.45;
      const lock = Math.abs(xc - 137.5) < 1.6 && y > 66.5 && y < 68.4;
      if (!(barrelLine || stock || lock)) continue;
      if (lock || barrelLine) set(k, GUN, 0.2, 0.2, 0.22, 0.02);
      else set(k, GUN, 0.22, 0.12, 0.06, 0.02);
      obj[k] = 7;
      up[k] = 0.8;
    }
  // coins scattered by the candle
  const coins: number[] = [];
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(62 + hash(i, 61) * 30), r = Math.floor(66 + hash(i, 62) * 7);
    const k = r * W + x;
    if (mat[k] !== TABLE) continue;
    set(k, COIN, 0.7, 0.52, 0.16, 0.05);
    coins.push(k);
  }

  // --- the candle's light: reach, facing, shadows, and the rims it puts on things -----
  const candle = new Float32Array(N), rimC = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, xc = x + 0.5, y = r + 0.5;
      if (mat[k] === VIEW) continue;
      const dx = xc - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy * 1.1);
      let v = reach(d, 1.6) * (0.55 + 0.8 * (dy > 0 ? up[k] : 1 - up[k] * 0.6));
      // shadow: another object on the line back to the flame
      if (d > 3) {
        const steps = Math.ceil(d);
        for (let s = 2; s < steps - 1; s++) {
          const sx = Math.floor(xc - (dx * s) / steps), sy = Math.floor(y - (dy * s) / steps);
          const o = obj[sy * W + sx];
          if (o > 0 && o !== 6 && o !== obj[k]) {
            v *= 0.12;
            break;
          }
        }
      }
      // nothing below the lip sees a flame standing on the table
      if (y > LIP) v *= 0.25;
      candle[k] = v;
      // a rim: the edge of an object that faces the flame
      if (obj[k] > 0 && obj[k] !== 6) {
        const sx = Math.round(xc - dx / d * 1.2 - 0.5), sy = Math.round(y - dy / d * 1.2 - 0.5);
        if (sx >= 0 && sx < W && sy >= 0 && sy < H && obj[sy * W + sx] !== obj[k]) rimC[k] = 1;
      }
    }
  // the moon through the casement: panes laid on the table, a cool fill, and rims from behind
  const moon = new Float32Array(N), rimM = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, xc = x + 0.5, y = r + 0.5;
      if (mat[k] === VIEW) continue;
      let v = Math.exp(-Math.hypot(xc - 139, (y - 42) * 1.2) / 34) * 0.12;
      if (mat[k] === TABLE && up[k] === 1) {
        // the casement's panes, cast forward and down across the boards
        const px = 139 + (xc - 139) * 0.8 + (y - TOPB) * 1.5, py = wy0 + (y - TOPB) / (TOPF - TOPB) * (wy1 - wy0);
        const inX = px > wx0 + 2.5 && px < wx1 - 2.5 && Math.abs(px - MID[0]) > 1.6;
        const inY = py > wy0 + 2.5 && py < wy1 - 2.5 && Math.abs(py - MID[1]) > 1.6;
        if (inX && inY) v += 0.5 * (1 - (y - TOPB) / (TOPF - TOPB) * 0.4);
      }
      moon[k] = v;
      // the moon rims the tops and far sides of what stands against the glass
      if (obj[k] > 1) {
        const ax = Math.round(xc - 0.5 + Math.sign(139 - xc)), ay = r - 1;
        if (ay >= 0 && (obj[ay * W + x] !== obj[k] || obj[r * W + Math.max(0, Math.min(W - 1, ax))] !== obj[k]) && Math.abs(xc - 139) < 60) rimM[k] = 1;
      }
    }

  // the lantern's reach for every offset from its flame, looked up as it swings
  const FW = 2 * W + 1, FH = 2 * H + 1;
  const field = new Float32Array(FW * FH), bfield = new Float32Array(FW * FH);
  const bloomAt = (d: number) => Math.exp(-d / 2.4) * 0.5 + Math.exp(-d / 8) * 0.14;
  for (let j = 0; j < FH; j++)
    for (let i = 0; i < FW; i++) {
      const dx = i - W, dy = j - H, d = Math.sqrt(dx * dx + dy * dy * 1.1);
      field[j * FW + i] = reach(d, 1.2);
      bfield[j * FW + i] = bloomAt(d);
    }
  const candleBloom = new Float32Array(N);
  for (let k = 0; k < N; k++) candleBloom[k] = bloomAt(Math.hypot((k % W) + 0.5 - cx, (Math.floor(k / W) + 0.5 - cy) * 1.05));

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.3;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }
  const over = new Uint8Array(N), LR = new Float32Array(N), LG = new Float32Array(N), LB = new Float32Array(N);

  return (t, { color } = {}) => {
    const flick = (i: number) => 0.82 + 0.1 * Math.sin(t * (6.1 + i * 1.7) + i) * Math.sin(t * (2.3 + i * 0.6) + 2 * i) + 0.2 * (noise(t * 3.6 + i * 9, 1.7 + i) - 0.5);
    const fc = flick(0), fl = flick(1);

    // the lantern, swinging on its chain in front of the glass
    over.fill(0);
    const th = 0.08 * Math.sin(t * 1.1) + 0.02 * Math.sin(t * 2.6 + 1);
    const c = Math.cos(th), s = Math.sin(th);
    const [px, py] = PIVOT;
    const lx = px - s * 18.5, ly = py + c * 18.5;
    for (let r = py; r < py + 27; r++)
      for (let x = px - 9; x <= px + 9; x++) {
        const dx = x + 0.5 - px, dy = r + 0.5 - py;
        const u = dx * c + dy * s, v = -dx * s + dy * c, l = lantern(u, v);
        if (!l) continue;
        const k = r * W + x;
        over[k] = l;
        if (l === 3) {
          const g = (Math.exp(-((u * u) / 4 + ((v - 18.5) * (v - 18.5)) / 9)) * 0.5 + 0.5) * fl;
          (LR[k] = 1 * g), (LG[k] = 0.66 * g), (LB[k] = 0.28 * g);
        } else if (l === 4) (LR[k] = 1.2), (LG[k] = 0.95 * fl), (LB[k] = 0.55 * fl);
        else (LR[k] = 0.015), (LG[k] = 0.012), (LB[k] = 0.012); // iron, black against the sky
      }
    const ix = Math.floor(lx - 0.5), fx = lx - 0.5 - ix, iy = Math.round(ly - 0.5);
    const glit = t * 1.3;

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      const row = (r - iy + H) * FW + W - ix;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k];
        let cr: number, cg: number, cb: number, flr = floorA[k];
        const la = field[row + x], lb = field[row + x - 1];
        const lamp = (la + (lb - la) * fx) * (r > iy ? 0.55 + 0.75 * up[k] : 0.55 + 0.75 * (1 - up[k])) * (y > LIP ? 0.3 : 1);
        if (over[k]) {
          cr = LR[k], cg = LG[k], cb = LB[k];
          flr = over[k] >= 3 ? 0.3 : -0.4;
        } else if (m === VIEW) {
          cr = VR[k], cg = VG[k], cb = VB[k];
          if (isWater[k]) {
            const xc = x + 0.5, depth = (y - SEA) / (WIN[3] - SEA);
            const w = noise(xc * 0.35 + glit * 0.4, y * 1.6 - glit);
            const path = Math.exp(-Math.abs(xc - MOON[0]) / (1.6 + depth * 5)) * smooth(0.42, 0.82, w);
            cr += path * 0.85, cg += path * 0.9, cb += path;
            if (xc > 99 && xc < 129 && y < SEA + 4) cr *= 0.3, cg *= 0.3, cb *= 0.4;
            const sh = noise(xc * 0.2 - glit * 0.3, y * 0.9) * 0.06;
            cr += sh * 0.4, cg += sh * 0.6, cb += sh;
          }
          // the ship's riding light at the stern, and its streak on the water
          const rx = x + 0.5 - 127, ry = y - 37.8;
          if (Math.abs(rx) < 1 && Math.abs(ry) < 1) (cr = 1.2), (cg = 0.8), (cb = 0.4), (flr = 0.5);
          else if (isWater[k] && Math.abs(rx) < 1.1 && y > SEA + 0.5) {
            const g = smooth(0.5, 0.8, noise(x * 0.5, y * 1.4 - glit * 1.5)) * 0.6;
            cr += g, cg += g * 0.6, cb += g * 0.25;
          }
        } else {
          const a = R[k], b = G[k], cc = B[k];
          const warm = candle[k] * fc * 1.3 + lamp * fl * 0.8;
          const cool = moon[k];
          cr = a * (0.04 + warm * 4.2 * (1 + warm * 0.5)) + cool * a * 1.2;
          cg = b * (0.04 + warm * 3.5 * (1 + warm * 0.35)) + cool * b * 1.8;
          cb = cc * (0.04 + warm * 2.2) + cool * cc * 4.2;
          // rims: hot on the side toward the candle, cold where the moon catches an edge
          if (rimC[k]) {
            const g = candle[k] * fc * 4;
            cr += g * 0.95, cg += g * 0.7, cb += g * 0.35;
            flr = 0.06;
          }
          if (rimM[k]) cr += 0.14, cg += 0.2, cb += 0.4;
          if (m === COIN) {
            const g = Math.max(0, Math.sin(t * (2 + hash(k, 5) * 3) + hash(k, 6) * 6.28));
            cr += g * g * warm * 3, cg += g * g * warm * 2.2, cb += g * g * warm * 0.8;
          }
        }
        // haze glowing round both flames
        if (!over[k] || over[k] < 3) {
          const hb = candleBloom[k] * fc + (bfield[row + x] + (bfield[row + x - 1] - bfield[row + x]) * fx) * fl;
          cr += hb * 0.9, cg += hb * 0.55, cb += hb * 0.2;
        }
        // the candle flame
        const sway = (noise(t * 2.2, 0.3) - 0.5) * 0.9;
        const fdx = x + 0.5 - cx - sway * (cy - y) * 0.3, fdy = y - cy - (1 - fc) * 1.5;
        if (fdy > -3.4 && fdy < 1.8 && Math.abs(fdx) < (fdy < 0 ? 1.25 * (1 + fdy / 3.4) : 1.25 * Math.sqrt(Math.max(0, 1 - (fdy / 1.9) ** 2)))) {
          const core = Math.abs(fdx) < 0.7 && fdy > -0.8;
          (cr = 1.3), (cg = core ? 1.2 : 0.75 * fc), (cb = core ? 0.85 : 0.3 * fc), (flr = 0.5);
        }

        cr = tone[Math.min(1024, (cr * 256) | 0)], cg = tone[Math.min(1024, (cg * 256) | 0)], cb = tone[Math.min(1024, (cb * 256) | 0)];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(flr + (1 - Math.max(0, flr)) * Math.pow(peak, 1.15) * 1.04);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          // only part of the way to full brightness, so dark wood stays brown rather than turning orange
          const sc = (0.3 + 0.7 * want) / Math.pow(peak, 0.6);
          color[k] = nearest(clamp(cr * sc), clamp(cg * sc), clamp(cb * sc));
        }
      }
    }
    // the moon
    for (let r = MOON[1] - 5; r <= MOON[1] + 5; r++)
      for (let x = MOON[0] - 5; x <= MOON[0] + 5; x++) {
        const dx = x + 0.5 - MOON[0], dy = r + 0.5 - MOON[1], k = r * W + x;
        if (dx * dx + dy * dy < 4.2 * 4.2 && !over[k]) {
          out[k] = "●";
          if (color) color[k] = nearest(0.93, 0.95, 1);
        }
      }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
