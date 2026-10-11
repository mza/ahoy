/*
 * sea battle: two galleons trading broadsides at dusk across a darkening sea.
 * The sun has just gone down between them; their sails still hold its light.
 * Each ship's guns fire in a ripple from bow to stern, the flashes lighting
 * its hull and the water, and every shot leaves a puff of smoke that swells
 * and drifts downwind, glowing where the sunset shines through it. Shot that
 * falls short throws up a column of spray.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sea battle",
  category: "scenes",
  note: "two galleons trading broadsides at dusk, smoke drifting between them",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#07060c",
  palette: [
    // the sky, deep blue overhead through violet and rose to the gold where the sun went down
    "#0e1230", "#151a40", "#1d2352", "#262c63", "#2f3474", "#3a3c80", "#342d63", "#463670", "#5c4078", "#77497c", "#93537d", "#3d2f72", "#52398a", "#6a4596",
    "#b05f7b", "#cb6c74", "#e27e6a", "#f2955e", "#f9b05a", "#fdcb6e", "#ffe39a", "#fff3cf",
    // clouds, dark with lit undersides
    "#2a2240", "#3c2c4e", "#a15a6c", "#e48e7a",
    // smoke, grey-violet in shadow to warm where the light comes through
    "#4a4256", "#625870", "#7d7287", "#9a8c9a", "#b9a6a6", "#d6bba8", "#efcfae", "#8b6a6e",
    // gun flashes
    "#fff8e0", "#ffe7a0", "#ffc25a", "#ff9433", "#e8641e",
    // the sea
    "#0a0a16", "#110f20", "#18152b", "#221c36", "#2f2442", "#463050", "#6c4258", "#9c5a5c", "#d48a62",
    // hulls
    "#0c0809", "#160f10", "#221716", "#33221d", "#5a3420",
    // sails, lit to shadowed
    "#fbe1b8", "#f2c79a", "#e0a881", "#c7896e", "#a36d62", "#7b5560", "#56415a",
    // spray
    "#e8e6ef", "#b9bccf",
  ],
} satisfies Meta;

const W = 200, H = 100;
const LOOP = 10;
const HZ = 62; // the horizon
const SUN = [106, 63]; // where the sun went down
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, SEA = 1, HULL = 2, SAIL = 3, RIG = 4, PORT = 5;

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

/*
 * A galleon, broadside on, drawn in its own units: lx from the stern (0) to the bow (60), ly up from the waterline.
 * Returns 0 for air, else 1 hull, 2 sail, 3 rigging, 4 a gunport (with its number and row), and for a sail also how
 * far across it the point is (0 to 1, stern side to bow side) and down it (0 to 1), to shade it as billowing cloth.
 */
