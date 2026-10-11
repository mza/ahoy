/*
 * wreck coast: dawn after a storm. A ship lies broken on a black reef, its bow
 * thrown up on the rocks and its stern torn open to the ribs, one mast snapped
 * and leaning. Behind it the first warm light breaks through the clouds and
 * fans out in rays; the swell rolls in, bursts white against the rocks and
 * catches the sunrise in its spray; gulls wheel round the wreck.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 * Everything that moves is periodic in one loop, so it plays without a seam.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "wreck coast",
  category: "scenes",
  note: "a ship broken on a reef at dawn, surf bursting white against the rocks",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#06070c",
  palette: [
    "#141b2c", "#1c2438", "#262f46", "#323b54", "#3f4762", "#4d536e",
    "#5d5a74", "#73607a", "#8c667c", "#a66e7c", "#c07a7a", "#d68b76", "#e8a072", "#f4b874", "#fbd28a", "#fee7b0", "#fff6dc",
    "#2a2a36", "#3a3844", "#4c4852", "#625a62",
    "#0e1622", "#14202e", "#1b2a3a", "#243546", "#2f4252", "#3c505e", "#4c606b",
    "#07080c", "#0e1014", "#16181d", "#202227",
    "#d9d6d8", "#ece6e2", "#fff8f2", "#f2c9b4", "#e6a98e",
    "#ffd79a", "#ffc070", "#ff9f50",
    "#1a120e", "#2a1d15", "#3b2a1e",
    "#7a7682", "#a8a2aa",
    "#8a5a6a", "#6a4458", "#9a7a8a",
  ],
} satisfies Meta;

const W = 200, H = 100;
const LOOP = 12;
const TAU = Math.PI * 2;
const SEA = 57; // the horizon
const SUN = [96, 52];
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const SKY = 0, CLOUD = 1, WATER = 2, ROCK = 3, WRECK = 4;
// the wreck's place on the reef, how far it is thrown up, its size
const OX = 68, OY = 58.5, TILT = 0.22;

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

function seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  const ex = ax + dx * k - px, ey = ay + dy * k - py;
  return Math.sqrt(ex * ex + ey * ey);
}

// the reef: a great black mass on the left the wreck lies on, a low rock mid-frame, and rocks in the near right
const reefTop = (x: number) => 74 - 15 * Math.exp(-(((x - 62) / 30) ** 2)) + 5 * (fbm(x * 0.09, 1, 3) - 0.5) + 30 * smooth(96, 122, x) - 6 * smooth(30, 0, x);
const nearTop = (x: number) => 88 - 12 * Math.exp(-(((x - 180) / 22) ** 2)) + 4 * (fbm(x * 0.1, 5, 3) - 0.5) + 20 * smooth(152, 138, x);
const midRock = (x: number, y: number) => {
  const dx = (x - 138) / 10, dy = (y - 80) / 4.5;
  return dx * dx + dy * dy < 1 + 0.4 * (noise(x * 0.3, y * 0.3) - 0.5) && y > 76;
};

/*
 * The wreck in its own frame: s along it from the bow (-34) to where it is
 * torn off (+30), h up from the keel. 1 planking, 2 the rail, 3 a rib, 0 open.
 */
function wreck(s: number, h: number): number {
  const u = s / 34;
  const bottom = 1 + 7 * u * u;
  const top = 14 + 5 * u * u + (s < -22 ? 1.5 : 0);
  if (h < bottom || h > top) return 0;
  // a raked stem: the bow comes to a point low down and leans forward as it rises
  if (s < -22 - 12 * clamp((h - bottom) / 16) + 3 * clamp((bottom + 3 - h) / 3)) return 0;
  if (s > 30) return 0;
  // torn open aft: only the ribs stand, and a ragged edge of planks
  const tear = 10 + 6 * noise(h * 0.4, 2) - h * 0.15;
  if (s > tear) {
    if (s > 28) return 0;
    const rib = Math.abs(((s + 50) % 4.2) - 2.1) < 0.7;
    return rib && h < top - 1 + 2 * noise(s, 4) ? 3 : 0;
  }
  if (h > top - 1.1) return 2;
  return 1;
}

