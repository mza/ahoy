/*
 * treasure cave: a sea cave at night, its mouth open on a moonlit sea. On a
 * ledge inside lies a hoard: a heap of gold coins, an open chest spilling
 * more, a goblet, a cutlass driven into the pile. A torch jammed in a crack
 * lights it all in gold; it gutters, so the shadows sway and the coins wink.
 * Black water laps at the ledge, holding the torch, the gold and the moon.
 *
 * Shaded in colour per cell: the rock by its bumps and the torch's reach, the
 * gold coin by coin, each tilted its own way so it glints when the flame
 * leans; shadows come from three places the flame leans to, blended as it
 * moves. Then drawn as a halftone: dot size is brightness, ordered-dithered,
 * in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "treasure cave",
  category: "scenes",
  note: "a hoard of gold in a torchlit sea cave, the moonlit sea beyond",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#050404",
  palette: [
    // rock, dark to light, warm
    "#141110", "#1e1915", "#2a221c", "#382d24", "#4a3b2e", "#5e4a38", "#776048",
    // rock in moonlight
    "#1a1f2a", "#273042", "#36435c",
    // gold
    "#3d2a0a", "#5a3d0e", "#7a5412", "#9c6c16", "#bf861c", "#dca229", "#f0be3e", "#fbd865", "#fff0a8", "#fffbe6",
    // torch
    "#ff7a1e", "#ff9a30", "#ffbb4a", "#ffdc80", "#c4501a", "#8c3412",
    // chest wood and iron
    "#2e1a0c", "#4a2a12", "#6a3e1a", "#2a2a2c", "#45454a",
    // steel
    "#6e7076", "#a3a6ad", "#dfe2e8",
    // gems
    "#b0182a", "#e2344a",
    // night sky and sea
    "#06102a", "#0c1a3c", "#15264f", "#203766", "#2f4c82", "#47689f", "#6c8dc0", "#a3bde0", "#e0ebfa",
    // water inside the cave
    "#06100f", "#0b1b1a", "#123029",
  ],
} satisfies Meta;

const W = 200, H = 100;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const MOUTH = [148, 40, 36, 28]; // the cave mouth: centre, half-width, half-height
const SEA = 47; // the horizon, seen through the mouth
const LEVEL = 60; // the water's surface, where the mouth meets the sea
const POOL = 88; // the still water along the front of the ledge
const MOON = [161, 25];
const TORCH = [40, 31]; // the flame's heart
const LEANS = [-1.6, 0, 1.6]; // where the flame leans to, for its shadows

const ROCK = 0, OPEN = 1, WATER = 2, GOLD = 3, CHEST = 4, IRON = 5, STEEL = 6, GEM = 7, HANDLE = 8;

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

// the heap's height above the ledge, along it
const heapTop = (x: number) => {
  const main = 19 * Math.exp(-(((x - 58) / 27) ** 2)) + 8 * Math.exp(-(((x - 94) / 14) ** 2));
  return 84 - main - 1.2 * (fbm(x * 0.3, 7, 2) - 0.5) * smooth(2, 8, main);
};

export default function treasureCave(): Frame {
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
  const floorA = new Float32Array(N).fill(0.06);
  // a surface's facing, as a picture-plane normal and how much it faces us
  const NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N).fill(1);
  const solid = new Uint8Array(N); // what casts a shadow from the torch
  const shine = new Float32Array(N); // how glossy: 0 rock, 1 gold
  const glint = new Float32Array(N).fill(-1); // a coin's own tilt, as a phase, or -1
  const drip = new Uint8Array(N); // the stalactites, dark against the sky

  // the cave mouth, ragged, a little lower on the sea side
  const [mx, my, mw, mh] = MOUTH;
  const inMouth = (x: number, y: number) => {
    const dx = (x - mx) / mw, dy = (y - my) / mh;
    const ragged = 0.16 * (fbm(Math.atan2(dy, dx) * 2.2 + 3, 1.3, 3) - 0.5) + 0.05 * (noise(x * 0.4, y * 0.4) - 0.5);
    return dx * dx + dy * dy < (1 + ragged) * (1 + ragged) && y < LEVEL;
  };

  // --- rock, the opening, the water ---------------------------------------
  const rockH = (x: number, y: number) => fbm(x * 0.09, y * 0.11, 4) + 0.35 * fbm(x * 0.4, y * 0.45, 2);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      if (inMouth(xc, y)) {
        mat[k] = OPEN;
        floorA[k] = 0.05;
        continue;
      }
      // the cave's floor of water: the sea coming in under the mouth, widening toward us
      if (y >= POOL || (y >= LEVEL && xc > mix(118, 66, smooth(LEVEL, POOL, y)) + 3 * (noise(y * 0.4, 5) - 0.5))) {
        mat[k] = WATER;
        floorA[k] = 0.04;
        continue;
      }
      // rough rock: its bumps give it a normal, so the torch picks out every ledge
      const h = rockH(xc, y);
      const gx = rockH(xc + 1, y) - h, gy = rockH(xc, y + 1) - h;
      const nl = Math.hypot(gx * 6, gy * 6, 1);
      NX[k] = (-gx * 6) / nl, NY[k] = (-gy * 6) / nl, NZ[k] = 1 / nl;
      const s = 0.65 + 0.55 * h;
      // strata, and the ledge's top worn smoother
      const band = 0.85 + 0.15 * Math.sin(y * 0.9 + fbm(xc * 0.05, y * 0.05, 2) * 6);
      mat[k] = ROCK;
      R[k] = 0.26 * s * band, G[k] = 0.21 * s * band, B[k] = 0.17 * s * band;
      if (y > 78 && y < POOL) NY[k] = mix(NY[k], -0.9, 0.6);
      floorA[k] = 0.04;
    }
  // stalactites hanging from the roof, in and around the mouth
  for (let i = 0; i < 26; i++) {
    const sx = 4 + hash(i, 1) * 190, len = 4 + hash(i, 2) * 12, wd = 1.2 + hash(i, 3) * 2.4;
    if (Math.abs(sx - MOON[0]) < 8) continue; // keep the moon clear
    for (let r = 0; r < 30; r++)
      for (let x = Math.floor(sx - wd - 1); x <= sx + wd + 1; x++) {
        if (x < 0 || x >= W) continue;
        const k = r * W + x, y = r + 0.5, xc = x + 0.5;
        // where the roof is at this column
        let roof = 0;
        while (roof < 40 && mat[roof * W + x] === ROCK) roof++;
        if (roof === 0 || roof >= 40) continue;
        const hw = wd * (1 - (y - roof) / len);
        if (y >= roof - 1 && y < roof + len && Math.abs(xc - sx) < hw) {
          mat[k] = ROCK;
          const u = (xc - sx) / Math.max(hw, 0.4);
          NX[k] = u * 0.8, NY[k] = 0.2, NZ[k] = Math.sqrt(Math.max(0, 1 - u * u * 0.64));
          R[k] = 0.16, G[k] = 0.13, B[k] = 0.11;
          drip[k] = 1;
        }
      }
  }

  // --- the hoard ---------------------------------------------------------------
  // coins packed in rows, each its own tilt; a cell is coin face, coin rim or gap
  const coinAt = (x: number, y: number): [number, number] => {
    const cw = 2.3, ch = 1.5;
    const row = Math.floor(y / ch), off = row & 1 ? cw / 2 : 0;
    const col = Math.floor((x + off) / cw);
    let best = 9, id = 0;
    for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]]) {
      const rr = row + dr, o = rr & 1 ? cw / 2 : 0, cc = col + dc;
      const cx = cc * cw - o + cw / 2 + (hash(cc, rr) - 0.5) * 0.9, cy = rr * ch + ch / 2 + (hash(rr, cc) - 0.5) * 0.6;
      const d = Math.hypot((x - cx) / (cw * 0.55), (y - cy) / (ch * 0.62));
      if (d < best) (best = d), (id = cc * 7919 + rr * 104729);
    }
    return [best, id];
  };
  const gold = (k: number, x: number, y: number, nx: number, ny: number, nz: number) => {
    const [d, id] = coinAt(x, y);
    mat[k] = GOLD;
    const face = d < 0.82, rim = d >= 0.82 && d < 1.05;
    const s = face ? 0.8 + 0.25 * hash(id, 3) : rim ? 1.05 : 0.38;
    R[k] = 0.8 * s, G[k] = 0.55 * s, B[k] = 0.15 * s;
    // each coin tips its own way off the heap's surface
    const tip = face ? 0.35 : 0.15;
    NX[k] = nx + (hash(id, 5) - 0.5) * tip * 2, NY[k] = ny + (hash(id, 6) - 0.5) * tip * 2, NZ[k] = nz;
    shine[k] = face ? 1 : 0.5;
    glint[k] = face && hash(id, 9) > 0.55 ? hash(id, 10) * 6.283 : -1;
    solid[k] = 1;
    floorA[k] = 0.1;
  };
  for (let r = 40; r < POOL; r++)
    for (let x = 0; x < 125; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5, top = heapTop(xc);
      if (y < top || mat[k] === WATER) continue;
      // the heap as a long dome: steep at the sides, rounded on top
      const slope = (heapTop(xc + 0.5) - heapTop(xc - 0.5));
      const depth = clamp((y - top) / 6);
      const nx = slope * 0.6 * (1 - depth * 0.5), ny = -0.75 * (1 - depth) - 0.15, nz = 0.55 + 0.4 * depth;
      const l = Math.hypot(nx, ny, nz);
      gold(k, xc, y, nx / l, ny / l, nz / l);
    }

  // an open chest on the heap, lid thrown back, brimming
  for (let r = 44; r < 80; r++)
    for (let x = 70; x < 106; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      const front = xc > 76 && xc < 100 && y > 63 && y < 77;
      // the lid, tipped back: a slanted panel above and behind the box
      const lx = xc - (y - 63) * -0.25;
      const lid = lx > 78 && lx < 102 && y > 51 && y <= 63 && y > 51 + Math.abs(lx - 90) * 0.04;
      const brim = xc > 77 && xc < 99 && y > 60.5 && y <= 63.5 && y > 61 + Math.abs(xc - 88) * 0.12;
      if (brim) {
        gold(k, xc, y, 0, -0.9, 0.45);
        continue;
      }
      if (!front && !lid) continue;
      const band = front ? (Math.abs(xc - 81) < 1 || Math.abs(xc - 95) < 1 || Math.abs(y - 64.2) < 0.8) : Math.abs(lx - 83) < 0.9 || Math.abs(lx - 97) < 0.9 || y < 52.2;
      const lock = front && Math.abs(xc - 88) < 1.8 && y > 66 && y < 70;
      mat[k] = band || lock ? IRON : CHEST;
      solid[k] = 1;
      shine[k] = band || lock ? 0.6 : 0.05;
      if (band || lock) (R[k] = 0.32), (G[k] = 0.29), (B[k] = 0.26);
      else {
        // planks, the lid's inside darker
        const plank = Math.abs(((y + (lid ? 0 : 0.5)) / 2.6) % 1 - 0.5) < 0.08 ? 0.55 : 1;
        const s = (lid ? 0.55 : 1) * plank * (0.8 + 0.3 * fbm(xc * 0.4, y * 0.1, 2));
        (R[k] = 0.62 * s), (G[k] = 0.36 * s), (B[k] = 0.16 * s);
      }
      if (lock) (R[k] = 0.62), (G[k] = 0.44), (B[k] = 0.14), (shine[k] = 1);
      NX[k] = front ? -0.15 : -0.1, NY[k] = front ? 0 : -0.5, NZ[k] = front ? 0.98 : 0.86;
      floorA[k] = 0.06;
    }
  // a goblet standing on the heap
  for (let r = 50; r < 72; r++)
    for (let x = 48; x < 64; x++) {
      const k = r * W + x, y = r + 0.5, dx = x + 0.5 - 56;
      const bowl = y > 55 && y < 61 && Math.abs(dx) < 3.4 - Math.max(0, y - 58) * 0.9;
      const stem = y >= 61 && y < 64.5 && Math.abs(dx) < 0.7;
      const foot = y >= 64.5 && y < 66 && Math.abs(dx) < 2.2;
      if (!(bowl || stem || foot)) continue;
      const gem = bowl && Math.abs(dx - 0.4) < 0.9 && Math.abs(y - 58) < 0.8;
      mat[k] = gem ? GEM : GOLD;
      const u = dx / 3.4;
      R[k] = gem ? 0.7 : 0.66, G[k] = gem ? 0.06 : 0.46, B[k] = gem ? 0.1 : 0.14;
      NX[k] = u * 0.9, NY[k] = bowl && y < 56 ? -0.8 : 0, NZ[k] = Math.sqrt(Math.max(0.05, 1 - u * u * 0.8));
      shine[k] = 1;
      glint[k] = -1;
      solid[k] = 1;
      floorA[k] = 0.1;
    }
  // a cutlass driven into the pile
  for (let r = 44; r < 84; r++)
    for (let x = 18; x < 36; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      // the blade, angled, from the hilt down into the coins
      const bx = 26 + (y - 50) * 0.22;
      const blade = y > 52 && y < heapTop(bx) + 2 && Math.abs(xc - bx) < 0.95 - (xc > bx ? 0.3 : 0);
      const guard = y > 50.6 && y <= 52 && Math.abs(xc - 26) < 3;
      const grip = y > 46 && y <= 50.6 && Math.abs(xc - 25.8) < 0.7;
      const bow = y > 46.5 && y < 52 && Math.abs(xc - 28.6 - Math.sin((y - 46.5) / 5.5 * Math.PI) * 1.2) < 0.55;
      if (!(blade || guard || grip || bow)) continue;
      mat[k] = blade ? STEEL : HANDLE;
      if (blade) (R[k] = 0.5), (G[k] = 0.52), (B[k] = 0.56), (shine[k] = 0.9);
      else if (grip) (R[k] = 0.18), (G[k] = 0.1), (B[k] = 0.06), (shine[k] = 0.1);
      else (R[k] = 0.6), (G[k] = 0.43), (B[k] = 0.14), (shine[k] = 1);
      NX[k] = xc < bx ? -0.5 : 0.4, NY[k] = 0, NZ[k] = 0.85;
      solid[k] = 1;
      floorA[k] = 0.08;
    }
  // coins scattered on the ledge in front of the heap
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(10 + hash(i, 21) * 110), r = Math.floor(80 + hash(i, 22) * 5);
    const k = r * W + x;
    if (mat[k] !== ROCK) continue;
    gold(k, x + 0.5, r + 0.5, 0, -0.85, 0.5);
    glint[k] = hash(i, 23) * 6.283;
  }

  // --- the torch on the wall ----------------------------------------------------
  const [tx, ty] = TORCH;
  for (let r = ty; r < ty + 18; r++)
    for (let x = tx - 8; x < tx + 4; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      // the stave, jammed slantwise in a crack, a wrap of pitch-soaked rag at its head
      const sx = tx - (y - ty) * 0.45;
      if (y > ty + 2 && Math.abs(xc - sx) < 0.8) {
        mat[k] = HANDLE;
        const head = y < ty + 5;
        (R[k] = head ? 0.12 : 0.3), (G[k] = head ? 0.07 : 0.17), (B[k] = head ? 0.04 : 0.08);
        NX[k] = 0, NY[k] = -0.3, NZ[k] = 0.95;
        solid[k] = 0;
      }
    }

  // --- the torch's light: its reach, the facing of each surface, and shadows -----
  // how far it carries, and how much each surface turns toward it, for each lean
  const LIGHT: Float32Array[] = LEANS.map((lean) => {
    const f = new Float32Array(N);
    const lx = tx + lean, ly = ty - 1;
    for (let r = 0; r < H; r++)
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k];
        if (m === OPEN || m === WATER) continue;
        const dx = lx - (x + 0.5), dy = ly - (r + 0.5), dz = 10;
        const d = Math.hypot(dx, dy * 1.05);
        const dl = Math.hypot(dx, dy, dz);
        const lam = clamp((NX[k] * dx + NY[k] * dy + NZ[k] * dz) / dl);
        let v = (Math.exp(-d / 10) * 0.42 + Math.exp(-d / 34) * 0.66 + Math.exp(-d / 90) * 0.2) * (0.25 + 0.75 * lam);
        // shadow: something solid between this cell and the flame
        if (!solid[k] || m === ROCK) {
          const steps = Math.ceil(d);
          for (let s = 2; s < steps - 2; s++) {
            const sx = Math.floor(x + 0.5 + (dx * s) / steps), sy = Math.floor(r + 0.5 + (dy * s) / steps);
            if (solid[sy * W + sx]) {
              v *= 0.2;
              break;
            }
          }
        }
        f[k] = v;
      }
    return f;
  });
  // the heap's warm glow on the rock round it
  const bounce = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const dx = ((k % W) + 0.5 - 66) / 46, dy = (Math.floor(k / W) + 0.5 - 74) / 26;
    bounce[k] = Math.exp(-(dx * dx + dy * dy) * 1.6) * 0.35;
  }
  // the direction to the flame, for gold's glints
  const toL = new Float32Array(N * 2);
  for (let k = 0; k < N; k++) {
    const dx = tx - ((k % W) + 0.5), dy = ty - (Math.floor(k / W) + 0.5), l = Math.hypot(dx, dy, 10);
    toL[2 * k] = dx / l, toL[2 * k + 1] = dy / l;
  }
  // moonlight from the mouth: a cold rim on the rock near it, and on the water
  const moonWash = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      if (mat[k] === OPEN) continue;
      const dx = (x + 0.5 - mx) / mw, dy = (r + 0.5 - my) / mh, d = Math.sqrt(dx * dx + dy * dy);
      // strongest right at the rim of the arch, where the rock turns toward the sky
      const rim = Math.exp(-Math.max(0, d - 1) * 4.5) * 0.9 + Math.exp(-Math.max(0, d - 1) * 1.2) * 0.18;
      moonWash[k] = rim * (mat[k] === ROCK ? clamp(0.5 - (NX[k] * dx + NY[k] * dy) / (d + 0.01) * 1.4) : 1) * (drip[k] ? 0.35 : 1);
    }

  // the sky and the sea through the mouth, fixed but for the moon's glitter
  const SR = new Float32Array(N), SG = new Float32Array(N), SB = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      if (mat[k] !== OPEN) continue;
      let cr, cg, cb;
      if (y < SEA) {
        const v = clamp((y - 12) / (SEA - 12));
        cr = mix(0.03, 0.1, v * v), cg = mix(0.05, 0.16, v * v), cb = mix(0.16, 0.34, v * v);
        const dx = xc - MOON[0], dy = y - MOON[1], d = Math.sqrt(dx * dx + dy * dy);
        const halo = Math.exp(-d / 4) * 0.4 + Math.exp(-d / 13) * 0.18 + Math.exp(-d / 40) * 0.08;
        cr += halo * 0.75, cg += halo * 0.82, cb += halo;
        // a low headland across the bay
        if (y > SEA - 3 * fbm(xc * 0.05, 2, 3) * smooth(150, 125, xc)) (cr = 0.02), (cg = 0.03), (cb = 0.07);
      } else {
        const depth = clamp((y - SEA) / 14);
        cr = 0.03 + 0.03 * (1 - depth), cg = 0.06 + 0.04 * (1 - depth), cb = 0.15 + 0.06 * (1 - depth);
      }
      SR[k] = cr, SG[k] = cg, SB[k] = cb;
    }
  // stars, and sparks the torch gives off
  const stars: [number, number, number][] = [];
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(hash(i, 91) * W), r = Math.floor(10 + hash(i, 92) * (SEA - 14));
    const k = r * W + x;
    if (mat[k] === OPEN && hash(i, 93) > 0.6 && Math.hypot(x - MOON[0], r - MOON[1]) > 7) stars.push([k, hash(i, 94) * 6.28, 0.6 + hash(i, 95) * 1.6]);
  }
  const sparks: [number, number, number, number][] = [];
  for (let i = 0; i < 14; i++) sparks.push([hash(i, 31) * 3, 1.8 + hash(i, 32) * 1.6, hash(i, 33) * 3, hash(i, 34) * 4 - 2]);

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.32;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }
  // the colour each cell was this frame, for the water to mirror
  const FR = new Float32Array(N), FG = new Float32Array(N), FB = new Float32Array(N), FL = new Float32Array(N);

  return (t, { color } = {}) => {
    // the flame gutters and leans in the draught from the sea
    const flick = 0.82 + 0.12 * Math.sin(t * 7.1) * Math.sin(t * 2.9 + 1) + 0.25 * (noise(t * 3.4, 1.1) - 0.5);
    const lean = 1.6 * (noise(t * 0.9, 4.2) - 0.5) * 2;
    // blend the shadows of the two leans either side of this one
    const li = lean < 0 ? 0 : 1, lk = lean < 0 ? lean / -1.6 : lean / 1.6;
    const LA = LIGHT[li], LB2 = LIGHT[li + 1];
    const wA = li === 0 ? lk : 1 - lk, wB = 1 - wA;
    const glit = t * 1.2;

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k];
        let cr: number, cg: number, cb: number, fl = floorA[k];
        if (m === OPEN) {
          cr = SR[k], cg = SG[k], cb = SB[k];
          if (y > SEA) {
            // the moon's path across the swell
            const xc = x + 0.5, depth = (y - SEA) / 20;
            const w = noise(xc * 0.3 + glit * 0.3, y * 1.3 - glit);
            const path = Math.exp(-Math.abs(xc - MOON[0]) / (1.5 + depth * 5)) * smooth(0.45, 0.85, w);
            cr += path * 0.85, cg += path * 0.9, cb += path;
          }
        } else if (m === WATER) {
          // black water, mirroring what stands above it, shivering
          const xc = x + 0.5, edge = y < POOL ? LEVEL : POOL;
          const depth = (y - edge) / (H - edge + 1);
          const w = noise(xc * 0.18 + t * 0.25, y * 1.2 - t * 0.9);
          const wob = Math.sin(y * 1.9 - t * 2.1 + Math.sin(xc * 0.12 + t * 0.5) * 1.5) * (0.4 + 1.2 * depth);
          let sx = Math.round(x + wob), sr = Math.round(edge - 1 - (y - edge) * 1.1 + (w - 0.5) * 3 * depth);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          sr = sr < 0 ? 0 : sr;
          const j = sr * W + sx;
          const lit = mix(0.42, 0.18, depth) * (0.7 + 0.6 * w);
          cr = FR[j] * lit * 0.9, cg = FG[j] * lit, cb = FB[j] * lit + 0.012;

          // the torch's broken streak, and the moon's
          const ts = Math.exp(-Math.abs(xc - tx - (y - POOL) * 0.2) / (2.5 + depth * 3)) * smooth(0.5, 0.8, w) * flick * 0.9;
          cr += ts, cg += ts * 0.55, cb += ts * 0.15;
          // the moon's path comes on in under the arch, fading as it nears us
          const ms = Math.exp(-Math.abs(xc - MOON[0] + (y - LEVEL) * 0.15) / (1.8 + depth * 5)) * smooth(0.55, 0.85, w) * 0.75 * smooth(POOL + 6, LEVEL, y);
          cr += ms * 0.8, cg += ms * 0.85, cb += ms;
          fl = 0.03;
        } else {
          const L = (LA[k] * wA + LB2[k] * wB) * flick;
          const a = R[k], b = G[k], c = B[k], mw = moonWash[k];
          // and the gold's own glow thrown back on everything near it
          const bo = bounce[k] * flick;
          cr = a * (0.05 + L * 3 * (1 + L * 0.6) + bo * 1.2) + mw * a * 1.1;
          cg = b * (0.05 + L * 2.6 * (1 + L * 0.45) + bo * 0.95) + mw * b * 1.6;
          cb = c * (0.05 + L * 1.7 + bo * 0.4) + mw * c * 3.6;
          // gold and steel flash where they tip toward the flame
          const sh = shine[k];
          if (sh > 0) {
            const nx = NX[k] + lean * 0.06, ny = NY[k];
            const dot = clamp(nx * toL[2 * k] + ny * toL[2 * k + 1] + NZ[k] * 0.3);
            let sp = Math.pow(dot, 6) * sh * L * 2.2;
            const g = glint[k];
            if (g >= 0) sp += Math.pow(Math.max(0, Math.sin(g + lean * 2.4 + t * 0.7)), 18) * L * 4 * sh;
            cr += sp * (m === STEEL ? 0.9 : 1), cg += sp * (m === STEEL ? 0.92 : 0.82), cb += sp * (m === STEEL ? 1 : 0.4);
            if (sp > 0.35) fl = 0.4;
          }
        }
        FR[k] = cr, FG[k] = cg, FB[k] = cb, FL[k] = fl;
      }
    }
    // the flame itself, and the glow in the smoky air round it
    const fx = tx + lean * 0.5, fy = ty - 1;
    for (let r = Math.max(0, ty - 20); r < Math.min(H, ty + 18); r++)
      for (let x = Math.max(0, tx - 20); x < Math.min(W, tx + 20); x++) {
        const k = r * W + x, xc = x + 0.5, y = r + 0.5;
        const dx = xc - fx - (fy + 2 - y) * lean * 0.12, dy = y - fy;
        // a tongue of fire: wide at the rag, licking up to a point
        const tall = 10 * flick, wide = 2.4;
        const inFlame = dy < 2.5 && dy > -tall && Math.abs(dx) < wide * (dy > 0 ? 1 - dy / 3 : Math.pow(1 + dy / tall, 0.7)) * (0.75 + 0.35 * noise(y * 0.7 - t * 7, xc * 0.8));
        if (inFlame) {
          const heat = clamp(1 - Math.abs(dx) / wide) * clamp(1 + dy / tall);
          FR[k] = 1.4, FG[k] = 0.5 + 0.9 * heat, FB[k] = 0.1 + 0.9 * heat * heat, FL[k] = 0.45;
          continue;
        }
        const d = Math.hypot(dx, dy + 1.5);
        const h = (Math.exp(-d / 3) * 0.3 + Math.exp(-d / 9) * 0.1) * flick;
        FR[k] += h, FG[k] += h * 0.55, FB[k] += h * 0.16;
      }

    for (let k = 0; k < N; k++) {
      const cr = tone[Math.min(1024, (FR[k] * 256) | 0)], cg = tone[Math.min(1024, (FG[k] * 256) | 0)], cb = tone[Math.min(1024, (FB[k] * 256) | 0)];
      const fl = FL[k];
      const peak = Math.max(cr, cg, cb, 1e-4);
      const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.02);
      const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
      out[k] = DOTS[step];
      if (color) {
        const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
        // only part of the way to full brightness, so shadowed rock stays rock rather than glowing
        const s = (0.3 + 0.7 * want) / Math.pow(peak, 0.6);
        color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
      }
    }

    // sparks rising off the torch, and the moon and stars
    for (const [ph, sp, sw, dr] of sparks) {
      const age = ((t * 0.6 + ph) % 3) / 3;
      const x = Math.round(fx + dr * age * 4 + Math.sin(t * sw + ph * 3) * 1.5), r = Math.round(fy - 6 - age * 22 * sp * 0.5);
      if (x < 0 || x >= W || r < 0 || r >= H || age > 0.85) continue;
      const k = r * W + x;
      out[k] = age < 0.3 ? "•" : "·";
      if (color) color[k] = nearest(1, mix(0.8, 0.45, age), 0.25);
    }
    for (let r = MOON[1] - 4; r <= MOON[1] + 4; r++)
      for (let x = MOON[0] - 4; x <= MOON[0] + 4; x++) {
        const dx = x + 0.5 - MOON[0], dy = r + 0.5 - MOON[1];
        if (dx * dx + dy * dy < 3.6 * 3.6) {
          const k = r * W + x;
          if (mat[k] !== OPEN) continue;
          out[k] = "●";
          if (color) color[k] = nearest(0.93, 0.95, 1);
        }
      }
    for (const [k, ph, sp] of stars) {
      const s = Math.sin(t * sp + ph);
      if (s > -0.2) {
        out[k] = s > 0.75 ? "•" : "·";
        if (color) color[k] = nearest(0.85, 0.88, 1);
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