const MASTS = [
  [13, 31, 0.72, 2], // mizzen: where it stands, how tall, the size of its sails, how many
  [30, 44, 1, 3], // main
  [45.5, 39, 0.88, 3], // fore
];
// a mast's square sails, bottom to top, for a mast whose sails are size 1: the yard, the foot, the half-width
const TIERS = [
  [21, 11.5, 8.6],
  [31, 22.5, 7.2],
  [38.5, 32, 5.4],
];
function galleon(lx: number, ly: number): [number, number, number] {
  if (ly < 0) return [0, 0, 0];
  // square sails, bellied out by the wind so each foot curves down
  for (const [mx, , sz, n] of MASTS)
    for (let i = 0; i < n; i++) {
      const [yard, foot, hw0] = TIERS[i];
      const top = 9 + (yard - 9) * sz, bot = 9 + (foot - 9) * sz + (i === 0 && sz < 1 ? 1 : 0), hw = hw0 * sz;
      const uu = (lx - mx + hw) / (2 * hw);
      if (uu < 0 || uu > 1) continue;
      const belly = Math.sin(uu * Math.PI);
      if (ly > top || ly < bot - 1.6 * belly) continue;
      return [2, uu, (top - ly) / (top - bot + 1.6 * belly)];
    }
  // a spritsail hanging under the bowsprit
  if (lx > 57 && lx < 66 && ly > 6.5 - 0.8 * Math.sin(((lx - 57) / 9) * Math.PI) && ly < 11.5 + (lx - 57) * 0.35) return [2, (lx - 57) / 9, clamp((11.5 + (lx - 57) * 0.35 - ly) / 6)];
  // the hull: a high stern castle, a waist, a raised forecastle, a raked stem and a beakhead
  const sheer = 6.5 + 6.5 * smooth(15, 3, lx) + 2.2 * smooth(44, 52, lx);
  const stern = -ly * 0.22;
  const stem = 55 + ly * 0.45;
  if (lx >= stern && lx <= stem && ly < sheer) {
    for (const py of [2.8, 5.4])
      if (Math.abs(ly - py) < 0.75)
        for (let i = 0; i < 9; i++) if (Math.abs(lx - (11 + i * 4.6)) < 0.85) return [4, i, py > 4 ? 1 : 0];
    // the stern windows' gallery
    if (lx < 4 && ly > 8 && ly < 11.5 && Math.abs(((ly - 8) % 1.6) - 0.8) < 0.45) return [4, -1, 2];
    return [1, 0, 0];
  }
  if (lx > 55 && lx < 61 && ly > 5.5 && ly < 7.2 - (lx - 55) * 0.2) return [1, 0, 0];
  // a lantern on the taffrail
  if (Math.abs(lx - 1.5) < 0.6 && ly > 13 && ly < 14.5) return [4, -1, 2];
  // masts, the bowsprit, and the stays that hold them
  for (const [mx, mh] of MASTS) if (Math.abs(lx - mx) < 0.45 && ly < mh) return [3, 0, 0];
  if (seg(lx, ly, 52, 8.5, 72, 16.5) < 0.45) return [3, 0, 0];
  if (seg(lx, ly, 45.5, 39, 71, 16.2) < 0.28 || seg(lx, ly, 13, 31, 0, 13.5) < 0.28) return [3, 0, 0];
  return [0, 0, 0];
}

// the two ships: where the stern sits, which way the bow points, the waterline, and how big
const SHIPS = [
  { x: 6, dir: 1, wl: 82, s: 1.05 },
  { x: 192, dir: -1, wl: 70, s: 0.78 },
];
// each ship's guns fire in a ripple, bow to stern, then the other ship answers
const VOLLEY = [-0.5, 4.5];
const GAP = 0.13;

