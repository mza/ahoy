/*
 * storm at sea: a galleon climbing the face of a towering wave in a night
 * storm. Her torn sails strain, spray tears off the crest above her, rain
 * drives across, and now and then lightning floods the scene, lights the
 * clouds from within and shows the ship for an instant before the dark comes
 * back.
 *
 * The sea is a profile, the big wave and the swells behind it, shaded by its
 * slope and streaked with foam that runs down its face. The ship is drawn in
 * her own frame and turned to the slope she climbs. Shaded in colour cell by
 * cell, then drawn as a halftone: each cell is a dot sized by its brightness,
 * ordered-dithered, in the palette colour nearest its hue.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "storm at sea",
  category: "scenes",
  note: "a galleon climbing a huge wave in a night storm, lit by lightning",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#030507",
  palette: [
    // storm sky, black to slate
    "#05080c", "#0a0f16", "#101822", "#18222e", "#202c3a", "#2a3848", "#364558",
    // cloud lit by lightning, violet to white
    "#4a5470", "#646c8c", "#8288aa", "#a4a8c8", "#c8cae2", "#e8eaf8", "#ffffff",
    // the bolt
    "#d8f0ff", "#b0dcff",
    // sea, black-green to grey-green
    "#03100f", "#071a19", "#0c2524", "#123230", "#1a403d", "#24504c", "#2f615c", "#3d746e",
    // foam and spray
    "#5e8a84", "#82a8a2", "#a8c6c0", "#cfe2dc", "#eef6f2",
    // the ship: hull and timber
    "#140e0a", "#22180f", "#342518", "#4a3522", "#634a30",
    // sails, dark to lit
    "#3a3630", "#5c564a", "#8a8270", "#b8ae94", "#e0d6bc",
    // lantern
    "#ffd890", "#f4a850", "#c06a2a",
    // rain
    "#7890a8", "#98aec4",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HORIZON = 46;
const SCALE = 1.35; // the ship's size, in cells to her own units
const MOON = [70, 16]; // behind the clouds, over the ship, so she stands out against its glow
const LOOP = 8; // seconds for the storm to come round again
const CREST = 120, PEAK = 26; // the big wave's crest
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
// lightning: when it strikes in the loop, and how bright
const FLASHES: [number, number, number][] = [[0, 1, 0.5], [0.2, 0.8, 0.35], [3.6, 0.45, 0.25], [5.9, 0.9, 0.4], [6.1, 0.6, 0.3]];

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

// The big wave's surface: its face steep toward the left where the ship climbs, its back long to the right.
const wave = (x: number, t: number) => {
  const d = x - CREST;
  const w = d < 0 ? 30 : 46;
  const base = d < 0 ? 78 : 66;
  const swell = 1.2 * Math.sin(x * 0.11 - t * 2.4) + 0.6 * Math.sin(x * 0.27 + t * 1.7);
  return base - (base - PEAK) * Math.exp(-(d / w) * (d / w)) + swell * (1 - Math.exp(-(d / 40) * (d / 40)) * 0.8);
};

// The ship in her own frame, bow toward +u, keel at v = 0: 1 hull, 2 rail, 3 mast and spars, 4 sail, 5 lantern.
function ship(u: number, v: number, t: number): number {
  // hull: a long body, rising to a high stern castle at the back and a beak at the bow
  const sheer = u < -14 ? 9.5 : 6.5 + 0.8 * Math.max(0, u - 14) * 0.25;
  const keel = 0.6 * Math.abs(u) * Math.abs(u) / 400;
  if (u > -22 && u < 22 && v > keel && v < sheer) {
    if (u < -21 + (sheer - v) * 0.15 || u > 21 - (v - keel) * 0.8) return 0;
    if (v > sheer - 0.9) return 2;
    if (u < -18 && u > -20 && v > 6.8 && v < 8.4) return 5;
    return 1;
  }
  // bowsprit
  if (u > 20 && u < 33 && Math.abs(v - (6.5 + (u - 20) * 0.32)) < 0.55) return 3;
  // three masts, the main the tallest
  const masts: [number, number][] = [[-12, 26], [0, 33], [11, 28]];
  for (const [mu, top] of masts) {
    if (Math.abs(u - mu) < 0.55 && v > 5 && v < top) return 3;
    // sails: two on each, bellied forward and torn at the foot
    for (let i = 0; i < 2; i++) {
      const s0 = top - 3 - i * 11, s1 = s0 - 9;
      if (v < s0 && v > s1) {
        const k = (s0 - v) / 9; // 0 at the yard, 1 at the foot
        const half = 6.5 - i * -0.6 - top * 0.05;
        const belly = 1.8 * Math.sin(k * Math.PI) * (0.85 + 0.15 * Math.sin(t * 5 + mu));
        const du = u - mu - belly;
        if (Math.abs(du) < half) {
          // ragged rents: some cells near the foot torn away
          if (k > 0.6 && hash(Math.floor(u * 1.3) + 40, i + mu) < (k - 0.6) * 2.2) return 0;
          if (hash(Math.floor(u * 0.7) + mu * 3, Math.floor(v * 0.7) + i) < 0.06) return 0;
          return Math.abs(v - s0) < 0.6 ? 3 : 4;
        }
      }
    }
  }
  // stays from the mastheads to the bow and stern
  const stay = (au: number, av: number, bu: number, bv: number) => {
    const du = bu - au, dv = bv - av, k = clamp(((u - au) * du + (v - av) * dv) / (du * du + dv * dv));
    return Math.hypot(au + du * k - u, av + dv * k - v) < 0.4;
  };
  if (stay(11, 28, 32, 10.3) || stay(0, 33, 11, 28) || stay(-12, 26, 0, 33) || stay(-12, 26, -21, 9.5)) return 3;
  return 0;
}

export default function stormAtSea(): Frame {
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

  // clouds: a band of density, tiled along x so it can drift and come round
  const CW = 400;
  const cloud = new Float32Array(HORIZON * CW), cloudLit = new Float32Array(HORIZON * CW);
  for (let r = 0; r < HORIZON; r++)
    for (let x = 0; x < CW; x++) {
      const f = x / CW;
      const a = fbm(x * 0.022, r * 0.06, 5), b = fbm((x - CW) * 0.022, r * 0.06, 5);
      const d = a * (1 - f) + b * f;
      cloud[r * CW + x] = smooth(0.32, 0.7, d) * (0.6 + 0.4 * smooth(HORIZON, 0, r));
      // the part lightning lights from within: the cloud's thick billows
      cloudLit[r * CW + x] = smooth(0.5, 0.75, d);
    }

  // the bolt: a jagged path from the cloud to the sea, with a short fork
  const bolt = new Float32Array(N);
  const strike = (x: number, y: number, y1: number, drift: number, seed: number, width: number) => {
    let px = x;
    for (let r = Math.floor(y); r < y1; r++) {
      px += (hash(r, seed) - 0.5) * 3.2 + drift;
      for (let dx = -2; dx <= 2; dx++) {
        const c = Math.round(px) + dx;
        if (c < 0 || c >= W || r < 0 || r >= H) continue;
        const v = Math.exp(-Math.abs(c - px) / width);
        bolt[r * W + c] = Math.max(bolt[r * W + c], v);
      }
    }
    return px;
  };
  strike(160, 4, HORIZON + 4, 0.3, 5, 0.42);
  strike(165, 22, 36, 0.9, 9, 0.35);

  // rain: streaks falling down and to the left
  const drops: [number, number, number][] = [];
  for (let i = 0; i < 420; i++) drops.push([hash(i, 1) * W, hash(i, 2) * H, 0.8 + hash(i, 3) * 0.5]);

  // spray torn off the crest, blown back over the ship
  const spray: [number, number, number, number][] = [];
  for (let i = 0; i < 160; i++) spray.push([hash(i, 11), hash(i, 12), hash(i, 13), hash(i, 14)]);

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N), F = new Float32Array(N);
  const surf = new Float32Array(W);
  const kind = new Uint8Array(N);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, phase = (u / LOOP) * Math.PI * 2;
    let flash = 0;
    for (const [at, peak, len] of FLASHES) {
      const d = u - at;
      if (d >= 0 && d < len * 4) flash = Math.max(flash, peak * Math.exp(-d / len) * (at > 0 && d < 0.05 ? d / 0.05 : 1));
    }
    const boltOn = flash > 0.45 ? smooth(0.45, 0.8, flash) : 0;
    const cdrift = (u / LOOP) * CW;

    for (let x = 0; x < W; x++) surf[x] = wave(x + 0.5, phase / (Math.PI * 2) * LOOP * 0.785);

    // the ship rides the face: placed on the surface, turned to its slope, rocking with the swell
    const SX = 82 + 2 * Math.sin(phase);
    const sy0 = wave(SX - 8, phase * 1.25), sy1 = wave(SX + 8, phase * 1.25);
    const pitch = Math.atan2(sy0 - sy1, 16) * 0.7 + 0.05 * Math.sin(phase * 2 + 1);
    const SY = (sy0 + sy1) / 2 + 2.8;
    const cs = Math.cos(pitch), sn = Math.sin(pitch);

    kind.fill(0);
    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, px = x + 0.5;
        let cr: number, cg: number, cb: number, fl = 0.02;
        const s = surf[x];
        if (y < s) {
          if (y < HORIZON + 4 + 2 * Math.sin(px * 0.07 + phase)) {
            // the sky: black overhead, slate at the horizon, clouds lit from within by the lightning
            const v = y / HORIZON;
            cr = mix(0.03, 0.13, v), cg = mix(0.04, 0.16, v), cb = mix(0.07, 0.22, v);
            if (r < HORIZON) {
              const sx = px + cdrift, ix = Math.floor(sx) % CW;
              const c = cloud[r * CW + ix], cl = cloudLit[r * CW + ix];
              const shade = 0.07 + 0.14 * (1 - c) * (0.6 + 0.4 * cl);
              cr = mix(cr, shade * 0.9, c), cg = mix(cg, shade, c), cb = mix(cb, shade * 1.25, c);
              // the moon through the clouds: a cold glow in the gaps and silver on the clouds' edges
              const md = Math.hypot(px - MOON[0], y - MOON[1]);
              const mg = Math.exp(-md / 9) * 0.5 + Math.exp(-md / 50) * 0.28;
              const m = mg * (1 - 0.7 * c) + mg * c * (1 - c) * 2.2;
              cr += m * 0.72, cg += m * 0.82, cb += m;
              if (md < 4.2 && c < 0.55) (cr += 0.5), (cg += 0.55), (cb += 0.6);
              // lightning: brightest nearest the bolt, glowing through the billows
              const near = Math.exp(-Math.abs(px - 164) / 50);
              const l = flash * (0.25 + 0.75 * cl) * (0.35 + 0.65 * near);
              cr += l * 0.82, cg += l * 0.84, cb += l;
            }
          } else {
            // far swells under the horizon, dark and heaving
            const fw = noise(px * 0.08 + phase, y * 0.5);
            const v = 0.05 + 0.06 * fw + 0.1 * Math.exp(-Math.abs(px - MOON[0]) / 40);
            cr = v * 0.6, cg = v * 1.05, cb = v;
            const crest = smooth(0.66, 0.8, fw) * 0.3 * (1 + flash);
            cr += crest * 0.7, cg += crest * 0.85, cb += crest * 0.8;
            cr += flash * 0.12, cg += flash * 0.13, cb += flash * 0.15;
          }
        } else {
          // the big wave: darker deep in its body, lit along its slope, foam running down its face
          const depth = y - s;
          const slope = (surf[Math.min(W - 1, x + 1)] - surf[Math.max(0, x - 1)]) / 2;
          const facing = clamp(0.5 - slope * 0.35);
          const streak = noise(px * 0.06 + depth * 0.02, (y + slope * px * 0.2) * 0.35 - phase * 2.5);
          // the face takes the storm's grey light; deeper in, the water goes black-green
          // the face takes the moon's cold light from above and to the left
          const moonlit = 0.3 * Math.exp(-Math.abs(px - MOON[0] - 20) / 80);
          const v = 0.06 + (0.22 + moonlit * 1.6) * facing * Math.exp(-depth / 22) + 0.08 * streak * Math.exp(-depth / 30);
          cr = v * 0.55, cg = v * 1.1, cb = v * 1.0;
          // near the crest the wave is thin enough to glow green with what light there is
          const thin = Math.exp(-depth / 7) * Math.exp(-Math.pow((px - CREST + 8) / 22, 2)) * 0.22;
          cr += thin * 0.35, cg += thin * 0.95, cb += thin * 0.8;
          // foam: a lip along the surface, streaks pouring down the face below the crest
          const lip = Math.exp(-depth / 1.2) * smooth(0.3, 0.7, noise(px * 0.3 + phase * 3, 3));
          const runs = smooth(0.62, 0.8, streak) * Math.exp(-depth / 10) * smooth(CREST + 20, CREST - 30, px) * smooth(30, 60, px);
          const foam = clamp(lip * 0.9 + runs * 0.7);
          // foam keeps a faint glow of its own, so the crest and the runs read in the dark
          cr = mix(cr, 0.74, foam), cg = mix(cg, 0.86, foam), cb = mix(cb, 0.84, foam);
          const lit = flash * (0.15 + 0.35 * facing) * Math.exp(-depth / 20);
          cr += lit * 0.75, cg += lit * 0.85, cb += lit * 0.9;
          fl = 0.01;
        }

        // the ship, turned into her own frame
        const dx = px - SX, dy = SY - y;
        if (dx > -56 && dx < 56 && dy > -8 && dy < 56) {
          const su = (dx * cs + dy * sn) / SCALE, sv = (-dx * sn + dy * cs) / SCALE;
          const part = ship(su, sv, t);
          // below the waterline her hull is under the sea
          if (part && (y < s + 1.2 || part === 3)) {
            kind[k] = part;
            const lift = 0.15 + flash * 0.9;
            if (part === 1) (cr = 0.035 * lift * 3), (cg = 0.025 * lift * 3), (cb = 0.02 * lift * 3);
            else if (part === 2) (cr = 0.14 + 0.18 * flash), (cg = 0.1 + 0.13 * flash), (cb = 0.07 + 0.09 * flash);
            else if (part === 3) (cr = 0.05 * lift * 2), (cg = 0.04 * lift * 2), (cb = 0.035 * lift * 2);
            else if (part === 4) {
              const tex = 0.85 + 0.3 * noise(su * 0.5, sv * 0.5);
              (cr = 0.3 * tex + flash * 0.65 * tex), (cg = 0.3 * tex + flash * 0.62 * tex), (cb = 0.28 * tex + flash * 0.5 * tex);
            } else (cr = 1), (cg = 0.75), (cb = 0.4);
            fl = 0;
          }
        }
        R[k] = cr, G[k] = cg, B[k] = cb, F[k] = fl;
      }
    }

    // the lantern's glow
    {
      const lu = -19 * SCALE, lv = 7.6 * SCALE;
      const lx = SX + lu * cs - lv * sn, ly = SY - (lu * sn + lv * cs);
      for (let r = Math.max(0, Math.floor(ly - 8)); r < Math.min(H, ly + 8); r++)
        for (let x = Math.max(0, Math.floor(lx - 10)); x < Math.min(W, lx + 10); x++) {
          const k = r * W + x, d = Math.hypot(x + 0.5 - lx, r + 0.5 - ly);
          const g = Math.exp(-d / 2.4) * 0.5 * (0.85 + 0.15 * Math.sin(t * 9));
          R[k] += g, G[k] += g * 0.6, B[k] += g * 0.25;
        }
    }

    // spray streaming off the crest, back and down over the ship
    for (const [a, b, c, d] of spray) {
      const life = (u / LOOP * 6 + a) % 1;
      const ox = CREST - 6 + b * 22, oy = wave(ox, phase * 1.25) - 1;
      const x = Math.round(ox - life * (40 + 50 * c)), r = Math.round(oy - 6 * Math.sin(life * Math.PI) * (0.5 + d) + life * life * 14);
      if (x < 0 || x >= W || r < 0 || r >= H) continue;
      const k = r * W + x, v = (1 - life) * 0.8;
      R[k] = mix(R[k], 0.8, v), G[k] = mix(G[k], 0.9, v), B[k] = mix(B[k], 0.88, v);
    }

    // rain, driving down to the left
    for (const [x0, y0, sp] of drops) {
      const y = (y0 + u * 34 * sp) % H, x = (((x0 - u * 12 * sp) % W) + W) % W;
      for (let i = 0; i < 3; i++) {
        const r = Math.floor(y - i * 1.4), c = Math.floor(x + i * 0.5);
        if (r < 0 || r >= H || c < 0 || c >= W) continue;
        const k = r * W + c, v = (0.13 + flash * 0.3) * (1 - i * 0.25);
        R[k] += v * 0.7, G[k] += v * 0.82, B[k] += v;
      }
    }

    for (let k = 0; k < N; k++) {
      let cr = R[k], cg = G[k], cb = B[k];
      // the bolt, white-hot, and its glow
      if (boltOn && bolt[k] > 0.05 && kind[k] === 0 && Math.floor(k / W) < surf[k % W]) {
        const v = bolt[k] * boltOn;
        cr = mix(cr, 1.3, v), cg = mix(cg, 1.35, v), cb = mix(cb, 1.4, v);
      }
      cr = tone[Math.min(1024, (cr * 256) | 0)], cg = tone[Math.min(1024, (cg * 256) | 0)], cb = tone[Math.min(1024, (cb * 256) | 0)];
      const peak = Math.max(cr, cg, cb, 1e-4);
      const level = clamp(F[k] + (1 - F[k]) * Math.pow(peak, 1.1) * 1.05);
      const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
      out[k] = DOTS[step];
      if (color) {
        const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
        const s = (0.3 + 0.7 * want) / peak;
        color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
