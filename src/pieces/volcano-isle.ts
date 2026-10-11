/*
 * volcano isle: night, and a steep island in eruption. A fountain of lava
 * stands in the crater and throws sparks that arc out and fall on the cone, a
 * column of smoke and ash rolls up and leans away on the wind, lit orange
 * from beneath, and three rivers of lava run down the black flanks to the sea,
 * where they go into the water in clouds of pale steam. The sea in front
 * gives the whole glow back in broken red and gold, and a small ship lies at
 * anchor in it, black, one lantern at her stern.
 *
 * The cone is a silhouette with the rivers laid on it as paths, bright pulses
 * travelling down them; smoke and steam are noise rolling through a shape.
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "volcano isle",
  category: "scenes",
  note: "an island volcano erupting at night, lava running to the sea",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#06040a",
  palette: [
    // night, black to deep maroon
    "#0a060c", "#14080e", "#200a12", "#300c16", "#44101a", "#5c1420",
    // lava and fire, red through orange to yellow-white
    "#7a1810", "#9c2010", "#be2c10", "#dc4012", "#ee5c18", "#f87c22", "#fd9c30", "#ffbc48", "#ffd868", "#ffec98",
    "#fff8d0",
    // smoke and ash, cool grey-violet
    "#1e1a28", "#2c2638", "#3c344a", "#4e445e", "#625874", "#7a708c",
    // smoke lit from beneath
    "#4a2a26", "#6c3826", "#904a28", "#b8602c",
    // steam, pale, and warm where the lava lights it
    "#8a82a0", "#a8a0ba", "#c8c0d4", "#e6e0ec", "#f0c8b0", "#e0a088",
    // rock
    "#0c0709", "#180b0d", "#261014", "#38161a",
    // the glow on the water
    "#2a0e16", "#4a1618", "#6e2218", "#96361c",
    // the lantern
    "#ffe2a0", "#ffc266",
    // hull, and stars
    "#050308", "#c8cce6",
  ],
} satisfies Meta;

const W = 200, H = 100;
const WL = 70; // the shore and the horizon
const LOOP = 24;
const TAU = Math.PI * 2;
const CX = 108, TOP = 34; // the crater
const SCX = 80, SWL = 95;
const SC = 2; // how much larger than drawn she is // the ship, and her waterline
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, ROCK = 1, SEA = 2;

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

// lava's colour by heat: dull red, through orange and yellow, to white at its hottest
function heat(h: number): [number, number, number] {
  h = clamp(h);
  return [clamp(0.3 + h * 1.7), clamp(h * h * 1.45 + h * 0.1), clamp(Math.pow(h, 3.4) * 1.05)];
}

// The island's skyline: a steep cone, its west rim standing proud and its east rim broken down, the east flank
// running out longer over a shoulder, and a foot of broken rock at the waterline.
function isle(x: number): number {
  const dx = x - CX, d = Math.abs(dx);
  const run = dx < 0 ? 51 : 60;
  const cone = 36 * Math.pow(clamp(1 - Math.max(0, d - 5) / run), dx < 0 ? 1.0 : 1.18);
  const bowl = d < 5 ? -2.6 * (1 - (d / 5) * (d / 5)) : 0;
  const rim = dx < 0 ? 1.7 * Math.exp(-Math.pow((dx + 5.5) / 2.2, 2)) : -1.7 * smooth(0.5, 5, dx) * smooth(13, 6, dx);
  const shoulder = 8 * Math.exp(-Math.pow((x - 151) / 10, 2)) + 2.4 * smooth(-33, -29, dx) * smooth(-17, -27, dx);
  const rough = (fbm(x * 0.11, 3, 4) - 0.5) * 4 * smooth(4, 16, d);
  let h = Math.max(cone, shoulder) + rough + bowl + rim;
  // the foot: boulders and stacks standing in the shallows
  const foot = smooth(run + 22, run + 8, d) * (0.9 + 3.6 * Math.pow(noise(x * 0.42, 9), 2.2));
  if (h < 5) h = Math.max(h + 1.6 * (noise(x * 0.6, 5) - 0.35), foot);
  return h < 0.7 ? 999 : WL - h;
}

// ridges standing out of the cone's face, each lit along the side that looks up at the fountain
const RIDGES: number[][][] = [
  [[102, 38], [94, 45], [86, 52], [74, 60], [65, 67]],
  [[107, 40], [103, 48], [101, 58], [98, 68]],
  [[116, 40], [127, 47], [139, 54], [151, 60], [160, 67]],
];

// cauliflower: a field of round lobes, 1 at the crown of the nearest and 0 down in the creases between them
function lobes(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  let best = 1;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i + hash(xi + i + seed * 31, yi + j) - x, cy = yi + j + hash(xi + i, yi + j + seed * 17 + 5) - y;
      const d = cx * cx + cy * cy;
      if (d < best) best = d;
    }
  return 1 - best;
}

// the rivers of lava, each a path from the crater's lip to the shore
const RIVERS: number[][][] = [
  [[105, 35], [100, 41], [95, 48], [89, 54], [84, 61], [78, 66], [76, 71]],
  [[109, 35], [112, 42], [110, 49], [115, 56], [119, 63], [118, 71]],
  [[112, 35], [118, 42], [125, 48], [129, 55], [135, 61], [139, 66], [140, 71]],
];
const SHORE = RIVERS.map((r) => r[r.length - 1][0]);

// The ship at anchor, bow to the left, drawn at half her size: 1 timber and rope, 2 her rail.
const LAMP = [SCX + 13.5 * SC, SWL - 8 * SC];
function ship(x: number, y: number): number {
  const sx = x - SCX;
  const deck = (sx > 6 ? SWL - 6 : SWL - 4) - 0.012 * sx * sx;
  if (y > deck && y < SWL + 0.4 && sx > -12 - (SWL - y) * 0.8 && sx < 11 + (SWL - y) * 0.35) return y < deck + 0.6 ? 2 : 1;
  if (Math.abs(sx - 12.8) < 0.3 && y > SWL - 8 && y < SWL - 5) return 1;
  for (const [mx, top] of [[-5, SWL - 25], [4, SWL - 21]]) {
    if (Math.abs(sx - mx) < 0.45 && y > top && y < SWL - 3) return 1;
    for (const [yy, hw] of [[top + 4, 4.5], [top + 11, 6.5]]) if (Math.abs(y - yy) < 0.45 && Math.abs(sx - mx) < hw) return 1;
  }
  if (seg(sx, y, -13, SWL - 4.5, -22, SWL - 9) < 0.4) return 1;
  for (const [ax, ay, bx, by] of [[-5, SWL - 25, -22, SWL - 9], [4, SWL - 21, 12, SWL - 6], [-5, SWL - 25, 4, SWL - 21], [-5, SWL - 25, -10, SWL - 4], [-5, SWL - 25, -1, SWL - 4], [4, SWL - 21, 0.5, SWL - 4], [4, SWL - 21, 8, SWL - 5]])
    if (seg(sx, y, ax, ay, bx, by) < 0.22) return 1;
  // her cable, running down to the anchor
  if (seg(sx, y, -14, SWL - 3.5, -20, SWL + 0.5) < 0.25) return 1;
  return 0;
}

export default function volcanoIsle(): Frame {
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
  const glow = new Float32Array(N); // the crater's light on the air
  const lit = new Float32Array(N); // and on the rock
  const core = new Float32Array(N), along = new Float32Array(N), near = new Float32Array(N); // the rivers
  const smokeShape = new Float32Array(N);
  const boat = new Uint8Array(N);

  const top = new Float32Array(W);
  for (let x = 0; x < W; x++) top[x] = isle(x + 0.5);

  for (let r = 0; r < H; r++) {
    const y = r + 0.5;
    for (let x = 0; x < W; x++) {
      const k = r * W + x, px = x + 0.5;
      boat[k] = ship(SCX + (px - SCX) / SC, SWL - (SWL - y) / SC);
      const dx = px - CX, dy = y - (TOP - 4);
      const d = Math.sqrt(dx * dx + dy * dy * 1.2);
      glow[k] = Math.exp(-d / 12) * 0.5 + Math.exp(-(d * d) / (2 * 37 * 37)) * 0.85 + Math.exp(-d / 55) * 0.1;
      if (r >= WL) {
        mat[k] = SEA;
        continue;
      }
      if (y >= top[x]) {
        mat[k] = ROCK;
        // black rock, ribbed with old flows that run down from the crater
        const ang = Math.atan2(dx, y - TOP + 14);
        const rib = fbm(ang * 9 + 4, d * 0.05, 3);
        const tex = 0.5 * rib + 0.5 * fbm(px * 0.2, y * 0.3, 3);
        (R[k] = 0.02 + 0.03 * tex), (G[k] = 0.01 + 0.01 * tex), (B[k] = 0.016 + 0.012 * tex);
        // the skyline nearest the crater burns with its light
        const edge = y - top[x];
        lit[k] = (0.25 + 0.75 * tex) * Math.exp(-d / 12) * 0.25 + smooth(1.6, 0, edge) * Math.exp(-d / 22) * 0.9;
        // the ridges: red along the side that faces the fountain, black behind
        for (const pts of RIDGES)
          for (let j = 0; j + 1 < pts.length; j++) {
            const [ax, ay] = pts[j], [bx, by] = pts[j + 1];
            const dd = seg(px, y, ax, ay, bx, by);
            if (dd > 3.5) continue;
            const here = (bx - ax) * (y - ay) - (by - ay) * (px - ax), fire = (bx - ax) * (TOP - 12 - ay) - (by - ay) * (CX - ax);
            if (here * fire > 0) lit[k] += Math.exp(-dd / 1.3) * (0.5 + 0.5 * tex) * Math.exp(-d / 48) * 0.75;
            else if (dd < 1.6) lit[k] *= 0.3;
          }
        // the rivers
        let best = 1e9, bs = 0, br = 0, s0 = 0;
        for (let i = 0; i < RIVERS.length; i++) {
          const pts = RIVERS[i];
          s0 = 0;
          for (let j = 0; j + 1 < pts.length; j++) {
            const [ax, ay] = pts[j], [bx, by] = pts[j + 1];
            const len = Math.hypot(bx - ax, by - ay);
            // the path wanders a little, as lava finds its way
            const wx = px + (fbm(y * 0.3, i * 7, 2) - 0.5) * 3.5;
            const dd = seg(wx, y, ax, ay, bx, by);
            if (dd < best) {
              const q = clamp(((wx - ax) * (bx - ax) + (y - ay) * (by - ay)) / (len * len));
              (best = dd), (bs = s0 + q * len), (br = i);
            }
            s0 += len;
          }
        }
        const wd = 0.9 + bs * 0.036;
        core[k] = Math.exp(-(best * best) / (wd * wd));
        along[k] = bs + br * 13;
        near[k] = Math.exp(-best / 2.4) * 0.6 + Math.exp(-best / 7) * 0.1;
        continue;
      }
      mat[k] = SKY;
      // night above, the low sky a deep maroon
      const v = y / WL;
      (R[k] = mix(0.01, 0.035, v * v)), (G[k] = mix(0.007, 0.01, v * v)), (B[k] = mix(0.018, 0.024, v * v));
      // the smoke's road: up out of the crater, then leaning east on the wind and spreading
      const rise = TOP + 2 - y;
      if (rise > 0) {
        const cx = CX + 1 + rise * 0.5 + rise * rise * 0.03, wd = 5 + rise * 0.56;
        const q = (px - cx) / wd;
        smokeShape[k] = Math.max(0, 1 - q * q) * smooth(0, 3, rise);
      }
    }
  }

  // the ship's edges that look toward the volcano take a thin rim of its light
  for (let r = 1; r < H; r++)
    for (let x = 0; x < W - 1; x++) {
      const k = r * W + x;
      if (boat[k] === 1 && !boat[k + 1]) boat[k] = 3;
    }

  // stars, in the dark sky away from the eruption
  const stars: [number, number, number][] = [];
  for (let i = 0; i < 500; i++) {
    const x = Math.floor(hash(i, 91) * W), r = Math.floor(hash(i, 92) * (WL - 14));
    const k = r * W + x;
    if (mat[k] === SKY && glow[k] < 0.16 && smokeShape[k] <= 0) stars.push([k, hash(i, 94) * TAU, 1 + Math.floor(hash(i, 95) * 6)]);
  }

  // sparks: each is thrown from the crater, arcs and falls, again and again
  const sparks: { vx: number; vy: number; per: number; ph: number; hot: number }[] = [];
  for (let i = 0; i < 150; i++) {
    const a = (hash(i, 201) - 0.5) * 1.9, sp = 15 + hash(i, 202) * 16;
    sparks.push({ vx: Math.sin(a) * sp * 0.75, vy: -Math.cos(a) * sp, per: LOOP / (5 + Math.floor(hash(i, 203) * 5)), ph: hash(i, 204), hot: 0.6 + 0.4 * hash(i, 205) });
  }
  const GRAV = 15;

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  // this frame's picture above the water, kept to be mirrored in it
  const AR = new Float32Array(WL * W), AG = new Float32Array(WL * W), AB = new Float32Array(WL * W);
  const solid = new Uint8Array(WL * W); // where the smoke stands this frame

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // the fountain surges and sinks
    const surge = 0.5 + 0.3 * Math.sin((TAU * 5 * u) / LOOP) + 0.2 * Math.sin((TAU * 13 * u) / LOOP + 1);
    const pulse = 0.82 + 0.18 * surge + 0.05 * Math.sin(t * 11.3);
    const jet = 13 + 6 * surge;
    const flick = 0.85 + 0.08 * Math.sin(t * 6.1) + 0.07 * Math.sin(t * 13.7 + 1);

    solid.fill(0);
    for (let r = 0; r < WL; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k], px = x + 0.5;
        let cr = R[k], cg = G[k], cb = B[k];
        if (m === SKY) {
          // the sky lit red from below
          const g = glow[k] * pulse;
          (cr += g * 1.0), (cg += g * (0.07 + 0.3 * g)), (cb += g * 0.05);
          // smoke and ash: one column of rolling lobes, dark against the glow, hot underneath, pale-edged higher up
          const ss = smokeShape[k];
          if (ss > 0) {
            const ux = px - t * 1.3, uy = y + t * 2.3;
            const big = lobes(ux / 12, uy / 12, 1), small = lobes(ux / 5.5 + 3, uy / 5.5, 2);
            const bump = 0.62 * big + 0.38 * small;
            if (ss + (bump - 0.55) * 0.75 > 0.16) {
              // which way each lobe faces: lit where it falls away toward the crater
              const dx = px - CX, dy = y - TOP, d = Math.sqrt(dx * dx + dy * dy) + 0.01;
              const ox = (-dx / d) * 2.6, oy = (-dy / d) * 2.6 + 1;
              const toward = 0.62 * lobes((ux + ox) / 12, (uy + oy) / 12, 1) + 0.38 * lobes((ux + ox) / 5.5 + 3, (uy + oy) / 5.5, 2);
              const face = clamp(0.5 + (bump - toward) * 2.4);
              const v = 0.085 + 0.14 * bump + 0.1 * face;
              let sr = v * 0.98, sg = v * 0.86, sb = v * 1.3;
              // pale edges where the far glow finds the lobes
              const pale = face * face * smooth(0.25, 0.9, bump) * smooth(8, 30, d) * 0.3;
              (sr += pale * 0.95), (sg += pale * 0.86), (sb += pale * 1.12);
              // brown, then orange, as it nears the fire
              const brown = Math.exp(-d / 34) * pulse * (0.3 + 0.9 * face);
              (sr = mix(sr, 0.5, clamp(brown))), (sg = mix(sg, 0.24, clamp(brown))), (sb = mix(sb, 0.13, clamp(brown)));
              const hot = clamp(Math.exp(-d / 13) * 1.5 * pulse * (0.25 + 0.95 * face));
              (sr = mix(sr, 1.0, hot)), (sg = mix(sg, 0.46, hot)), (sb = mix(sb, 0.1, hot));
              (cr = sr), (cg = sg), (cb = sb);
              solid[k] = 1;
            }
          }
          // the fountain: a jet of fire standing in the crater, tongues tearing off its top
          const up = TOP + 1 - y;
          if (up > -1 && up < jet + 6 && Math.abs(px - CX) < 14) {
            const rel = up / jet;
            const wd = 2.4 + 4.2 * clamp(rel);
            const n = fbm(px * 0.28, y * 0.2 + t * 7, 3);
            const body = Math.exp(-Math.pow((px - CX + (n - 0.5) * 5 * rel) / wd, 2)) * (1.15 - Math.pow(clamp(rel), 1.6)) * smooth(1.25, 0.8, rel + (0.5 - n) * 0.7);
            const f = body * (0.6 + 0.8 * n);
            if (f > 0.03) {
              const [hr, hg, hb] = heat(f * 0.95);
              const a = smooth(0.03, 0.3, f);
              (cr = mix(cr, hr * 1.2, a)), (cg = mix(cg, hg * 1.2, a)), (cb = mix(cb, hb * 1.2, a));
              if (a > 0.4) solid[k] = 0;
            }
          }
        } else {
          // rock, in the light of the crater and of the rivers
          const l = lit[k] * pulse;
          (cr += l * 1.0), (cg += l * 0.3), (cb += l * 0.07);
          const c = core[k];
          // bright pulses travel down each river, and a darker crust rides between them
          const s = along[k];
          const wave = 0.5 + 0.5 * Math.sin(s * 0.42 - t * 2.8);
          const crust = noise(s * 0.55 - t * 1.6, 3.5);
          const run = 0.52 + 0.4 * wave * wave + 0.22 * (crust - 0.5);
          const ng = near[k] * (0.7 + 0.3 * wave);
          (cr += ng * 0.85), (cg += ng * 0.2), (cb += ng * 0.04);
          if (c > 0.03) {
            const [hr, hg, hb] = heat(c * run * 1.12);
            const a = smooth(0.03, 0.35, c);
            (cr = mix(cr, hr * 1.15, a)), (cg = mix(cg, hg * 1.15, a)), (cb = mix(cb, hb * 1.15, a));
          }
        }
        // steam, where each river goes into the sea
        if (r > WL - 13) {
          const rise = WL - y;
          for (let i = 0; i < SHORE.length; i++) {
            const dx = px - SHORE[i] - rise * 0.25;
            if (dx < -20 || dx > 20) continue;
            const n = fbm(px * 0.16 + i * 5 - t * 0.5, y * 0.24 + t * 1.2, 3);
            const wd = 7.5 + rise * 0.2;
            const dens = Math.exp(-(dx * dx) / (wd * wd)) * Math.exp(-rise / 4.6) * (1.3 + (n - 0.5) * 2.6);
            const a = smooth(0.3, 0.5, dens) * 0.95;
            if (a > 0.01) {
              const warm = Math.exp(-rise / 3.2) * (0.6 + 0.4 * Math.sin(t * 2.8 + i));
              const b = 0.7 + 0.75 * n;
              (cr = mix(cr, mix(0.62 * b, 1.1, warm), a)), (cg = mix(cg, mix(0.58 * b, 0.62, warm), a)), (cb = mix(cb, mix(0.74 * b, 0.3, warm), a));
            }
          }
        }
        (AR[k] = cr), (AG[k] = cg), (AB[k] = cb);
      }
    }

    // sparks, each with a short tail along its arc
    for (const sp of sparks) {
      const age = ((u / sp.per + sp.ph) % 1) * sp.per;
      for (let i = 0; i < 3; i++) {
        const a = age - i * 0.07;
        if (a < 0) break;
        const x = Math.round(CX - 0.5 + sp.vx * a), yy = TOP - 1 + sp.vy * a + 0.5 * GRAV * a * a;
        const r = Math.round(yy);
        if (x < 0 || x >= W || r < 0 || r >= WL) break;
        // it dies where it lands on the cone
        if (yy > top[x] + 1.5 && a > 0.4) break;
        const k = r * W + x;
        const b = sp.hot * (1 - 0.22 * a) * (1 - i * 0.28);
        if (b < 0.1) break;
        const [hr, hg, hb] = heat(0.25 + 0.75 * b);
        (AR[k] = Math.max(AR[k], hr * 1.3)), (AG[k] = Math.max(AG[k], hg * 1.3)), (AB[k] = Math.max(AB[k], hb * 1.3));
        solid[k] = 0;
      }
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let cr: number, cg: number, cb: number, fl = 0.02;
        if (r < WL) {
          (cr = AR[k]), (cg = AG[k]), (cb = AB[k]);
          if (mat[k] === ROCK) fl = 0;
        } else {
          // the sea: everything above, upside down, broken by ripples into red and gold
          const depth = (y - WL) / (H - WL);
          const w = noise(x * 0.12 + t * 0.15, y * 1.2 - t * 0.7);
          const wob = Math.sin(y * 1.9 - t * 1.6 + Math.sin(x * 0.11 + t * 0.5) * 1.3) * (0.2 + 1.6 * depth);
          let sx = Math.round(x + wob);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          let sr = Math.round(WL - 1 - (r - WL) * 1.7 + (w - 0.5) * 5 * depth);
          sr = sr < 0 ? 0 : sr > WL - 1 ? WL - 1 : sr;
          const j = sr * W + sx;
          const face = smooth(0.2, 0.62, w);
          const keep = mix(0.3, 1.1, face) * mix(1, 0.75, depth);
          (cr = AR[j] * keep + 0.014), (cg = AG[j] * keep + 0.006), (cb = AB[j] * keep + 0.016);
          // the eruption's road of light on the water, and the glare where each river goes in
          const road = Math.exp(-Math.abs(x + 0.5 - CX) / (26 + depth * 44)) * (0.15 + 0.85 * smooth(0.4, 0.75, w)) * 0.85 * pulse;
          (cr += road), (cg += road * 0.42), (cb += road * 0.08);
          for (let i = 0; i < SHORE.length; i++) {
            const dx = Math.abs(x + 0.5 - SHORE[i]) / (1.5 + (y - WL) * 0.35);
            const g = Math.exp(-dx) * Math.exp(-(y - WL) / 7) * (0.4 + 0.6 * face) * 0.9;
            (cr += g), (cg += g * 0.55), (cb += g * 0.12);
          }
          // the ship's own dark shape under her
          const my = 2 * SWL - y + 0.5, mx = x + wob * 0.6;
          if (my > 0 && y > SWL && boat[Math.floor(my) * W + Math.max(0, Math.min(W - 1, Math.round(mx)))] && w < 0.72) (cr *= 0.2), (cg *= 0.2), (cb *= 0.3);
          // the lantern, a broken streak
          const ld = Math.abs(x + 0.5 - LAMP[0]) / (1 + (y - SWL) * 0.12);
          if (y > SWL) {
            const st = Math.exp(-ld / 1.2) * smooth(SWL + 12, SWL + 1, y) * smooth(0.3, 0.7, w) * flick;
            (cr += st), (cg += st * 0.75), (cb += st * 0.4);
          }
        }
        // the ship, black against the burning water
        const b = boat[k];
        if (b) {
          if (b === 3) (cr = 0.6 * pulse), (cg = 0.17 * pulse), (cb = 0.04);
          else if (b === 2) (cr = 0.5 * pulse), (cg = 0.13 * pulse), (cb = 0.03);
          else (cr = 0.016), (cg = 0.01), (cb = 0.018);
          fl = 0;
        }
        // lamplight
        const ldx = x + 0.5 - LAMP[0], ldy = y - LAMP[1], ld2 = ldx * ldx + ldy * ldy;
        if (ld2 < 90) {
          const lg = (Math.exp(-ld2 / 2.6) * 1.8 + Math.exp(-Math.sqrt(ld2) / 2.8) * 0.35) * flick;
          (cr += lg), (cg += lg * 0.8), (cb += lg * 0.45);
        }

        cr = tone[Math.min(1024, (cr * 256) | 0)], cg = tone[Math.min(1024, (cg * 256) | 0)], cb = tone[Math.min(1024, (cb * 256) | 0)];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.05);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (r < WL && solid[k] && !b) {
          // smoke is solid: every dot full, its colour carrying the light and the dark
          const d = dith[k] * 0.05;
          out[k] = "●";
          if (color) color[k] = nearest(clamp(cr + d), clamp(cg + d * 0.9), clamp(cb + d));
        } else if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }

    // a few stars where the sky is still dark
    for (const [k, p0, sp] of stars) {
      const s = Math.sin((TAU * sp * u) / LOOP + p0);
      if (s > -0.3 && out[k] === " ") {
        out[k] = s > 0.75 ? "•" : "·";
        if (color) color[k] = nearest(0.78, 0.8, 0.9);
      }
    }

    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