export default function seaBattle(): Frame {
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
  const owner = new Int8Array(N).fill(-1);
  const portNo = new Int8Array(N).fill(-1);
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  const floorA = new Float32Array(N).fill(0.06);

  // --- the sky -----------------------------------------------------------------
  const skyAt = (x: number, y: number): [number, number, number] => {
    const v = clamp(y / HZ);
    const glowX = Math.exp(-Math.abs(x - SUN[0]) / 70);
    let a = smooth(0, 0.55, v);
    let r = mix(0.04, 0.22, a), g = mix(0.05, 0.1, a), b = mix(0.17, 0.4, a);
    a = smooth(0.4, 0.85, v);
    r = mix(r, 0.66, a), g = mix(g, 0.3, a), b = mix(b, 0.42, a);
    a = smooth(0.7, 1, v) * (0.45 + 0.55 * glowX);
    r = mix(r, 1, a), g = mix(g, 0.6, a), b = mix(b, 0.32, a);
    // the brightest band right where the sun went down
    const dx = x - SUN[0], dy = (y - SUN[1]) * 2.4;
    const sun = Math.exp(-Math.sqrt(dx * dx + dy * dy) / 9) * 0.55 + Math.exp(-Math.sqrt(dx * dx + dy * dy) / 30) * 0.2;
    r += sun, g += sun * 0.8, b += sun * 0.45;
    const veil = 0.9 + 0.2 * fbm(x * 0.03, y * 0.08, 3, 0);
    return [r * veil, g * veil, b * veil];
  };

  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      let m = SKY, cr: number, cg: number, cb: number, fl = 0.06;
      if (y < HZ) [cr, cg, cb] = skyAt(xc, y);
      else {
        m = SEA;
        cr = 0, cg = 0, cb = 0;
        fl = 0.04;
      }
      // the ships, nearer one last
      for (let si = SHIPS.length - 1; si >= 0; si--) {
        const S = SHIPS[si];
        const lx = ((xc - S.x) * S.dir) / S.s, ly = (S.wl - y) / S.s;
        const [part, pu, pv] = galleon(lx, ly);
        if (!part) continue;
        owner[k] = si;
        // the side toward the sun takes its light
        const toward = smooth(-25, 25, (SUN[0] - xc) * S.dir) * (si === 0 ? 1 : 0.85);
        if (part === 1) {
          m = HULL;
          const plank = Math.abs(((ly * 2.2) % 1) - 0.5) < 0.12 ? 0.75 : 1;
          const wale = Math.abs(ly - 4.1) < 0.35 || Math.abs(ly - 6.7) < 0.3 ? 1.6 : 1;
          cr = 0.07 * plank * wale, cg = 0.045 * plank * wale, cb = 0.045 * plank * wale;
          // the gilt of the stern castle catches the sky
          if (lx < 15 && ly > 6) (cr += 0.08 * toward), (cg += 0.04 * toward);
          fl = 0.03;
        } else if (part === 2) {
          m = SAIL;
          // the sunset through the canvas: bright at the sail's middle and on the side toward the sun, a shadow under each yard
          const across = S.dir > 0 ? pu : 1 - pu;
          const belly = Math.sin(pu * Math.PI) * 0.35 + 0.65;
          const lit = clamp(0.35 + 0.5 * across * toward + 0.25 * belly - 0.35 * smooth(0.2, 0, pv) - 0.2 * pv * pv);
          cr = mix(0.25, 1.05, lit), cg = mix(0.16, 0.8, lit), cb = mix(0.24, 0.58, lit);
          fl = 0.12;
        } else if (part === 3) {
          m = RIG;
          cr = 0.06, cg = 0.04, cb = 0.05;
          fl = 0.03;
        } else {
          m = PORT;
          portNo[k] = pu;
          cr = pv === 2 ? 0.8 : 0.08, cg = pv === 2 ? 0.48 : 0.02, cb = pv === 2 ? 0.18 : 0.02;
          fl = pv === 2 ? 0.25 : 0.02;
        }
        break;
      }
      mat[k] = m;
      R[k] = cr, G[k] = cg, B[k] = cb;
      floorA[k] = fl;
    }
  // what the sea mirrors: the sky and the ships before anything moves over them
  const RR = R.slice(), RG = G.slice(), RB = B.slice(), RM = mat.slice();

  // thin streaks of cloud, their undersides lit by the set sun, drifting slowly; they wrap so they can drift forever
  const CW = 400, C0 = 8, C1 = 50;
  const cdens = (x: number, y: number) => fbm(x * 0.016, y * 0.14, 4, CW * 0.016) - 0.28 * (1 - smooth(C0, C0 + 10, y) * smooth(C1, C1 - 10, y));
  const ccov = new Float32Array(CW * (C1 - C0)), clit = new Float32Array(CW * (C1 - C0));
  for (let r = C0; r < C1; r++)
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5, d = cdens(x, y);
      ccov[(r - C0) * CW + x] = smooth(0.6, 0.74, d);
      clit[(r - C0) * CW + x] = clamp(0.5 + (d - cdens(x - 1, y + 2)) * 7);
    }

  // the guns: where each muzzle is on screen, in firing order
  const guns: { x: number; y: number; dir: number; t: number; ship: number; port: number }[] = [];
  for (let si = 0; si < SHIPS.length; si++) {
    const S = SHIPS[si];
    // the side facing the enemy is the one toward the viewer's middle; ports fire bow to stern
    for (let i = 8; i >= 0; i--) {
      const lx = 11 + i * 4.6;
      // each port fires from one of its two decks, alternately, so the smoke rolls out at two heights
      const py = i & 1 ? 5.4 : 2.8;
      guns.push({ x: S.x + lx * S.s * S.dir, y: S.wl - py * S.s, dir: si === 0 ? 1 : -1, t: VOLLEY[si] + (8 - i) * GAP, ship: si, port: i });
    }
  }
  // a smoke texture to break each puff up into billows
  const TW = 64;
  const smokeTex = new Float32Array(TW * TW);
  for (let y = 0; y < TW; y++) for (let x = 0; x < TW; x++) smokeTex[y * TW + x] = fbm(x * 0.12, y * 0.12, 4, TW * 0.12);
  const tex = (x: number, y: number) => smokeTex[((((y | 0) % TW) + TW) % TW) * TW + ((((x | 0) % TW) + TW) % TW)];

  // shot that falls short: where it lands and when
  const splashes = guns
    .filter((_, i) => i % 2 === 1)
    .map((g, i) => ({ x: g.dir > 0 ? 112 + hash(i, 3) * 40 : 52 + hash(i, 4) * 50, wl: g.dir > 0 ? 71 + hash(i, 5) * 3 : 76 + hash(i, 6) * 6, t: g.t + 0.55 + hash(i, 7) * 0.3, h: 4 + hash(i, 8) * 4 }));

  const smoke = new Float32Array(N), slit = new Float32Array(N), flash = new Float32Array(N);
  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[(Math.floor(k / W) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }
  const TAU = Math.PI * 2;

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const cdrift = (u / LOOP) * 24; // the clouds move a little over a loop, and wrap back unseen at its end
    smoke.fill(0);
    slit.fill(0);
    flash.fill(0);

    // every shot's smoke: a puff blown out toward the enemy that swells, rises and drifts downwind as it thins;
    // the last volleys' smoke is still drifting when the next is fired
    for (const g of guns) {
      const a = (((u - g.t) % LOOP) + LOOP) % LOOP;
      const out0 = 6 * (1 - Math.exp(-a * 2.2));
      const cx = g.x + g.dir * out0 + a * 1.1, cy = g.y - a * 0.7 - 1;
      const rad = 2 + 3.3 * Math.sqrt(a);
      const dens = Math.exp(-a / 4.2) * smooth(0, 0.08, a) * 0.85;
      if (dens < 0.07) continue;
      const x0 = Math.max(0, Math.floor(cx - rad * 1.6)), x1 = Math.min(W - 1, Math.ceil(cx + rad * 1.6));
      const y0 = Math.max(0, Math.floor(cy - rad * 1.2)), y1 = Math.min(H - 1, Math.ceil(cy + rad * 1.2));
      const ox = g.x * 3.1 + g.port * 7, oy = g.y * 2.3;
      for (let r = y0; r <= y1; r++)
        for (let x = x0; x <= x1; x++) {
          const dx = (x + 0.5 - cx) / rad, dy = (r + 0.5 - cy) / (rad * 0.75);
          const q = dx * dx + dy * dy;
          if (q > 2.6) continue;
          const billow = tex(x - a * 3 + ox, r + a * 2 + oy);
          const d = Math.exp(-q * 1.1) * dens * (0.5 + 1.1 * billow);
          const k = r * W + x;
          smoke[k] += d;
          // the side of each billow toward the sky's glow is lit
          slit[k] += d * clamp(0.4 + (billow - tex(x - a * 3 + ox + 1.5, r + a * 2 + oy + 1.5)) * 5);
        }
      // the flash: a burst at the muzzle in its first moments, lighting all around it
      if (a < 0.35) {
        const f = Math.exp(-a * 9);
        for (let r = Math.max(0, Math.floor(g.y - 9)); r <= Math.min(H - 1, Math.floor(g.y + 9)); r++)
          for (let x = Math.max(0, Math.floor(g.x - 16)); x <= Math.min(W - 1, Math.floor(g.x + 16)); x++) {
            const dx = x + 0.5 - g.x - g.dir * 2.5, dy = (r + 0.5 - g.y) * 1.4;
            const d2 = dx * dx * (g.dir * dx > 0 ? 0.35 : 1.4) + dy * dy;
            flash[r * W + x] += f * (Math.exp(-d2 / 3) * 2.2 + Math.exp(-Math.sqrt(d2) / 5) * 0.5);
          }
      }
    }

    // the battle's smoke lying low on the water between the ships, drifting downwind
    for (let r = 46; r < 84; r++)
      for (let x = 20; x < 186; x++) {
        const y = r + 0.5;
        const b = tex(x * 0.7 - u * 6.4, y * 1.3) * smooth(46, 60, y) * smooth(84, 72, y) * smooth(20, 60, x) * smooth(186, 150, x);
        const d = smooth(0.42, 0.75, b) * 0.6;
        if (d <= 0) continue;
        const k = r * W + x;
        smoke[k] += d;
        slit[k] += d * clamp(0.45 + (b - tex(x * 0.7 - u * 6.4 + 1.5, y * 1.3 + 1.5)) * 4);
      }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x, m = mat[k];
        let cr = R[k], cg = G[k], cb = B[k], fl = floorA[k];
        if (m === SKY && r >= C0 && r < C1) {
          const sx = x + cdrift, ix = Math.floor(sx), fx = sx - ix;
          const i0 = (r - C0) * CW + (ix % CW), i1 = (r - C0) * CW + ((ix + 1) % CW);
          const c = ccov[i0] + (ccov[i1] - ccov[i0]) * fx;
          if (c > 0.01) {
            const l = clit[i0] + (clit[i1] - clit[i0]) * fx;
            const sun = l * (0.4 + 0.6 * smooth(C0, C1, y)) * (0.5 + 0.5 * Math.exp(-Math.abs(x - SUN[0]) / 80));
            const a = c * 0.85;
            cr = mix(cr, mix(0.17, 1, sun), a), cg = mix(cg, mix(0.08, 0.5, sun), a), cb = mix(cb, mix(0.24, 0.42, sun), a);
          }
        }
        if (m === SEA) {
          // the sky and the ships, upside down and broken by the swell
          const p = (y - HZ) / (H - HZ);
          const sw = Math.sin(x * 0.19 / (0.22 + p) + y * 1.25 - (TAU * 3 * u) / LOOP) + 0.55 * Math.sin(x * 0.06 - y * 0.8 + (TAU * 2 * u) / LOOP);
          let sx = Math.round(x + sw * 1.2 * p);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          // a reflection is of what stands on the water: each ship mirrors about its own waterline
          let sr = Math.round(HZ - 1 - (y - HZ) * 1.15 + sw * (0.3 + 2.2 * p));
          for (let si = 0; si < SHIPS.length; si++) {
            const S = SHIPS[si];
            if (y > S.wl && y < S.wl + 30 * S.s) {
              const mr = Math.round(S.wl - (y - S.wl) * 1.1 + sw * (0.8 + 2.6 * p));
              if (mr >= 0 && mr < H && owner[mr * W + sx] === si) sr = mr;
            }
          }
          sr = sr < 0 ? 0 : sr > H - 1 ? H - 1 : sr;
          const j = sr * W + sx;
          const lit = RM[j] === SKY ? 0.55 * (1 - 0.45 * p) : 0.2 * Math.max(0, 0.6 + 0.4 * sw);
          cr = RR[j] * lit, cg = RG[j] * lit, cb = RB[j] * lit + 0.02;
          // the sun's path on the water, glittering
          const path = Math.exp(-Math.abs(x + 0.5 - SUN[0]) / (3 + p * 22)) * smooth(-0.1, 1.2, sw) * 0.85 * (1 - p * 0.5);
          cr += path, cg += path * 0.62, cb += path * 0.3;
          // and every flash laid on the water beneath it as a streak
          const fr = r - 3 * Math.round(1 + p * 2);
          if (fr > HZ) {
            const fv = flash[fr * W + x] * 0.5 * smooth(-0.3, 0.8, sw);
            cr += fv, cg += fv * 0.6, cb += fv * 0.25;
          }
        }
        // the smoke, over everything
        const s = smoke[k];
        if (s > 0.02) {
          const a = clamp(s * 0.9);
          const l = slit[k] / s;
          const glowNear = Math.exp(-Math.abs(x + 0.5 - SUN[0]) / 45) * (1 - 0.6 * clamp((HZ - y) / HZ));
          const lr = mix(0.32, 1, l * (0.45 + 0.55 * glowNear)), lg = mix(0.28, 0.72, l * (0.4 + 0.6 * glowNear)), lb = mix(0.36, 0.58, l * (0.35 + 0.5 * glowNear));
          cr = mix(cr, lr, a), cg = mix(cg, lg, a), cb = mix(cb, lb, a);
          fl = mix(fl, 0.14, a);
        }
        // gun flashes light the hulls, the smoke and the air
        const f = flash[k];
        if (f > 0.01) {
          const lit = m === SAIL ? 0.5 : 1;
          cr += f * lit, cg += f * 0.66 * lit, cb += f * 0.28 * lit;
          if (m === PORT) (cr = Math.max(cr, 1)), (cg = Math.max(cg, 0.85)), (cb = Math.max(cb, 0.5));
        }
        cr = tone[Math.max(0, Math.min(1024, (cr * 256) | 0))], cg = tone[Math.max(0, Math.min(1024, (cg * 256) | 0))], cb = tone[Math.max(0, Math.min(1024, (cb * 256) | 0))];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.02);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const sc = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * sc), clamp(cg * sc), clamp(cb * sc));
        }
      }
    }

    // spray where shot falls short: a column that leaps up and falls back
    for (const sp of splashes) {
      const a = (((u - sp.t) % LOOP) + LOOP) % LOOP;
      if (a > 1.1) continue;
      const h = sp.h * Math.sin((a / 1.1) * Math.PI);
      for (let i = 0; i < 18; i++) {
        const fx = sp.x + (hash(i, sp.x | 0) - 0.5) * (2 + a * 3), fy = sp.wl - h * Math.pow(hash(i + 9, sp.x | 0), 0.6);
        const x = Math.round(fx), r = Math.round(fy);
        if (x < 0 || x >= W || r < 0 || r >= H) continue;
        const k = r * W + x;
        out[k] = i < 6 ? "●" : "•";
        if (color) color[k] = nearest(0.92, 0.91, 0.95);
      }
    }

    // pennants streaming from the mainmasts
    for (let si = 0; si < SHIPS.length; si++) {
      const S = SHIPS[si];
      const bx = S.x + 30 * S.s * S.dir, by = S.wl - 42 * S.s;
      for (let i = 0; i < 12; i++) {
        const x = Math.round(bx + i * 0.9), r = Math.round(by + Math.sin(i * 0.7 - (TAU * 5 * u) / LOOP) * (i / 12) * 1.2 + i * 0.08);
        if (x < 0 || x >= W || r < 0) continue;
        const k = r * W + x;
        out[k] = i < 6 ? "•" : "·";
        if (color) color[k] = si === 0 ? nearest(0.75, 0.1, 0.1) : nearest(0.06, 0.05, 0.06);
      }
    }

    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
