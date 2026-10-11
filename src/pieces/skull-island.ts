/*
 * skull island: a sea cliff whose face is a giant skull, two caves for eyes,
 * a cleft for a nose and a jagged cave for a mouth at the waterline, under a
 * full moon. A thin waterfall spills from one eye, a ship rides at anchor
 * with a lantern lit at her stern, and moonlight glitters on the sea. Mist
 * drifts along the foot of the cliff, the falls pour, the sea shimmers.
 *
 * The cliff is a dome of rock, lit by the moon from its normal and roughened
 * with noise, its caves cut into it. Shaded in colour cell by cell, then
 * drawn as a halftone: each cell is a dot sized by its brightness,
 * ordered-dithered, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "skull island",
  category: "scenes",
  note: "a sea cliff shaped like a skull under a full moon, a ship at anchor",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#03050c",
  palette: [
    // night sky, deep to low
    "#070b1c", "#0c1228", "#121a36", "#1a2446", "#243056", "#2f3d66",
    // moon and moonlight
    "#fff8e6", "#f4ead0", "#e2dcc4", "#c9c8bc", "#aeb6c0", "#8f9cb0",
    // rock, moonlit to deep shadow
    "#d0cdc2", "#b3b0a6", "#96948c", "#7a7a76", "#62645f", "#4c4f4d", "#3a3d3e", "#2a2d31", "#1d2025", "#14161b",
    // cave mouths, black-blue
    "#0a0c12", "#06070b",
    // sea, moonlit to deep
    "#2c4566", "#22385a", "#1a2c4a", "#13223a", "#0e1a2e", "#0a1322",
    // glitter and foam
    "#dfe8f2", "#b8c8dc", "#90a8c4", "#6f8cb0",
    // mist
    "#5a6a84", "#7a8aa2", "#9aa8bc",
    // lantern light
    "#ffe2a0", "#ffc266", "#f29a3e", "#c66a2a", "#8a4420",
    // hull and spars
    "#1a1512", "#2a211a", "#3a2e24",
    // waterfall
    "#cfe0ec", "#a6bcd2", "#7e98b4",
  ],
} satisfies Meta;

const W = 200, H = 100;
const SEA = 66; // the horizon and the waterline
const MOON = [162, 17];
const CX = 90, CY = 38; // the skull's dome
const RX = 44, RY = 34;
const EYES = [[75, 37], [105, 37]];
const FALL = 75; // the waterfall leaves the left eye
const SHIP = 168; // the ship's stern, where the lantern hangs
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, ROCK = 1, CAVE = 2, WATER = 3, HULL = 4, LAMP = 5, FALLS = 6;

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

// How far into the skull's rock a point is: above 0 inside, with the dome
// widening into cheeks and a jaw that meets the sea, its rim broken by noise.
function cliff(x: number, y: number): number {
  const dx = (x - CX) / RX, dy = (y - CY) / RY;
  let d = 1 - Math.sqrt(dx * dx + dy * dy * (y > CY ? 0.55 : 1));
  // the cheeks and jaw: below the eyes the face keeps its width down to the water
  if (y > CY) d = Math.max(d, 0.9 - Math.abs(x - CX) / (RX * (0.86 - 0.12 * (y - CY) / (SEA - CY))));
  // shoulders of lower rock to either side, running out into the sea
  const shoulder = SEA - 2 - 7 * Math.exp(-Math.pow((Math.abs(x - CX) - RX + 2) / 10, 2)) - 2.5 * fbm(x * 0.08, 7, 3);
  if (y > shoulder && Math.abs(x - CX) < RX + 16) d = Math.max(d, 0.05 + (y - shoulder) * 0.02);
  return d + (fbm(x * 0.09, y * 0.09, 4) - 0.5) * 0.1;
}

// The caves cut into the face: 1 deep inside, 0 outside, with a soft rim.
function cave(x: number, y: number): number {
  let c = 0;
  for (const [ex, ey] of EYES) {
    const dx = (x - ex) / 9.5, dy = (y - ey) / 8.5;
    // a heavy brow above each socket
    const r = Math.sqrt(dx * dx + dy * dy * (y < ey ? 1.25 : 0.9));
    c = Math.max(c, smooth(1.02, 0.78, r + (fbm(x * 0.3, y * 0.3, 2) - 0.5) * 0.18));
  }
  // the nose: an inverted heart of two notches
  const ny = y - 50;
  if (ny > -7 && ny < 4) {
    // a pear-shaped hole, narrow at the bridge and split by a ridge at its foot
    const w = 1.6 + (ny + 7) * 0.62 - Math.max(0, ny + 0.5) * 1.1;
    const nx = Math.abs(x - CX);
    if (nx < w && !(nx < 0.7 && ny > 0)) c = Math.max(c, smooth(w, w - 1.4, nx) * smooth(-6, -4.5, ny));
  }
  // the mouth: a grin of teeth, upper and lower rows, the dark between them cave
  const mx = x - CX, half = 23 - Math.max(0, y - 58) * 0.8;
  if (y > 53 && y < 63 && Math.abs(mx) < half) {
    const e = Math.abs(mx) / half;
    const lip = 54 + 2.2 * e * e; // the grin curls up at its corners
    const gap = Math.abs(((mx / 4.4) % 1 + 1.5) % 1 - 0.5) * 4.4; // distance to the nearest gap between teeth
    const bite = Math.abs(y - (58.3 + 1.6 * e * e)); // the line where the rows meet
    let g = 0;
    if (y < lip + 0.8 || y > 61.6 - e * 1.5) g = 1; // above and below the rows
    else if (gap < 0.55 || bite < 0.6) g = 1;
    c = Math.max(c, g * smooth(1, 0.9, e));
  }
  return c;
}

// The ship at anchor, side on, bow to the left: 1 hull, 2 spars, 3 a lit stern light.
function ship(x: number, y: number): number {
  const sx = x - SHIP;
  // hull: low, with a raised stern castle at the right
  if (y > 59.5 && y < SEA + 0.4) {
    const deck = sx > 9 ? 57 : 59.5;
    if (y > deck && sx > -16 + (SEA - y) * 0.9 && sx < 13 - (SEA - y) * 0.4) return 1;
  }
  if (sx > 9 && sx < 13 && y > 56.5 && y < 60) return sx > 11 && y > 57.5 && y < 59 ? 3 : 1;
  // masts and furled yards
  for (const [mx, top] of [[-6, 38], [3, 41]]) {
    if (Math.abs(sx - mx) < 0.6 && y > top && y < 60) return 2;
    for (const yy of [top + 4, top + 9, top + 14]) {
      const half = 6 - (yy - top) * 0.12;
      if (Math.abs(y - yy) < 0.6 && Math.abs(sx - mx) < half) return 2;
    }
  }
  // bowsprit and the forestay
  if (sx < -14 && sx > -24 && Math.abs(y - (59 - (-14 - sx) * 0.35)) < 0.6) return 2;
  return 0;
}

export default function skullIsland(): Frame {
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
  const glow = new Float32Array(N); // the lantern's light

  // the moon's direction, for lighting the rock: up and to the right, a little toward us
  const L = [0.62, -0.5, 0.6];
  const ll = Math.hypot(L[0], L[1], L[2]);
  L[0] /= ll, L[1] /= ll, L[2] /= ll;

  const lantern = [SHIP + 12.5, 57.5];

  for (let r = 0; r < H; r++) {
    const y = r + 0.5;
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const px = x + 0.5;
      const ld = Math.hypot(px - lantern[0], (y - lantern[1]) * 1.2);
      glow[k] = Math.exp(-ld / 2.2) * 0.8 + Math.exp(-ld / 9) * 0.12;

      if (y >= SEA) {
        mat[k] = WATER;
        continue;
      }
      const sh = ship(px, y);
      if (sh) {
        mat[k] = sh === 3 ? LAMP : HULL;
        // black against the moonlit haze, only the rail catching a little light
        const c = sh === 2 ? 0.02 : ship(px, y - 1) ? 0.02 : 0.14;
        (R[k] = c * 0.95), (G[k] = c * 0.95), (B[k] = c * 1.05), (floorA[k] = 0);
        continue;
      }
      const d = cliff(px, y);
      if (d > 0) {
        const cv = cave(px, y);
        // the dome's normal, from its shape and the texture of the rock
        const e = 0.6;
        const gx = (cliff(px + e, y) - cliff(px - e, y)) / (2 * e);
        const gy = (cliff(px, y + e) - cliff(px, y - e)) / (2 * e);
        let nx = -gx * 9, ny = -gy * 9, nz = 1;
        const nl = Math.hypot(nx, ny, nz);
        (nx /= nl), (ny /= nl), (nz /= nl);
        let lit = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        // strata and cracks
        const grain = fbm(px * 0.22, y * 0.6, 3);
        const crack = smooth(0.06, 0.0, Math.abs(fbm(px * 0.07 + 5, y * 0.05, 3) - 0.5));
        lit *= 0.78 + 0.36 * grain - 0.25 * crack;
        // the rim of the rock catches the moon
        lit += smooth(0.06, 0.0, d) * 0.25;
        // deeper into a cave, darker, and a shadow round each mouth
        const near = Math.max(cave(px + 2, y + 1.5), cave(px - 2, y + 1.5), cave(px, y + 3));
        lit *= (1 - 0.95 * cv) * (1 - 0.35 * near * (1 - cv));
        const v = clamp(lit) * 0.82;
        (R[k] = v * 0.95 + 0.02), (G[k] = v * 0.94 + 0.022), (B[k] = v * 0.9 + 0.035);
        mat[k] = cv > 0.6 ? CAVE : ROCK;
        floorA[k] = cv > 0.6 ? 0 : 0.04;
        continue;
      }
      // sky: deep navy above, a little lighter at the horizon, the moon's halo
      mat[k] = SKY;
      const v = y / SEA;
      let cr = mix(0.025, 0.1, v * v), cg = mix(0.04, 0.13, v * v), cb = mix(0.11, 0.27, v * v);
      const dx = px - MOON[0], dy = y - MOON[1];
      const md = Math.hypot(dx, dy);
      const halo = Math.exp(-md / 6) * 0.38 + Math.exp(-md / 22) * 0.12;
      cr += halo * 0.85, cg += halo * 0.86, cb += halo * 0.95;
      // a moonlit haze low over the sea, brightest under the moon
      const haze = Math.exp(-(SEA - y) / 6) * (0.08 + 0.3 * Math.exp(-Math.abs(px - MOON[0]) / 30));
      cr += haze * 0.8, cg += haze * 0.86, cb += haze;
      // thin cloud lit from beneath by the moon
      const cl = smooth(0.55, 0.72, fbm(px * 0.025, y * 0.11, 4)) * smooth(SEA, 20, y);
      const lc = 0.14 + halo * 0.6;
      cr = mix(cr, lc, cl * 0.6), cg = mix(cg, lc * 1.02, cl * 0.6), cb = mix(cb, lc * 1.15, cl * 0.6);
      (R[k] = cr), (G[k] = cg), (B[k] = cb);
    }
  }

  // the cliff upside down, for its reflection in the sea
  const top = new Int16Array(W).fill(SEA); // the highest row of rock in each column
  for (let x = 0; x < W; x++) for (let r = 0; r < SEA; r++) if (mat[r * W + x] !== SKY) { top[x] = r; break; }

  const stars: [number, number, number][] = [];
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(hash(i, 21) * W), r = Math.floor(Math.pow(hash(i, 22), 1.4) * (SEA - 8));
    const k = r * W + x;
    if (mat[k] !== SKY || Math.hypot(x - MOON[0], r - MOON[1]) < 16) continue;
    stars.push([k, hash(i, 23) * 6.28, 0.6 + hash(i, 24) * 2]);
  }

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  // mist, as a band of noise that scrolls along the foot of the cliff
  const MW = 400, M0 = SEA - 16, M1 = SEA + 6;
  const mist = new Float32Array((M1 - M0) * MW);
  for (let r = M0; r < M1; r++)
    for (let x = 0; x < MW; x++) {
      // tileable along x: blend the noise with its copy one period on
      const f = x / MW, a = fbm(x * 0.03, r * 0.16, 4), b = fbm((x - MW) * 0.03, r * 0.16, 4);
      const n = a * (1 - f) + b * f;
      const band = Math.exp(-Math.pow((r - (SEA - 3)) / 6, 2));
      mist[(r - M0) * MW + x] = smooth(0.42, 0.7, n) * band;
    }

  const LOOP = 20; // seconds for the mist and the sea to come round again

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, phase = (u / LOOP) * Math.PI * 2;
    const flick = 0.85 + 0.08 * Math.sin(t * 6.1) + 0.07 * Math.sin(t * 13.7 + 1);
    const mdrift = (u / LOOP) * MW;

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k];
        let cr = R[k], cg = G[k], cb = B[k], fl = floorA[k];
        if (m === WATER) {
          const depth = (y - SEA) / (H - SEA);
          // swells: long rolls moving toward us, broken by a finer chop
          const roll = Math.sin(y * 0.9 - phase * 3 + Math.sin(x * 0.05 + phase) * 1.2);
          const chop = noise(x * 0.18 + Math.cos(phase) * 3, y * 0.9 - phase * 4);
          const w = 0.5 + 0.28 * roll + 0.4 * (chop - 0.5);
          cr = mix(0.06, 0.03, depth), cg = mix(0.11, 0.06, depth), cb = mix(0.2, 0.12, depth);
          // the cliff's dark reflection, wobbling
          const sx = Math.max(0, Math.min(W - 1, Math.round(x + (w - 0.5) * 3)));
          const rr = SEA - (y - SEA) * 1.15;
          if (rr > top[sx] && rr < SEA) {
            const j = Math.max(0, Math.min(SEA - 1, Math.round(rr))) * W + sx;
            const a = 0.75 - depth * 0.3;
            cr = mix(cr, R[j] * 0.45, a), cg = mix(cg, G[j] * 0.45, a), cb = mix(cb, B[j] * 0.5, a);
          }
          // the moon's path: a column of glitter widening toward us
          const path = Math.exp(-Math.abs(x + 0.5 - MOON[0]) / (2 + depth * 14));
          const glit = smooth(0.62, 0.86, w) * path * 1.5 + smooth(0.8, 0.95, w) * 0.05;
          cr += glit * 0.86, cg += glit * 0.9, cb += glit;
          // the lantern streaked on the water under the ship
          const ls = Math.exp(-Math.abs(x + 0.5 - lantern[0]) / (1.2 + depth * 3)) * smooth(0.5, 0.85, w) * smooth(SEA + 22, SEA, y);
          cr += ls * 0.9 * flick, cg += ls * 0.55 * flick, cb += ls * 0.2 * flick;
          // foam where the sea meets the rock, and at the foot of the falls
          const foot = Math.abs(x + 0.5 - FALL) < 6 && y < SEA + 3 ? smooth(6, 0, Math.abs(x + 0.5 - FALL)) * smooth(SEA + 3, SEA, y) : 0;
          const lap = top[x] < SEA - 1 && y < SEA + 1.5 ? smooth(0.4, 0.8, w) * 0.5 : 0;
          const f = Math.max(foot * (0.6 + 0.4 * chop), lap);
          cr = mix(cr, 0.82, f), cg = mix(cg, 0.88, f), cb = mix(cb, 0.94, f);
          fl = 0.02;
        }
        // the waterfall: from the lip of the left eye to the sea, streaming down
        if (y > EYES[0][1] + 6 && y < SEA && Math.abs(x + 0.5 - FALL - (y - 44) * 0.04) < 1.6) {
          const s = noise((x + 0.5) * 1.3, y * 0.35 - t * 6);
          const edge = 1 - Math.abs(x + 0.5 - FALL - (y - 44) * 0.04) / 1.6;
          const v = (0.5 + 0.5 * s) * (0.55 + 0.45 * edge);
          cr = mix(cr, 0.78, v), cg = mix(cg, 0.86, v), cb = mix(cb, 0.94, v);
          fl = 0.1;
        }
        // mist along the foot of the cliff
        if (r >= M0 && r < M1) {
          const sx = x + mdrift, ix = Math.floor(sx) % MW, fx = sx - Math.floor(sx);
          const i0 = (r - M0) * MW + ix, i1 = (r - M0) * MW + ((ix + 1) % MW);
          const a = (mist[i0] + (mist[i1] - mist[i0]) * fx) * 0.55;
          if (a > 0.01) (cr = mix(cr, 0.4, a)), (cg = mix(cg, 0.46, a)), (cb = mix(cb, 0.58, a));
        }
        // lamplight
        const g = glow[k] * flick;
        if (m === LAMP) (cr = 1), (cg = 0.78 * flick), (cb = 0.4 * flick);
        else if (g > 0.01) (cr += g * 0.9), (cg += g * 0.55), (cb += g * 0.22);

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
    // the full moon, with a few faint seas on its face
    for (let r = MOON[1] - 8; r <= MOON[1] + 8; r++)
      for (let x = MOON[0] - 8; x <= MOON[0] + 8; x++) {
        const dx = x + 0.5 - MOON[0], dy = r + 0.5 - MOON[1];
        if (dx * dx + dy * dy >= 7.2 * 7.2) continue;
        const k = r * W + x;
        const mare = fbm(x * 0.35 + 3, r * 0.35, 3) > 0.58;
        out[k] = "●";
        if (color) color[k] = nearest(mare ? 0.86 : 1, mare ? 0.85 : 0.97, mare ? 0.8 : 0.9);
      }
    for (const [k, ph, sp] of stars) {
      const s = Math.sin(t * sp + ph);
      if (s > -0.4 && out[k] === " ") {
        out[k] = s > 0.75 ? "•" : "·";
        if (color) color[k] = nearest(0.85, 0.88, 1);
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
