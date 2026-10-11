/*
 * burning ship: a galleon ablaze at night on a still sea. Fire climbs its
 * rigging and eats through its sails, a column of smoke lit from beneath leans
 * off on the wind, and embers drift up into the dark. The whole blaze lies in
 * the water below, broken by slow ripples, and a longboat pulls away across
 * the bright reflection, its oars dipping.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "burning ship",
  category: "scenes",
  note: "a galleon ablaze at night, its fire mirrored in a still sea",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#05040a",
  palette: [
    // night sky and sea
    "#0a0b1a", "#11132a", "#1a1c38", "#252848", "#33365a",
    // smoke, cold to lit
    "#2a2228", "#3b2e30", "#4e3a36", "#66473a", "#82563c", "#a0663e",
    // hull and timber
    "#140c0a", "#22140e", "#341e12", "#4a2a16",
    // fire, deep to white
    "#5a120c", "#7e1a0e", "#a4260e", "#c83a10", "#e2561a", "#f27424", "#f99430",
    "#fdb446", "#ffd062", "#ffe68c", "#fff4c4", "#fffbea",
    // the fire's light on the water and in the glow
    "#3a1a20", "#5a2620", "#7a3420", "#9c4622",
    // stars
    "#c8cce6", "#eef0ff",
  ],
} satisfies Meta;

const W = 200, H = 100;
const WL = 64; // the waterline, and the horizon just above it
const HZ = 61;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const OX = -16; // the ship sits this far left of where its geometry is drawn
const FIRE = [140 + OX, 34]; // the heart of the blaze, where its light comes from

const SKY = 0, SEA = 1, HULL = 2, SAIL = 3, SPAR = 4, BOAT = 5, PORT = 6;

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

// fire's colour by heat: ember red, through orange and gold, to white at the core
function heat(h: number): [number, number, number] {
  h = clamp(h);
  return [clamp(0.35 + h * 1.6), clamp(h * h * 1.5 + h * 0.12), clamp(Math.pow(h, 3.2) * 1.1)];
}

export default function burningShip(): Frame {
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
  const fuel = new Float32Array(N); // what is burning, and how fiercely
  const lit = new Float32Array(N); // how much of the fire's light a surface takes

  // --- the galleon, broadside on, its bow to the left ------------------------
  const deck = (x: number) => {
    // the sheer: low amidships, rising to the forecastle and the tall stern
    if (x < 84 || x > 176) return 999;
    const s = (x - 84) / 92;
    return 56 - 3 * Math.exp(-((s - 0.08) ** 2) / 0.004) - 9 * smooth(0.72, 0.9, s) + 2.5 * Math.sin(s * Math.PI) * 0.4;
  };
  const keel = (x: number) => {
    // the hull bulges below the wale and tucks in at either end
    const s = (x - 84) / 92;
    return WL + 2 - 4 * Math.pow(Math.abs(s - 0.52) * 2, 3);
  };
  const MASTS: [number, number][] = [[106, 14], [131, 7], [157, 19]]; // x and top
  // sails: [mast, top, bottom, half-width, how burnt]
  const SAILS: [number, number, number, number, number][] = [
    [0, 22, 33, 9, 0.3], [0, 36, 50, 12, 0.85],
    [1, 13, 27, 10, 0.45], [1, 30, 50, 14, 0.8],
    [2, 27, 40, 8, 0.1],
  ];
  const rigging: [number, number, number, number][] = [
    [106, 14, 68, 47], [131, 7, 106, 14], [157, 19, 131, 7], [157, 19, 176, 44],
    [106, 14, 92, 54], [106, 14, 120, 55], [131, 7, 118, 55], [131, 7, 145, 55], [157, 19, 148, 52], [157, 19, 168, 47],
    [84, 52, 66, 46], // the bowsprit
  ];

  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      let m = y < WL ? SKY : SEA;
      let cr = 0, cg = 0, cb = 0, fl = 0, f = 0, l = 0;
      if (m === SKY) {
        // a deep night, a little paler toward the horizon
        const v = smooth(0, HZ, y);
        cr = mix(0.0, 0.03, v), cg = mix(0.0, 0.03, v), cb = mix(0.02, 0.08, v);
        // a far headland, black on the horizon
        const land = HZ + 0.5 - 3.5 * smooth(0, 60, xc) * smooth(70, 30, xc) * (0.6 + 0.6 * fbm(xc * 0.08, 1, 3));
        if (y > land && xc < 70) (cr = 0.02), (cg = 0.02), (cb = 0.04);
      }
      const xs = xc - OX;
      // the hull
      if (y >= deck(xs) && y < Math.min(WL + 0.5, keel(xs)) && xs > 84 && xs < 176) {
        m = HULL;
        const tex = fbm(xs * 0.5, y * 1.5, 2);
        cr = 0.035 + 0.02 * tex, cg = 0.02 + 0.01 * tex, cb = 0.02;
        // the wale, a raised band of timber, and the rail
        const top = deck(xs);
        if (y < top + 1.2) (cr = 0.55), (cg = 0.24), (cb = 0.08);
        if (Math.abs(y - (top + 6)) < 0.6) (cr = 0.22), (cg = 0.1), (cb = 0.04);
        // gunports along the gun deck, a fire burning inside
        const gy = top + 3.5;
        if (Math.abs(y - gy) < 1 && xs > 92 && xs < 166 && ((xs - 92) % 7) < 2.4) m = PORT;
        // the stern castle's windows
        if (xs > 166 && xs < 174 && y > top + 1.5 && y < top + 4 && ((xs - 166) % 3) < 1.6) m = PORT;
        l = 0.35;
      }
      // masts and yards
      for (const [mx, top] of MASTS) {
        if (Math.abs(xs - mx) < 0.9 && y > top && y < deck(mx) + 1) (m = SPAR), (l = 0.25), (f = Math.max(f, 0.12 * smooth(top + 10, top + 34, y)));
      }
      for (const [mi, top, bot, hw] of SAILS) {
        const mx = MASTS[mi][0];
        for (const yy of [top - 0.8]) if (Math.abs(y - yy) < 0.7 && Math.abs(xs - mx) < hw + 2) (m = SPAR), (l = 0.25);
        void bot;
      }
      for (const [ax, ay, bx, by] of rigging) {
        if (seg(xs, y, ax, ay, bx, by) < 0.42) {
          // lines of rope, lit by the fire; the mainmast's shrouds have caught
          if (m === SKY) (m = SPAR), (l = 0.6), (cr = 0.16), (cg = 0.06), (cb = 0.03);
          f = Math.max(f, Math.abs(ax - 131) < 1 || Math.abs(bx - 131) < 1 ? 0.45 : 0.1);
        }
      }
      // sails: bellied, part burnt away, the burnt edges glowing
      for (const [mi, top, bot, hw, burnt] of SAILS) {
        const mx = MASTS[mi][0];
        const v = (y - top) / (bot - top);
        if (v < 0 || v > 1) continue;
        const belly = hw + 1.5 * Math.sin(v * Math.PI);
        const u = (xs - mx) / belly;
        if (Math.abs(u) > 1) continue;
        // holes eaten up from the foot of the sail, ragged
        const eat = fbm(xs * 0.18 + mi * 7, y * 0.2, 3) + (1 - v) * 0.15;
        const gone = eat < burnt * 0.62;
        const edge = eat < burnt * 0.62 + 0.08;
        if (gone) {
          f = Math.max(f, 0.62 * burnt);
          continue;
        }
        m = SAIL;
        // pale canvas, darker toward its edges, scorched near the fire
        const shade = (0.42 + 0.3 * Math.cos(u * 1.6) + 0.22 * v) * (0.85 + 0.25 * fbm(xs * 0.3, y * 0.15, 2));
        const scorch = smooth(burnt * 0.62 + 0.2, burnt * 0.62 + 0.08, eat);
        cr = 0.95 * shade * (1 - 0.7 * scorch), cg = 0.72 * shade * (1 - 0.8 * scorch), cb = 0.44 * shade * (1 - 0.85 * scorch);
        l = 0.25;
        if (edge) f = Math.max(f, 0.75);
      }
      for (const [mx, top] of MASTS) if (Math.abs(xs - mx) < 0.9 && y > top && y < deck(mx) + 1) (m = SPAR), (l = 0.25), (cr = 0.03), (cg = 0.02), (cb = 0.02);
      // fire along the deck amidships, fiercest by the mainmast
      const dk = deck(xs);
      if (y > dk - 1.5 && y < dk + 0.5 && xs > 94 && xs < 166) f = Math.max(f, 0.35 + 0.65 * Math.exp(-((xs - 124) ** 2) / 260));
      mat[k] = m;
      (R[k] = cr), (G[k] = cg), (B[k] = cb);
      floorA[k] = fl;
      fuel[k] = f;
      lit[k] = l;
    }

  // the longboat, low in the water, pulling away to the right
  const BX = 134 + OX, BY = 85;
  const boat = (xc: number, y: number, bob: number) => {
    const dx = xc - BX, dy = y - BY - bob;
    // a shallow hull
    if (dy > -0.6 && dy < 2 && Math.abs(dx) < 13 - dy * 1.6) return 1;
    // four rowers, hunched
    for (let i = 0; i < 4; i++) {
      const rx = -7.5 + i * 5;
      const ex = dx - rx, ey = dy + 2;
      if (ex * ex * 1.1 + ey * ey < 3.4) return 1;
      if (ex * ex + (dy + 4.6) ** 2 < 1.4) return 1;
    }
    return 0;
  };

  // the plume: fire rises from what burns, spreading a little as it climbs
  const plume = new Float32Array(N);
  for (let r = H - 1; r >= 0; r--)
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      let up = 0;
      if (r < H - 1 && r < WL) {
        const b = (r + 1) * W;
        up = 0.92 * (0.25 * plume[b + Math.max(0, x - 1)] + 0.5 * plume[b + x] + 0.25 * plume[b + Math.min(W - 1, x + 1)]);
      }
      plume[k] = r < WL ? Math.max(fuel[k], up) : 0;
    }
  // where the fire is, for computing only there
  let fx0 = W, fx1 = 0, fy0 = H, fy1 = 0;
  for (let r = 0; r < WL; r++)
    for (let x = 0; x < W; x++)
      if (plume[r * W + x] > 0.04) (fx0 = Math.min(fx0, x)), (fx1 = Math.max(fx1, x)), (fy0 = Math.min(fy0, r)), (fy1 = Math.max(fy1, r));

  // the smoke column: leaning left on the wind as it climbs, widening
  const smokeShape = new Float32Array(N);
  let sx0 = W, sx1 = 0, sy1 = 0;
  for (let r = 0; r < WL; r++)
    for (let x = 0; x < W; x++) {
      const y = r + 0.5, rise = Math.max(0, 58 - y);
      const cx = 132 + OX - rise * 0.3 - rise * rise * 0.016, w = 20 + rise * 0.5;
      const s = Math.exp(-((x + 0.5 - cx) ** 2) / (2 * w * w)) * smooth(60, 50, y);
      smokeShape[r * W + x] = s;
      if (s > 0.04) (sx0 = Math.min(sx0, x)), (sx1 = Math.max(sx1, x)), (sy1 = Math.max(sy1, r));
    }

  // the fire's light, by distance from the heart of the blaze
  const glow = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - FIRE[0], dy = (r + 0.5 - FIRE[1]) * 1.3;
      const d = Math.sqrt(dx * dx + dy * dy);
      glow[r * W + x] = Math.exp(-d / 12) * 0.5 + Math.exp(-d / 30) * 0.25 + Math.exp(-d / 70) * 0.06;
    }

  // stars, only in the darker sky away from the fire
  const stars: [number, number, number][] = [];
  for (let i = 0; i < 600; i++) {
    const x = Math.floor(hash(i, 91) * W), r = Math.floor(hash(i, 92) * (HZ - 8));
    const k = r * W + x;
    if (mat[k] === SKY && glow[k] < 0.2 && smokeShape[k] < 0.08 && hash(i, 93) > 0.55) stars.push([k, hash(i, 94) * 6.28, 0.6 + hash(i, 95) * 1.6]);
  }

  // embers: each rises, drifts on the wind and fades
  const embers: { x: number; y: number; v: number; d: number; ph: number; life: number }[] = [];
  for (let i = 0; i < 90; i++)
    embers.push({ x: 100 + hash(i, 201) * 64, y: 20 + hash(i, 202) * 36, v: 3 + hash(i, 203) * 5, d: 1 + hash(i, 204) * 3, ph: hash(i, 205), life: 4 + hash(i, 206) * 5 });

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  // this frame's picture above the water, kept to be mirrored in it
  const AR = new Float32Array(WL * W), AG = new Float32Array(WL * W), AB = new Float32Array(WL * W);
  const flameAt = new Float32Array(WL * W);

  return (t, { color } = {}) => {
    // the blaze breathes: a slow surge and a quick flutter
    const flick = 0.88 + 0.08 * Math.sin(t * 2.3) + 0.06 * Math.sin(t * 9.1 + 1) * Math.sin(t * 4.3);
    flameAt.fill(0);
    for (let r = fy0; r <= fy1; r++)
      for (let x = fx0; x <= fx1; x++) {
        const k = r * W + x, p = plume[k];
        if (p < 0.04) continue;
        // tongues of flame: noise rising through the plume, licking sideways
        const y = r + 0.5 + t * 11;
        const n = fbm((x + 0.5) * 0.16 + Math.sin(y * 0.05) * 0.8, y * 0.09, 3);
        const tongue = smooth(0.42, 0.95, p * (0.4 + 1.3 * n)) * smooth(0, 0.25, p);
        flameAt[k] = tongue * (0.85 + 0.15 * flick);
      }

    // the sky, ship and smoke above the water
    for (let r = 0; r < WL; r++)
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k];
        let cr = R[k], cg = G[k], cb = B[k];
        const g = glow[k] * flick;
        if (m === SKY) {
          // the night lit amber round the blaze
          cr += g * 0.42, cg += g * 0.14, cb += g * 0.04;
        } else if (m === PORT) {
          const fire = 0.75 + 0.25 * noise(x * 0.7, t * 3);
          [cr, cg, cb] = heat(0.5 + 0.4 * fire);
        } else {
          // timber and canvas take the fire's light
          const lf = g * lit[k] * 1.6;
          cr += lf * 0.95, cg += lf * 0.45, cb += lf * 0.14;
        }
        // smoke, drifting up and left, lit from below by the fire
        const ss = smokeShape[k];
        if (m === SKY && ss > 0.04 && x >= sx0 && x <= sx1 && r <= sy1) {
          const y = r + 0.5;
          const n = fbm((x + 0.5 + t * 1.6) * 0.055, (y + t * 3.2) * 0.07, 3);
          const dens = clamp(ss * (0.6 + 1.4 * (n - 0.5)) * 1.3);
          if (dens > 0.01) {
            // lit hot from below near the fire, cooling to brown and grey as it climbs
            const dx = x + 0.5 - FIRE[0], dy = (y - FIRE[1] - 6) * 1.2, d = Math.sqrt(dx * dx + dy * dy);
            const under = clamp((0.24 + 0.85 * Math.exp(-d / 34)) * flick) * (0.55 + 0.7 * n);
            const sr = mix(0.05, 0.72, under), sg = mix(0.035, 0.24, under), sb = mix(0.04, 0.1, under);
            const a = clamp(dens);
            (cr = mix(cr, sr, a)), (cg = mix(cg, sg, a)), (cb = mix(cb, sb, a));
          }
        }
        // flame, over all of it
        let fa = flameAt[k];
        // the ship's timbers stand black against the fire unless it has them
        if (m === SPAR) fa = fa > 0.72 ? fa : 0;
        // canvas still standing hides the fire behind it, but burns at its holes' edges
        if (m === SAIL && fuel[k] < 0.5) fa *= 0.25;
        if (fa > 0.02) {
          const [hr, hg, hb] = heat(fa * 0.88);
          const a = smooth(0, 0.3, fa);
          (cr = mix(cr, hr, a)), (cg = mix(cg, hg, a)), (cb = mix(cb, hb, a));
        }
        AR[k] = cr, AG[k] = cg, AB[k] = cb;
      }

    // embers
    for (const e of embers) {
      const age = (((t / e.life + e.ph) % 1) + 1) % 1;
      const x = Math.round(e.x - age * e.life * e.d * 2.2 + Math.sin(t * 1.3 + e.ph * 9) * 2);
      const r = Math.round(e.y - age * e.life * e.v);
      if (x < 0 || x >= W || r < 0 || r >= HZ) continue;
      const k = r * W + x, b = (1 - age) * (0.6 + 0.4 * Math.sin(t * 8 + e.ph * 20));
      const [hr, hg, hb] = heat(0.35 + 0.5 * b);
      AR[k] = Math.max(AR[k], hr * b * 1.3), AG[k] = Math.max(AG[k], hg * b * 1.3), AB[k] = Math.max(AB[k], hb * b);
    }

    const bob = 0.5 * Math.sin(t * 1.4);
    const stroke = Math.sin(t * 2.2);
    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        let cr: number, cg: number, cb: number, fl = floorA[k], m = mat[k];
        if (r < WL) {
          cr = AR[k], cg = AG[k], cb = AB[k];
          if (flameAt[k] > 0.15) fl = 0.15;
        } else {
          // the sea: everything above, upside down, broken by ripples
          const depth = (y - WL) / (H - WL);
          const w = noise(x * 0.12 + t * 0.15, y * 1.2 - t * 0.7);
          const wob = Math.sin(y * 1.9 - t * 1.6 + Math.sin(x * 0.11 + t * 0.5) * 1.3) * (0.2 + 1.4 * depth);
          let sx = Math.round(x + wob);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          let sr = Math.round(WL - 1 - (r - WL) * 1.25 + (w - 0.5) * 4 * depth);
          sr = sr < 0 ? 0 : sr > WL - 1 ? WL - 1 : sr;
          const j = sr * W + sx;
          // bright in the near ripples' faces, dark between them
          const face = smooth(0.18, 0.62, w);
          const keep = mix(0.18, 0.7, face) * mix(0.85, 0.6, depth);
          cr = AR[j] * keep + 0.012, cg = AG[j] * keep + 0.014, cb = AB[j] * keep + 0.035;
          // a broad warm path on the water under the blaze
          const path = Math.exp(-Math.abs(x + 0.5 - FIRE[0] + (y - WL) * 0.2) / (12 + depth * 20)) * (0.35 + 0.65 * smooth(0.3, 0.8, w)) * 0.75 * flick * smooth(WL, WL + 10, y);
          cr += path, cg += path * 0.45, cb += path * 0.12;
          // the hull sits in the water: right under it, its own dark
          if (y < WL + 2.5 && x > 84 + OX && x < 176 + OX) (cr *= 0.5), (cg *= 0.5), (cb *= 0.5);
          // the longboat, black against the reflection, oars dipping
          if (boat(x + 0.5, y, bob)) {
            (cr = 0.02), (cg = 0.015), (cb = 0.02), (m = BOAT), (fl = 0);
          } else {
            const dx = x + 0.5 - BX, dy = y - BY - bob;
            for (let i = 0; i < 4; i++) {
              const ox = -7.5 + i * 5 + 1.5, slope = 0.55 + 0.35 * stroke;
              const along = dy - 0.3;
              if (along > 0 && along < 4 && Math.abs(dx - ox - along / slope * 0.6) < 0.5) (cr = 0.03), (cg = 0.02), (cb = 0.02), (m = BOAT), (fl = 0);
            }
          }
          fl = m === BOAT ? 0 : 0.03;
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
    // stars twinkle where the smoke hasn't reached
    for (const [k, ph, sp] of stars) {
      const s = Math.sin(t * sp + ph);
      if (s > -0.2 && out[k] === " ") {
        out[k] = s > 0.75 ? "•" : "·";
        if (color) color[k] = nearest(0.85, 0.86, 0.98);
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
