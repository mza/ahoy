/*
 * masthead dawn: the view from the crow's nest as the sun breaks the horizon.
 * The mast climbs past us with a pennant streaming from its head, the shrouds
 * run down past the barrel's rim, and far below the fore topsail fills over a
 * sliver of deck. Beyond is only sea, and a far island, under a sky going from
 * violet to gold. Clouds drift, the sun's path glitters, and the whole world
 * rocks gently as the mast sways.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "masthead dawn",
  category: "scenes",
  note: "sunrise over an endless sea from a galleon's crow's nest",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#0a0814",
  palette: [
    // the sky, violet overhead to gold at the horizon
    "#1e1638", "#2a1d4a", "#3a265c", "#4c2f6c", "#62387a", "#7a4284", "#954c88",
    "#b0588a", "#c86688", "#dc7a84", "#ea9080", "#f4a87a", "#f9c07a", "#fcd68a",
    "#feeaa8", "#fff6d8", "#ffffff",
    // the sea
    "#1a1a3c", "#22244c", "#2c2f5c", "#3a3a6c", "#4c467a", "#625286", "#7c5e8c",
    "#9a6c8c", "#b87e88",
    // cloud undersides
    "#e48a7a", "#f09a6a", "#f6b45e", "#c06a7a",
    // timber, canvas and rope in shadow, and their sunlit edges
    "#140e1a", "#20161e", "#2e1e22", "#5a3a30", "#8a5a3a", "#c08a4a", "#e8b860",
    "#e8d6b8", "#c8b090", "#a08a78",
    // the pennant
    "#a8202a", "#d8343a",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HZ = 58; // the horizon
const SUN = [104, 58.5];
const PAD = 6; // the background is drawn this many rows taller each way, so it can rock
const BH = H + 2 * PAD;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const AIR = 0, MAST = 1, BARREL = 2, ROPE = 3, SAIL = 4, DECK = 5, FLAG = 6;

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

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

function fbm(x: number, y: number, octaves: number, period: number): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f, period * f);
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

export default function mastheadDawn(): Frame {
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

  // --- the sky and sea, drawn taller than the frame so they can rock ------
  const skyAt = (x: number, y: number): [number, number, number] => {
    const v = clamp(y / HZ);
    let a = smooth(0, 0.55, v);
    let r = mix(0.12, 0.38, a), g = mix(0.08, 0.17, a), b = mix(0.24, 0.43, a);
    a = smooth(0.45, 0.85, v);
    r = mix(r, 0.86, a), g = mix(g, 0.4, a), b = mix(b, 0.52, a);
    // gold low down, strongest round the sun
    const dx = x - SUN[0], dy = (y - SUN[1]) * 1.6, d = Math.sqrt(dx * dx + dy * dy);
    const near = Math.exp(-d / 55);
    a = smooth(0.7, 1, v) * (0.45 + 0.55 * near);
    r = mix(r, 1, a), g = mix(g, 0.72, a), b = mix(b, 0.46, a);
    const halo = Math.exp(-d / 6) * 0.6 + Math.exp(-d / 18) * 0.3 + Math.exp(-d / 45) * 0.12;
    r += halo, g += halo * 0.85, b += halo * 0.55;
    return [r, g, b];
  };
  const island = (x: number) => {
    // a low island with one peak, far off to the left
    const k = smooth(18, 34, x) * smooth(66, 48, x);
    return HZ - k * (2.2 + 3 * Math.exp(-((x - 38) ** 2) / 50) + 0.8 * fbm(x * 0.2, 3, 3, 0));
  };
  const BR = new Float32Array(W * BH), BG = new Float32Array(W * BH), BB = new Float32Array(W * BH);
  const isSea = new Uint8Array(W * BH);
  for (let rr = 0; rr < BH; rr++)
    for (let x = 0; x < W; x++) {
      const k = rr * W + x, y = rr - PAD + 0.5, xc = x + 0.5;
      let cr: number, cg: number, cb: number;
      if (y < HZ) {
        [cr, cg, cb] = skyAt(xc, y);
        if (y > island(xc)) {
          // hazy violet against the glow
          const s = skyAt(xc, HZ - 6);
          (cr = mix(s[0], 0.16, 0.78)), (cg = mix(s[1], 0.08, 0.78)), (cb = mix(s[2], 0.22, 0.78));
        }
      } else {
        // the sea: the sky's colour near the horizon, deepening toward us
        const v = clamp((y - HZ) / (H + PAD - HZ));
        const s = skyAt(xc, HZ - 1 - (y - HZ) * 0.6);
        const a = smooth(0, 0.6, v);
        cr = mix(s[0] * 0.8, 0.12, a), cg = mix(s[1] * 0.75, 0.11, a), cb = mix(s[2] * 0.85, 0.3, a);
        isSea[k] = 1;
      }
      (BR[k] = cr), (BG[k] = cg), (BB[k] = cb);
    }

  // clouds in two layers that wrap, so they can drift: high and violet, low and golden
  const CW = 520;
  const layer = (y0: number, y1: number, sx: number, sy: number, bias: number) => {
    const h = y1 - y0, cov = new Float32Array(CW * h), lit = new Float32Array(CW * h);
    for (let r = 0; r < h; r++)
      for (let x = 0; x < CW; x++) {
        const y = r + 0.5;
        const fade = smooth(0, 4, y) * smooth(h, h - 4, y);
        const d = fbm(x * sx, (y0 + y) * sy, 4, CW * sx) - bias * (1 - fade);
        const d2 = fbm((x - 1) * sx, (y0 + y + 1.6) * sy, 4, CW * sx) - bias * (1 - fade);
        cov[r * CW + x] = smooth(0.54, 0.7, d);
        lit[r * CW + x] = clamp(0.45 + (d - d2) * 7);
      }
    return { y0, y1, cov, lit };
  };
  const clouds = [layer(6, 30, 0.012, 0.16, 0.35), layer(38, 56, 0.018, 0.22, 0.32)];

  // --- the ship around us, in front ------------------------------------------
  const fg = new Uint8Array(N);
  const FR = new Float32Array(N), FG = new Float32Array(N), FB = new Float32Array(N);
  const MX = 170; // the mast's axis
  const shrouds: [number, number, number, number][] = [
    [MX - 3, 26, 92, 100], [MX - 3, 26, 108, 100], [MX - 3, 26, 124, 100],
  ];
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      let m = AIR, cr = 0, cg = 0, cb = 0;
      // far below: the fore topsail, filled, seen from above, and its yard
      const sv = (y - 77) / 18;
      const half = 24 + sv * 9, su = (xc - 52) / half;
      const foot = 1 + 0.18 * (1 - su * su);
      if (sv > 0 && sv < foot && Math.abs(su) < 1) {
        m = SAIL;
        // the sun, low to the left, glances across its curve; its reef bands show as shade
        const shade = (0.3 + 0.6 * smooth(-0.9, 0.7, su)) * (1 - 0.25 * sv) * (Math.abs(sv - 0.22) < 0.03 || Math.abs(sv - 0.4) < 0.03 ? 0.6 : 1);
        cr = 0.9 * shade, cg = 0.76 * shade, cb = 0.6 * shade;
      }
      if (Math.abs(y - 76.6) < 0.9 && Math.abs(xc - 52) < 28) (m = ROPE), (cr = 0.12), (cg = 0.08), (cb = 0.08);
      // the foremast, dropping through the sail toward the deck
      if (Math.abs(xc - 52) < 1.2 && y > 66) (m = MAST), (cr = 0.08), (cg = 0.05), (cb = 0.06);
      // a sliver of deck far down in the corner, planked
      const deckTop = 93 + (xc - 0) * 0.06;
      if (y > deckTop && xc < 70) {
        m = DECK;
        const plank = ((xc + y * 0.3) % 4) < 0.5 ? 0.6 : 1;
        cr = 0.22 * plank, cg = 0.15 * plank, cb = 0.12 * plank;
      }
      // the shrouds and their ratlines, running down past us
      for (const [ax, ay, bx, by] of shrouds) if (seg(xc, y, ax, ay, bx, by) < 0.55) (m = ROPE), (cr = 0.06), (cg = 0.04), (cb = 0.05);
      if (y > 30 && y < 100 && Math.round(y) % 4 === 0) {
        // ratlines: short horizontal steps between neighbouring shrouds
        const t0 = (y - 26) / 74;
        const xa = mix(MX - 3, 92, t0), xb = mix(MX - 3, 124, t0);
        if (xc > xa && xc < xb) (m = ROPE), (cr = 0.07), (cg = 0.05), (cb = 0.05);
      }
      // the mast itself, close by on the right, a band of iron round it
      const mw = 4.2 + y * 0.012;
      if (Math.abs(xc - MX) < mw) {
        m = MAST;
        const u = (xc - MX) / mw;
        // the sun lights its left side
        const sunlit = smooth(-0.2, -0.95, u);
        cr = 0.06 + 0.75 * sunlit, cg = 0.04 + 0.48 * sunlit, cb = 0.05 + 0.22 * sunlit;
        const grain = 0.85 + 0.3 * noise(xc * 2, y * 0.15, 0);
        (cr *= grain), (cg *= grain), (cb *= grain);
        if (Math.abs(y - 22) < 1 || Math.abs(y - 24.5) < 0.5) (cr *= 0.6), (cg *= 0.6), (cb *= 0.7);
      }
      // the crow's nest's rim, curving across the near corner, and its staves below
      const rimY = 74 + Math.pow(Math.max(0, 200 - xc) / 82, 2) * 30;
      if (y > rimY && xc > 110) {
        m = BARREL;
        const into = y - rimY;
        const stave = ((xc + into * 0.2) % 5) < 0.6 ? 0.6 : 1;
        let lip = into < 1.6 ? 1 : 0;
        const sunlit = lip ? 0.75 * smooth(200, 120, xc) : 0;
        cr = (0.09 + sunlit) * stave, cg = (0.06 + sunlit * 0.62) * stave, cb = (0.06 + sunlit * 0.32) * stave;
        if (Math.abs(into - 9) < 0.8) (cr *= 0.5), (cg *= 0.5), (cb *= 0.5); // an iron hoop
        lip = 0;
      }
      fg[k] = m;
      (FR[k] = cr), (FG[k] = cg), (FB[k] = cb);
    }

  // gulls gliding across the light
  const gulls = [[30, 30, 7, 0], [140, 20, 5, 1.7], [80, 44, 9, 3.1]];

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  return (t, { color } = {}) => {
    // the mast rolls: the world rises and falls a little and tilts with it
    const roll = Math.sin(t * 0.42) * 1.6 + Math.sin(t * 0.17 + 1) * 0.8;
    const tilt = Math.sin(t * 0.42 + 0.6) * 0.012;
    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let cr: number, cg: number, cb: number, fl = 0.03;
        const m = fg[k];
        if (m !== AIR) {
          (cr = FR[k]), (cg = FG[k]), (cb = FB[k]);
          fl = 0;
        } else {
          // the rocking world
          const off = roll + tilt * (x - 100);
          let rr = Math.round(r + PAD - off);
          rr = rr < 0 ? 0 : rr > BH - 1 ? BH - 1 : rr;
          const j = rr * W + x;
          (cr = BR[j]), (cg = BG[j]), (cb = BB[j]);
          const wy = rr - PAD + 0.5; // where in the world this cell looks
          if (isSea[j]) {
            // the sun's path, breaking into glitter as it comes toward us
            const v = clamp((wy - HZ) / (H - HZ));
            const spread = 2 + v * 34;
            const along = Math.exp(-((x + 0.5 - SUN[0]) ** 2) / (2 * spread * spread));
            const wave = noise(x * (0.25 - v * 0.15) + t * 0.3, wy * (1.6 - v * 0.9) - t * 1.1, 0);
            const glitter = smooth(0.62 - 0.1 * along, 0.85, wave) * along;
            const sparkle = hash(x * 13 + Math.floor(t * 6), r * 7) > 0.96 - 0.1 * along ? along : 0;
            const g = glitter * 0.9 + sparkle * 0.7 + along * 0.12 * (1 - v);
            cr += g, cg += g * 0.82, cb += g * 0.5;
            // ripple lines across the swell
            const ln = smooth(0.5, 0.9, noise(x * 0.06 + t * 0.05, wy * 0.9 - t * 0.4, 0)) * 0.06;
            cr += ln, cg += ln * 0.8, cb += ln;
          } else {
            for (const c of clouds) {
              if (wy < c.y0 || wy >= c.y1) continue;
              const sx = x + t * (c.y0 < 30 ? 0.6 : 1.1), ix = Math.floor(sx), fx = sx - ix;
              const row = Math.min(c.y1 - c.y0 - 1, Math.floor(wy - c.y0)) * CW;
              const i0 = row + (((ix % CW) + CW) % CW), i1 = row + ((((ix + 1) % CW) + CW) % CW);
              const cv = c.cov[i0] + (c.cov[i1] - c.cov[i0]) * fx;
              if (cv < 0.01) continue;
              const l = c.lit[i0] + (c.lit[i1] - c.lit[i0]) * fx;
              const dx = x + 0.5 - SUN[0], near = Math.exp(-Math.abs(dx) / 70);
              // undersides lit pink and gold from the sun below the clouds
              const sun = l * (0.4 + 0.6 * near) * (c.y0 < 30 ? 0.75 : 1.1);
              const a = cv * 0.88;
              cr = mix(cr, mix(0.3, 1.0, sun), a), cg = mix(cg, mix(0.16, 0.66, sun), a), cb = mix(cb, mix(0.36, 0.5, sun), a);
            }
            // the sun: a blinding half disc on the horizon, shimmering
            const dx = x + 0.5 - SUN[0], dy = (wy - SUN[1] + 0.5) * 1.0;
            const sd = Math.sqrt(dx * dx + dy * dy);
            if (sd < 7.5 && wy < HZ + 0.2) {
              const rim = smooth(7.5, 6, sd);
              const sh = 0.94 + 0.06 * Math.sin(t * 3 + wy);
              (cr = mix(cr, 1.2 * sh, rim)), (cg = mix(cg, 1.05 * sh, rim)), (cb = mix(cb, 0.8 * sh, rim));
              fl = 0.6;
            }
          }
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
    // the pennant streaming off the masthead, rippling
    for (let i = 0; i < 26; i++) {
      const wave = Math.sin(i * 0.45 - t * 6) * (0.4 + i * 0.07);
      const half = 2.6 * (1 - i / 28);
      for (let d = -half; d <= half; d += 1) {
        const x = MX - 4 - i, r = Math.round(6 + wave + d + i * 0.08);
        if (x < 0 || r < 0 || r >= H) continue;
        const k = r * W + x;
        if (fg[k] !== AIR) continue;
        const light = 0.75 + 0.25 * Math.sin(i * 0.45 - t * 6 + 1.2);
        out[k] = light > 0.85 ? "●" : "•";
        if (color) color[k] = nearest(0.85 * light, 0.2 * light, 0.22 * light);
      }
    }
    // gulls, dark against the glow, wings beating now and then
    for (const [gx, gy, sp, ph] of gulls) {
      const x0 = Math.round(((gx + t * sp) % (W + 40)) - 20), y0 = Math.round(gy + Math.sin(t * 0.6 + ph) * 2);
      const flap = Math.sin(t * 5 + ph) > 0.3 ? 1 : 0;
      const shape = flap ? [[-2, -1], [-1, 0], [1, 0], [2, -1]] : [[-2, 0], [-1, 0], [1, 0], [2, 0]];
      for (const [dx, dy] of [...shape, [0, 0]]) {
        const x = x0 + dx, r = y0 + dy;
        if (x < 0 || x >= W || r < 0 || r >= H) continue;
        const k = r * W + x;
        if (fg[k] !== AIR) continue;
        out[k] = "•";
        if (color) color[k] = nearest(0.16, 0.1, 0.18);
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