export default function wreckCoast(): Frame {
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

  const ct = Math.cos(TILT), st = Math.sin(TILT);
  const toShip = (x: number, y: number): [number, number] => {
    const dx = x - OX, dy = y - OY;
    return [dx * ct + dy * st, dx * st - dy * ct];
  };
  const toWorld = (s: number, h: number): [number, number] => [OX + s * ct + h * st, OY + s * st - h * ct];
  // a mast snapped and leaning aft, the stump of another, a yard hanging off the first
  const spars: [number, number, number, number, number][] = [
    [-8, 14, 4, 42, 1.1], [14, 14, 13, 22, 0.9], [-4, 33, 13, 26, 0.55], [-34, 18, -46, 22, 0.6],
  ];
  const lines: [number, number, number, number][] = [[4, 42, -46, 22], [4, 42, 26, 15], [-4, 33, -30, 16]];

  // the sky's light, worked out once: dawn low and warm round the sun
  const skyAt = (x: number, y: number): [number, number, number] => {
    const v = clamp(y / SEA);
    const dx = x - SUN[0], dy = (y - SUN[1]) * 1.6;
    const d = Math.sqrt(dx * dx + dy * dy);
    const near = Math.exp(-d / 55);
    let r = mix(0.06, 0.2, v), g = mix(0.08, 0.17, v), b = mix(0.14, 0.26, v);
    const low = smooth(0.55, 1, v);
    r = mix(r, 0.95, low * (0.15 + 0.85 * near)), g = mix(g, 0.55, low * (0.15 + 0.85 * near)), b = mix(b, 0.42, low * (0.12 + 0.5 * near));
    // a band of dawn all along the horizon
    const band = smooth(0.58, 1, v) * (0.55 + 0.45 * near);
    r = mix(r, 0.88, band * 0.75), g = mix(g, 0.5, band * 0.75), b = mix(b, 0.42, band * 0.6);
    const core = Math.exp(-d / 6) * 0.9 + Math.exp(-d / 16) * 0.4;
    return [r + core, g + core * 0.8, b + core * 0.55];
  };

  const mat = new Uint8Array(N);
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  const floorA = new Float32Array(N);

  // storm clouds: their thickness and how lit they are, on a strip wide enough to drift across
  const CW = W + 24;
  const cden = new Float32Array(CW * SEA), clit = new Float32Array(CW * SEA);
  for (let r = 0; r < SEA; r++)
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5, xc = x - 12;
      const dx = xc - SUN[0], dy = (y - SUN[1]) * 1.4;
      // a break in the cloud round the sun, and a thinning at the horizon
      const gap = Math.exp(-(dx * dx / 900 + dy * dy / 260));
      const d = fbm(xc * 0.018, y * 0.05, 5) + 0.25 * fbm(xc * 0.05, y * 0.12, 3) - 0.62 * gap - 0.5 * smooth(28, SEA - 4, y);
      cden[r * CW + x] = smooth(0.34, 0.52, d);
      // lit on the side toward the sun
      const toward = fbm((xc - dx * 0.04) * 0.018, (y - dy * 0.04) * 0.05, 5);
      clit[r * CW + x] = clamp(0.5 + (fbm(xc * 0.018, y * 0.05, 5) - toward) * 9) * (0.4 + 0.6 * Math.exp(-Math.sqrt(dx * dx + dy * dy) / 60));
    }

  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      let m = y < SEA ? SKY : WATER, cr = 0, cg = 0, cb = 0, fl = 0.05;
      if (m === SKY) [cr, cg, cb] = skyAt(xc, y);
      if (y > reefTop(xc) && xc < 122) m = ROCK;
      if (y > nearTop(xc) && xc > 138) m = ROCK;
      if (midRock(xc, y)) m = ROCK;
      if (m === ROCK) {
        // black wet rock: its tops and seaward faces catch the dawn
        const top = xc < 122 && y > reefTop(xc) ? reefTop(xc) : xc > 138 && y > nearTop(xc) ? nearTop(xc) : 76;
        const lip = smooth(top + 2.5, top, y);
        const tex = fbm(xc * 0.3, y * 0.35, 3);
        const wet = smooth(0.62, 0.8, fbm(xc * 0.2 + 3, y * 0.6, 2)) * 0.15;
        cr = 0.02 + 0.03 * tex + 0.35 * lip + wet, cg = 0.02 + 0.03 * tex + 0.2 * lip + wet * 0.9, cb = 0.03 + 0.035 * tex + 0.17 * lip + wet * 0.9;
        fl = 0.02;
      }
      const [s, h] = toShip(xc, y);
      const part = wreck(s, h);
      let spar = false;
      for (const [s0, h0, s1, h1, wd] of spars) if (seg(s, h, s0, h0, s1, h1) < wd) spar = true;
      let line = false;
      for (const [s0, h0, s1, h1] of lines) if (seg(s, h, s0, h0, s1, h1) < 0.35) line = true;
      if (part || spar || line) {
        m = WRECK;
        // black against the dawn; the rail and rib tops take a little of the light
        const edge = part === 2 || part === 3 ? 1 : 0;
        cr = 0.05 + 0.3 * edge, cg = 0.035 + 0.17 * edge, cb = 0.04 + 0.13 * edge;
        if (part === 1 && (h % 2.2) < 0.4) (cr *= 0.6), (cg *= 0.6), (cb *= 0.6);
        // wet planks pick up the dawn here and there
        if (part === 1 && (h % 2.2) > 1.7 && noise(s * 0.4, h) > 0.6) (cr += 0.1), (cg += 0.05), (cb += 0.04);
        if (line) (cr = 0.05), (cg = 0.04), (cb = 0.05);
        fl = 0.02;
      }
      mat[k] = m;
      R[k] = cr, G[k] = cg, B[k] = cb;
      floorA[k] = fl;
    }

  // where surf bursts: a point on the rocks, when in the loop, how big
  const bursts: [number, number, number, number][] = [[112, 70, -0.6, 1.2], [130, 77, 3.4, 0.9], [152, 82, 6.8, 1.1], [118, 76, 9.4, 0.85]];
  const drops: [number, number, number][] = []; // each drop's launch angle, speed, and size
  for (let i = 0; i < 260; i++) drops.push([-Math.PI / 2 + (hash(i, 51) - 0.5) * 1.9, 12 + hash(i, 52) * 30, hash(i, 53)]);
  const SPRAY = 2.4; // seconds a burst hangs in the air

  // gulls, wheeling round the broken mast
  const gulls: [number, number, number, number, number][] = []; // centre x, y, radius, phase, laps a loop
  for (let i = 0; i < 6; i++) gulls.push([70 + hash(i, 61) * 34, 16 + hash(i, 62) * 12, 10 + hash(i, 63) * 16, hash(i, 64) * TAU, i % 3 === 0 ? 2 : 1]);

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.5 + (hash(k, 77) - 0.5) * 0.3;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  const spray = new Float32Array(N);

  return (t, { color } = {}) => {
    const ph = (t / LOOP) * TAU;
    const drift = 6 + 5 * Math.sin(ph);

    // the spray in the air this frame
    spray.fill(0);
    for (const [bx, by, at, big] of bursts) {
      const tau = (((t - at) % LOOP) + LOOP) % LOOP;
      if (tau > SPRAY) continue;
      const fade = 1 - tau / SPRAY;
      // the white sheet where the wave hits
      if (tau < 0.7) {
        const rad = (2 + tau * 8) * big;
        for (let r = Math.floor(by - rad); r <= by + 3; r++)
          for (let x = Math.floor(bx - rad); x <= bx + rad; x++) {
            if (x < 0 || x >= W || r < 0 || r >= H) continue;
            const dx = x - bx, dy = (r - by) * 1.3;
            const q = (dx * dx + dy * dy) / (rad * rad);
            if (q < 1 && noise(x * 0.5 + tau * 6, r * 0.5) > 0.45 + q * 0.4) spray[r * W + x] = Math.max(spray[r * W + x], (1 - tau / 0.7));
          }
      }
      for (const [a, v, sz] of drops) {
        const vx = Math.cos(a) * v * big, vy = Math.sin(a) * v * big;
        const x = Math.round(bx + vx * tau * 0.7 + 5 * tau), r = Math.round(by + vy * tau + 14 * tau * tau);
        if (x < 0 || x >= W || r < 0 || r >= H || r > by + 6) continue;
        const k = r * W + x;
        spray[k] = Math.max(spray[k], fade * (0.6 + 0.6 * sz));
      }
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k];
        let cr = R[k], cg = G[k], cb = B[k], fl = floorA[k];
        if (m === SKY) {
          // clouds, drifting a little, dark with lit edges
          const sx = x + drift, ix = Math.floor(sx), fx = sx - ix;
          const i0 = r * CW + Math.min(CW - 2, ix);
          const c = cden[i0] + (cden[i0 + 1] - cden[i0]) * fx;
          if (c > 0.01) {
            const l = clit[i0] + (clit[i0 + 1] - clit[i0]) * fx;
            const cr2 = mix(0.07, 1.0, l * l), cg2 = mix(0.075, 0.6, l * l), cb2 = mix(0.11, 0.46, l * l);
            cr = mix(cr, cr2, c * 0.92), cg = mix(cg, cg2, c * 0.92), cb = mix(cb, cb2, c * 0.92);
          }
          // rays fanning up out of the break
          const dx = x + 0.5 - SUN[0], dy = y - SUN[1];
          if (dy < 0) {
            const a = Math.atan2(dy, dx);
            const fan = Math.pow(0.5 + 0.5 * Math.sin(a * 23 + 0.4 * Math.sin(ph) + 1.3) * Math.sin(a * 9 - 0.3 * Math.sin(ph + 1)), 3);
            const reach = Math.exp(-Math.sqrt(dx * dx + dy * dy) / 70) * (1 - c * 0.6);
            const g = fan * reach * 0.55;
            cr += g, cg += g * 0.72, cb += g * 0.5;
          }
        } else if (m === WATER) {
          // the swell: darker troughs, crests lit on their sunward faces, closer together far off
          const z = 1 / Math.max(0.6, y - SEA + 0.6);
          const depth = y - SEA;
          const swell = Math.sin(depth * 0.55 + x * 0.025 - ph * 3 + Math.sin(x * 0.04 + ph) * 0.8);
          // a circle through the noise, so the chop comes back to where it began
          const chop = noise(x * 0.12 + Math.cos(ph) * 3, depth * 0.5 + Math.sin(ph) * 3);
          const crest = smooth(0.45, 0.95, swell * 0.7 + chop * 0.5);
          const sky = skyAt(x + 0.5, SEA - 1 - depth * 0.5);
          let a = 0.35 + 0.35 * crest;
          const fade = 0.85 - 0.45 * smooth(SEA, H, y);
          cr = sky[0] * a * fade + 0.02, cg = sky[1] * a * fade + 0.03, cb = sky[2] * a * fade * 1.05 + 0.05;
          // the sun's path laid on the water, broken by the swell
          const path = Math.exp(-Math.abs(x + 0.5 - SUN[0]) / (3 + depth * 0.6)) * smooth(0.35, 0.9, crest * 0.8 + chop * 0.4);
          cr += path * 0.9, cg += path * 0.62, cb += path * 0.36;
          // foam: white where the water meets the rock, sliding in and out
          let foam = 0;
          for (const off of [1, 2, 3]) {
            const kk = k - off * W;
            if (kk >= 0 && mat[kk] === ROCK) foam = Math.max(foam, 1 - off / 4);
            const kl = k + off, kr = k - off;
            if (kl < N && mat[kl] === ROCK) foam = Math.max(foam, 1 - off / 4);
            if (kr >= 0 && mat[kr] === ROCK) foam = Math.max(foam, 1 - off / 4);
          }
          if (foam > 0) {
            const swash = 0.5 + 0.5 * Math.sin(ph * 4 - x * 0.2);
            const f = foam * swash * smooth(0.25, 0.7, noise(x * 0.4 + Math.cos(ph) * 2, y * 0.6 + Math.sin(ph) * 2));
            cr = mix(cr, 0.92, f), cg = mix(cg, 0.86, f), cb = mix(cb, 0.84, f);
          }
          // a band of foam rolling in across the near water
          const roll = smooth(0.82, 0.98, Math.sin(depth * 0.18 - ph * 2) * 0.5 + 0.5) * smooth(SEA + 18, H, y) * smooth(0.4, 0.75, chop);
          cr = mix(cr, 0.8, roll * 0.7), cg = mix(cg, 0.74, roll * 0.7), cb = mix(cb, 0.74, roll * 0.7);
          void z;
        }
        const sp = spray[k];
        if (sp > 0) {
          // spray: white, warmed by the sunrise behind it
          const a = Math.min(1, sp);
          cr = mix(cr, 0.98, a), cg = mix(cg, 0.94, a), cb = mix(cb, 0.92, a);
          fl = Math.max(fl, 0.2 * a);
        }

        cr = tone[Math.min(1024, (cr * 256) | 0)], cg = tone[Math.min(1024, (cg * 256) | 0)], cb = tone[Math.min(1024, (cb * 256) | 0)];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.02);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }

    // a rag of sail still on the yard, snapping in the wind
    for (let j = 0; j < 9; j++)
      for (let i = 0; i < 7; i++) {
        const flap = Math.sin(ph * 6 + j * 0.6 + i * 0.4) * 1.2 * (j / 9);
        const [wx, wy] = toWorld(-2 + i * 2 + flap * 0.4, 32 - i * 0.9 - j * 1.1 + flap);
        if (noise(i * 0.7 + 3, j * 0.6) > 0.7) continue;
        const x = Math.round(wx), r = Math.round(wy);
        if (x < 0 || x >= W || r < 0 || r >= H) continue;
        const k = r * W + x;
        out[k] = "•";
        if (color) color[k] = nearest(0.42, 0.3, 0.32);
      }
    // the gulls: dark wings against the sky, flapping
    for (const [gx, gy, rad, gp, laps] of gulls) {
      const a = ph * laps + gp;
      const x = Math.round(gx + Math.cos(a) * rad), r = Math.round(gy + Math.sin(a) * rad * 0.35);
      const up = Math.sin(ph * 17 + gp * 5) > 0; // 17 wingbeats a loop
      const cells = up ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] : [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]];
      for (const [dx, dy] of cells) {
        const xx = x + dx, rr = r + dy;
        if (xx < 0 || xx >= W || rr < 0 || rr >= SEA) continue;
        const k = rr * W + xx;
        out[k] = dx === 0 ? "●" : "•";
        if (color) color[k] = nearest(0.9, 0.86, 0.85);
      }
    }
    const rows: string[] = [];
    for (let r = 0; r < H; r++) rows.push(out.slice(r * W, (r + 1) * W).join(""));
    return rows.join("\n");
  };
}
