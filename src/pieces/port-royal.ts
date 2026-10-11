/*
 * port royal: the pirate harbour at night, about 1690. Lamplit houses climb the
 * hill behind the quay, a church tower above them and the fort low on its spit
 * to the west; a galleon and two sloops ride at anchor with their lanterns lit,
 * and the bay holds it all upside down. Now and then a breeze breaks the
 * reflection into ripples, windows go dark and light again, and men with
 * lanterns walk the docks.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "port royal",
  category: "scenes",
  note: "the pirate harbour at night, ships at anchor in a bay full of lamplight",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#03050b",
  palette: [
    "#070b1a", "#0b1226", "#111a33", "#172242", "#1e2b52", "#283764", "#334476", "#415489",
    "#53669b", "#6a7cad", "#8494bd", "#a2afcd", "#c3cbdd", "#e2e6ee", "#f6f6f2",
    "#1a1620", "#26202a", "#352b33", "#463a3e", "#5a4a48",
    "#3a2a1c", "#5a3c20", "#7e5226", "#a86a2c", "#cf8a3a", "#e9a84c", "#f7c76a", "#ffe29a", "#fff3cf",
    "#6a2420", "#8e3228",
    "#2b3442", "#3c4757", "#56606e", "#757e8a",
    "#141d2c", "#1f2a3c",
    "#4a3a5a", "#62507a",
  ],
} satisfies Meta;

const W = 200, H = 100;
const SHORE = 62; // the waterline along the quay and the headland
const QUAY = 59.5; // the top of the wharf
const MOON = [70, 17];
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, MOUNT = 1, TOWN = 2, WINDOW = 3, FORT = 4, WHARF = 5, WATER = 6, SHIP = 7, LAMP = 8;

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

// distance from a point to a segment
function seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  const ex = ax + dx * k - px, ey = ay + dy * k - py;
  return Math.sqrt(ex * ex + ey * ey);
}

interface Ship {
  x0: number; // bow
  x1: number; // stern
  wl: number; // waterline
  deck: number; // height of the waist above the waterline
  castle: number; // height of the sterncastle
  fore: number; // height of the forecastle
  masts: [number, number, number][]; // x, top, half-width of the lowest yard
  sprit: number; // bowsprit length
}

// the ships at anchor: a big galleon in the middle of the bay, two sloops nearer the shore
const SHIPS: Ship[] = [
  { x0: 20, x1: 100, wl: 84, deck: 8, castle: 16, fore: 12, masts: [[36, 19, 12], [60, 9, 17], [83, 22, 9]], sprit: 19 },
  { x0: 150, x1: 172, wl: 67, deck: 2.6, castle: 3.8, fore: 3.2, masts: [[160, 44, 0]], sprit: 8 },
  { x0: 116, x1: 132, wl: 65, deck: 2, castle: 2.8, fore: 2.4, masts: [[123, 50, 0]], sprit: 6 },
];

export default function portRoyal(): Frame {
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
  const floorA = new Float32Array(N).fill(0.04);
  // lights that lie on the water as streaks: x, y, strength, warmth, the row the water mirrors them about
  const lights: [number, number, number, number, number][] = [];
  // windows that go dark and light again: cell, phase, how fast
  const blinkers: [number, number, number][] = [];

  // --- sky ----------------------------------------------------------------
  const skyAt = (x: number, y: number): [number, number, number] => {
    const v = clamp(y / SHORE);
    const up = smooth(0, 1, v);
    let r = mix(0.05, 0.2, up), g = mix(0.08, 0.27, up), b = mix(0.2, 0.46, up);
    // the town's glow on the haze over the hill
    const town = Math.exp(-Math.abs(y - 52) / 9) * Math.exp(-Math.pow((x - 150) / 40, 2));
    r += town * 0.2, g += town * 0.1, b += town * 0.03;
    const veil = 0.88 + 0.24 * fbm(x * 0.03, y * 0.08, 3, 0);
    r *= veil, g *= veil, b *= veil;
    // the moon's halo
    const dx = x - MOON[0], dy = y - MOON[1];
    const d = Math.sqrt(dx * dx + dy * dy);
    const halo = Math.exp(-d / 7) * 0.35 + Math.exp(-d / 30) * 0.22;
    r += halo * 0.72, g += halo * 0.8, b += halo * 0.9;
    return [r, g, b];
  };

  // the Blue Mountains far behind the town, and the hill the town climbs
  const ridge = (x: number) => 54 - 15 * smooth(90, 200, x) * (0.45 + 0.9 * fbm(x * 0.018 + 4, 1, 4, 0)) - 2 * fbm(x * 0.06, 3, 3, 0);
  const hill = (x: number) => SHORE - 1.5 - Math.max(0, x - 104) * 0.19 - 2.5 * fbm(x * 0.035, 7, 3, 0);

  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      if (y >= SHORE) {
        mat[k] = WATER;
        continue;
      }
      let [cr, cg, cb] = skyAt(xc, y);
      let m = SKY;
      if (y >= ridge(xc)) {
        m = MOUNT;
        const s = skyAt(xc, ridge(xc)), d = smooth(ridge(xc), ridge(xc) + 10, y);
        const tex = fbm(xc * 0.25, y * 0.4, 3, 0);
        const a = 0.55 + 0.3 * d + 0.2 * (tex - 0.5);
        (cr = mix(s[0], 0.05, a * 0.85)), (cg = mix(s[1], 0.075, a * 0.85)), (cb = mix(s[2], 0.16, a * 0.85));
        // the ridge line silvered by the moon
        const lip = smooth(ridge(xc) + 1.3, ridge(xc), y) * 0.5;
        (cr += lip * 0.12), (cg += lip * 0.14), (cb += lip * 0.2);
      }
      if (y >= hill(xc) && xc > 100) {
        m = TOWN;
        const tex = fbm(xc * 0.4, y * 0.5, 3, 0);
        (cr = 0.03 + 0.02 * tex), (cg = 0.03 + 0.02 * tex), (cb = 0.06 + 0.03 * tex);
      }
      // a low shore far off to the west, under the galleon's bow
      if (xc < 104 && y >= SHORE - 1.6 - 1.2 * fbm(xc * 0.08, 2, 3, 0)) {
        m = MOUNT;
        (cr = 0.05), (cg = 0.07), (cb = 0.14);
      }
      mat[k] = m;
      (R[k] = cr), (G[k] = cg), (B[k] = cb);
      floorA[k] = 0;
    }

  const put = (x: number, r: number, m: number, cr: number, cg: number, cb: number, fl = 0.04) => {
    if (x < 0 || x >= W || r < 0 || r >= H) return;
    const k = r * W + x;
    (mat[k] = m), (R[k] = cr), (G[k] = cg), (B[k] = cb), (floorA[k] = fl);
  };

  // --- the town: houses stacked up the hill, back to front ------------------
  const houses: [number, number, number, number, number][] = [];
  for (let i = 0; i < 130; i++) {
    const x = 104 + hash(i, 1) * 72;
    const top = hill(x) + 1;
    const base = mix(top + 2, QUAY, Math.pow(hash(i, 2), 0.8));
    houses.push([x, base, 3 + Math.floor(hash(i, 3) * 5), 3 + hash(i, 4) * 4, i]);
  }
  houses.sort((a, b) => a[1] - b[1]);
  const TAVERN = [134, 153]; // the tavern on the quay, drawn last and largest
  for (const [hx, base, w, h, i] of houses) {
    if (hx > TAVERN[0] - 3 && hx < TAVERN[1] + 2 && base > QUAY - 6) continue;
    const x0 = Math.round(hx - w / 2), x1 = x0 + w, wallTop = base - h, roof = 1.5 + w * 0.3;
    const lit = 0.6 + 0.6 * hash(i, 6); // the moon on the side facing it
    for (let x = x0; x < x1; x++)
      for (let r = Math.floor(wallTop - roof); r < Math.ceil(base); r++) {
        const y = r + 0.5, xc = x + 0.5;
        if (y >= base) continue;
        const u = Math.abs(xc - (x0 + x1) / 2) / (w / 2 + 0.5);
        const roofLine = wallTop - roof * (1 - u);
        if (y < roofLine) continue;
        if (y < wallTop) {
          // tiles, their ridge and the moon side catching the light
          const ridgeLit = y < roofLine + 0.9 ? 1 : 0, west = xc < (x0 + x1) / 2 ? 1 : 0;
          const s = 0.03 + 0.2 * ridgeLit * lit + 0.04 * west * lit;
          put(x, r, TOWN, s * 0.9, s * 0.95, s * 1.35);
          continue;
        }
        const side = x === x0 ? 0.035 : 0;
        put(x, r, TOWN, (0.018 + side) * lit, (0.018 + side) * lit, (0.03 + side * 1.3) * lit);
        // windows in pairs of cells, about half of them lit
        const wx = x - x0, wy = Math.floor(y - wallTop);
        if (wx % 2 === 1 && wx < w - 1 && wy % 2 === 1 && y < base - 0.8) {
          const roll = hash(x * 3 + i, r * 7);
          if (roll > 0.68) {
            const warm = 0.6 + 0.35 * hash(x, r * 5);
            put(x, r, WINDOW, 1 * warm, 0.6 * warm, 0.25 * warm, 0.1);
            if (roll > 0.9) blinkers.push([r * W + x, hash(x, r) * 40, 0.05 + 0.08 * hash(r, x)]);
            if (y > QUAY - 6 && roll > 0.8) lights.push([xc, y, 0.22, 1, SHORE]);
          }
        }
      }
  }
  // the church tower on the hill, its belfry lit
  {
    const cx = 162, base = hill(162) + 6, top = base - 17;
    for (let r = Math.floor(top - 8); r < base; r++)
      for (let x = cx - 4; x <= cx + 4; x++) {
        const y = r + 0.5, dx = Math.abs(x + 0.5 - cx);
        if (y >= top && dx <= 3) put(x, r, TOWN, dx < 1 && y > top + 2 && y < top + 4.5 ? 0.9 : 0.045, dx < 1 && y > top + 2 && y < top + 4.5 ? 0.6 : 0.045, dx < 1 && y > top + 2 && y < top + 4.5 ? 0.3 : 0.07, 0.04);
        else if (y < top && y >= top - 8 && dx <= 3.4 * (y - (top - 8)) / 8) put(x, r, TOWN, 0.05 + (x < cx ? 0.05 : 0), 0.055 + (x < cx ? 0.05 : 0), 0.08 + (x < cx ? 0.07 : 0));
      }
  }
  // the fort: a low bastioned wall with merlons, lit embrasures and a flagstaff
  const FLAG = [188, 36];
  for (let r = 40; r < SHORE; r++)
    for (let x = 174; x < W; x++) {
      const y = r + 0.5, xc = x + 0.5;
      const top = 46 + Math.max(0, 178 - xc) * 0.8;
      if (xc < 175 || y < top - 1.2 || y >= SHORE - 1.5) continue;
      const merlon = y < top ? ((x % 4) < 2 ? 1 : 0) : 1;
      if (!merlon) continue;
      const tex = 0.8 + 0.4 * fbm(xc * 0.5, y * 0.8, 2, 0);
      const edge = y < top + 0.9 ? 0.2 : 0, face = 0.035 + 0.03 * smooth(52, 49, y);
      put(x, r, FORT, (face + edge) * tex, (face + edge) * tex * 1.05, (face * 1.5 + edge * 1.3) * tex);
      // embrasures, a few with a lamp behind
      if (r === 50 && x % 6 === 3) {
        const on = hash(x, 9) > 0.35;
        put(x, r, on ? WINDOW : FORT, on ? 0.95 : 0.01, on ? 0.6 : 0.01, on ? 0.28 : 0.02, on ? 0.15 : 0);
        if (on) lights.push([xc, y, 0.4, 1, SHORE]);
      }
    }
  for (let r = FLAG[1]; r < 46; r++) put(FLAG[0], r, FORT, 0.02, 0.02, 0.03, 0);

  // the wharf along the waterline, its pilings standing in the water
  for (let x = 102; x < 176; x++) {
    for (let r = Math.floor(QUAY); r < SHORE; r++) {
      const plank = 0.6 + 0.5 * hash(x >> 1, r);
      put(x, r, WHARF, 0.06 * plank, 0.045 * plank, 0.04 * plank);
    }
    if (x % 6 === 0) for (let r = SHORE; r < SHORE + 2; r++) put(x, r, WHARF, 0.04, 0.03, 0.03);
  }
  // the tavern: the biggest house on the quay, every pane lit and the door open
  {
    const [x0, x1] = TAVERN, base = QUAY, wallTop = base - 9, roof = 5;
    for (let r = Math.floor(wallTop - roof); r < base; r++)
      for (let x = x0; x < x1; x++) {
        const y = r + 0.5, xc = x + 0.5, u = Math.abs(xc - (x0 + x1) / 2) / ((x1 - x0) / 2 + 0.5);
        if (y < wallTop - roof * (1 - u)) continue;
        if (y < wallTop) {
          put(x, r, TOWN, 0.05 + (y < wallTop - roof * (1 - u) + 0.9 ? 0.06 : 0), 0.05, 0.08);
          continue;
        }
        put(x, r, TOWN, 0.07, 0.05, 0.05);
        const dx = x - x0;
        const door = dx >= 8 && dx <= 10 && y > base - 4;
        const win = (dx === 2 || dx === 3 || dx === 5 || dx === 6 || dx === 13 || dx === 14 || dx === 16 || dx === 17) && ((y > wallTop + 1.5 && y < wallTop + 3.5) || (y > wallTop + 5 && y < wallTop + 6.6));
        if (door || win) {
          put(x, r, WINDOW, 1, door ? 0.7 : 0.66, door ? 0.32 : 0.3, 0.25);
          lights.push([xc, y, door ? 0.45 : 0.25, 1, SHORE]);
        }
      }
  }
  // the reflection source: the shore before the ships stand in front of it
  const RR = R.slice(), RG = G.slice(), RB = B.slice();

  // --- the ships ---------------------------------------------------------------
  const shipOf = new Int8Array(N).fill(-1);
  SHIPS.forEach((s, id) => {
    const len = s.x1 - s.x0;
    const deckAt = (xc: number) => {
      const u = (xc - s.x0) / len;
      // the waist low, a forecastle at the bow and a tall sterncastle aft
      // with a sheer, rising toward both ends
      return s.wl - s.deck - (s.fore - s.deck) * smooth(0.18, 0.06, u) - (s.castle - s.deck) * smooth(0.72, 0.8, u) - s.deck * 0.25 * Math.pow((u - 0.5) * 2, 2);
    };
    const keelAt = (xc: number) => {
      const u = (xc - s.x0) / len;
      return s.wl - 1.5 * Math.pow(smooth(0.25, 0, u), 1.3) * s.fore * 0.9;
    };
    const mark = (x: number, r: number, cr: number, cg: number, cb: number, fl = 0.03) => {
      if (x < 0 || x >= W || r < 0 || r >= H) return;
      put(x, r, SHIP, cr, cg, cb, fl);
      shipOf[r * W + x] = id;
    };
    // the hull
    for (let x = Math.floor(s.x0); x < s.x1; x++)
      for (let r = 0; r < H; r++) {
        const y = r + 0.5, xc = x + 0.5;
        if (y < deckAt(xc) || y >= keelAt(xc)) continue;
        const below = y - deckAt(xc);
        // dark timber, a pale wale along it, the moon on the bulwarks
        let v = 0.015 + 0.012 * hash(x, r);
        if (below < 0.9) v += 0.09;
        if (Math.abs(y - (s.wl - s.deck * 0.45)) < 0.5) v += 0.05;
        mark(x, r, v * 1.1, v, v * 0.95);
      }
    // the stern gallery's windows, a row of open gunports, and the lanterns on the poop
    const sternDeck = deckAt(s.x1 - 1);
    if (s.castle > 6) {
      for (let x = Math.round(s.x1 - len * 0.15); x < s.x1 - 1; x++)
        for (const dy of [3, 6])
          if ((x + dy) % 2 === 0) {
            const r = Math.floor(sternDeck + dy);
            mark(x, r, 0.95, 0.6, 0.25, 0.18);
            lights.push([x + 0.5, r + 0.5, 0.18, 1, s.wl]);
          }
      for (let x = Math.round(s.x0 + len * 0.2); x < s.x1 - len * 0.2; x += 4) {
        const r = Math.floor(s.wl - s.deck * 0.58);
        const on = hash(x, 3) > 0.3;
        mark(x, r, on ? 0.85 : 0.08, on ? 0.5 : 0.07, on ? 0.2 : 0.06, on ? 0.14 : 0.02);
        if (on) lights.push([x + 0.5, r + 0.5, 0.16, 1, s.wl]);
      }
      for (const dx of [0.5, 3.5, 6.5]) {
        mark(Math.floor(s.x1 - dx), Math.floor(sternDeck - 1.5), 1, 0.8, 0.42, 0.42);
        lights.push([s.x1 - dx, sternDeck - 1.5, 0.45, 1, s.wl]);
      }
    } else {
      mark(Math.floor(s.x1 - 0.5), Math.floor(sternDeck - 1.5), 1, 0.78, 0.4, 0.4);
      lights.push([s.x1 - 0.5, sternDeck - 1.5, 0.7, 1, s.wl]);
    }
    // bowsprit, masts, yards with their sails furled, the shrouds and stays
    const bow = [s.x0 + 1.5, deckAt(s.x0 + 1.5)];
    const sprit = [s.x0 - s.sprit, bow[1] - s.sprit * 0.45];
    const lines: [number, number, number, number, number][] = [[bow[0], bow[1], sprit[0], sprit[1], 0.6]];
    for (const [mx, top, yard] of s.masts) {
      const foot = deckAt(mx);
      lines.push([mx, foot, mx, top, 0.55]);
      // stays down to the deck ends, and a forestay to the bowsprit from the foremost mast
      lines.push([mx, top + 1, s.x1 - 2, deckAt(s.x1 - 2), 0.28]);
      lines.push([mx, top + 1, mx === s.masts[0][0] ? sprit[0] : bow[0] + 4, mx === s.masts[0][0] ? sprit[1] : deckAt(bow[0] + 4), 0.28]);
      if (yard > 0) {
        for (let i = 0; i < 3; i++) {
          const yy = foot - (foot - top) * (0.32 + i * 0.26), hw = yard * (1 - i * 0.24);
          lines.push([mx - hw, yy, mx + hw, yy, 0.45]);
          // the furled sail, a pale bundle along the yard
          for (let x = Math.round(mx - hw + 1); x < mx + hw - 1; x++) {
            const r = Math.floor(yy - 0.5);
            const moon = 0.7 + 0.5 * smooth(mx + hw, mx - hw, x) + 0.2 * hash(x, r);
            mark(x, r, 0.3 * moon, 0.31 * moon, 0.36 * moon, 0.06);
          }
        }
        // a lantern at the main top
        if (yard > 10) {
          mark(Math.floor(mx), Math.floor(top + 2), 1, 0.76, 0.38, 0.35);
          lights.push([mx, top + 2.5, 0.5, 1, s.wl]);
        }
      } else {
        // a sloop's boom and gaff, the mainsail furled along the boom
        const boomY = foot - 3;
        lines.push([mx, boomY, s.x1 + 2, boomY + 0.8, 0.45]);
        lines.push([mx, top + 5, s.x1 - 2, top + 9, 0.4]);
        for (let x = Math.round(mx + 1); x < s.x1 + 1; x++) mark(x, Math.floor(boomY - 0.6), 0.24, 0.25, 0.3, 0.06);
      }
    }
    for (const [ax, ay, bx, by, wd] of lines) {
      for (let r = Math.floor(Math.min(ay, by) - 1); r <= Math.ceil(Math.max(ay, by) + 1); r++)
        for (let x = Math.floor(Math.min(ax, bx) - 1); x <= Math.ceil(Math.max(ax, bx) + 1); x++) {
          const k = r * W + x;
          if (x < 0 || x >= W || r < 0 || r >= H || shipOf[k] === id) continue;
          if (seg(x + 0.5, r + 0.5, ax, ay, bx, by) < wd) {
            const v = wd > 0.5 ? 0.012 : 0.03;
            mark(x, r, v, v, v * 1.4, 0);
          }
        }
    }
  });

  // stars
  const stars: [number, number, number][] = [];
  for (let i = 0; i < 700; i++) {
    const x = Math.floor(hash(i, 91) * W), r = Math.floor(hash(i, 92) * 44);
    const k = r * W + x;
    const dm = Math.hypot(x - MOON[0], r - MOON[1]);
    if (mat[k] === SKY && dm > 14 && hash(i, 93) > 0.72) stars.push([k, hash(i, 94) * 6.28, 0.5 + hash(i, 95) * 1.6]);
  }
  // thin clouds drifting past the moon, silvered on the side it lights; they wrap so they drift forever
  const CW = 520, C0 = 4, C1 = 40;
  const cdens = (x: number, y: number) => fbm(x * 0.012, y * 0.11, 4, CW * 0.012) - 0.32 * (1 - smooth(C0, C0 + 8, y) * smooth(C1, C1 - 10, y));
  const ccov = new Float32Array(CW * (C1 - C0)), clit = new Float32Array(CW * (C1 - C0));
  for (let r = C0; r < C1; r++)
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5, d = cdens(x, y);
      ccov[(r - C0) * CW + x] = smooth(0.58, 0.72, d);
      clit[(r - C0) * CW + x] = clamp(0.5 + (d - cdens(x + 1.5, y + 1.5)) * 7);
    }
  // men walking the quay with lanterns: centre, reach, period
  const walkers: [number, number, number, number][] = [[114, 7, 23, 0.3], [164, 8, 31, 2.1], [127, 4, 19, 4]];

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }
  // which ship, if any, a water cell would mirror: the nearest one below whose waterline it lies
  const shipsAt: number[][] = Array.from({ length: W }, () => []);
  SHIPS.forEach((s, id) => {
    for (let x = Math.floor(s.x0 - s.sprit - 2); x < s.x1 + 4; x++) if (x >= 0 && x < W) shipsAt[x].push(id);
  });

  const lightsAt: number[][] = Array.from({ length: W }, () => []);
  lights.forEach(([lx], i) => {
    for (let x = Math.floor(lx - 4); x <= lx + 4; x++) if (x >= 0 && x < W) lightsAt[x].push(i);
  });

  const lr = new Float32Array(N), lg = new Float32Array(N), lb = new Float32Array(N);
  const extra = new Uint8Array(N);

  return (t, { color } = {}) => {
    // a breeze comes and goes: still water most of the time, then ripples
    const breeze = 0.15 + 0.85 * Math.pow(0.5 - 0.5 * Math.cos((t * 2 * Math.PI) / 26), 2);
    const cdrift = (((t * 0.6) % CW) + CW) % CW;

    // the walkers this frame
    extra.fill(0);
    const walking: [number, number][] = [];
    for (const [c, a, p, ph] of walkers) {
      const x = Math.round(c + a * Math.sin((t * 2 * Math.PI) / p + ph));
      walking.push([x + 0.5, QUAY - 2.5]);
      for (let r = Math.floor(QUAY - 3); r < QUAY; r++) {
        const k = r * W + x;
        (lr[k] = 0.02), (lg[k] = 0.02), (lb[k] = 0.03), (extra[k] = 1);
      }
      const k = Math.floor(QUAY - 3) * W + x + 1;
      (lr[k] = 1), (lg[k] = 0.8), (lb[k] = 0.42), (extra[k] = 2);
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr: number, cg: number, cb: number, fl = floorA[k], fade = 1;
        if (m === WATER) {
          const depth = (y - SHORE) / (H - SHORE);
          const w = noise(x * 0.12 + t * 0.15, y * 0.9 - t * 0.7, 0);
          const amp = breeze * (0.4 + 1.6 * depth);
          const wob = Math.sin(y * 1.9 - t * 1.6 + Math.sin(x * 0.11 + t * 0.5) * 1.3) * amp * 0.9;
          let sx = Math.round(x + wob);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          const tip = (w - 0.5) * 3.2 * amp;
          // the shore upside down, then any ship standing over this water
          let sr = Math.round(2 * SHORE - y - 0.5 + tip);
          sr = sr < 0 ? 0 : sr > SHORE - 1 ? SHORE - 1 : sr;
          let j = sr * W + sx;
          cr = RR[j], cg = RG[j], cb = RB[j];
          for (const id of shipsAt[x]) {
            const s = SHIPS[id];
            if (y < s.wl) continue;
            const qr = Math.round(2 * s.wl - y - 0.5 + tip);
            if (qr < 0 || qr >= H) continue;
            const q = qr * W + sx;
            if (shipOf[q] === id) {
              (cr = R[q]), (cg = G[q]), (cb = B[q]);
              break;
            }
          }
          const lit = mix(0.95, 0.72, smooth(SHORE, H, y)) * (0.85 + 0.3 * w);
          (cr *= lit), (cg *= lit), (cb = cb * lit + 0.012);
          // the moon's path, glittering where the ripples face it
          const path = Math.exp(-Math.abs(x + 0.5 - MOON[0] - wob * 0.5) / (1.5 + depth * 9 * (0.4 + breeze)));
          const glit = path * smooth(0.5, 0.85, w) * (0.35 + 0.6 * breeze);
          (cr += glit * 0.7), (cg += glit * 0.76), (cb += glit * 0.9);
          // every lamp on the shore and the ships laid on the water as a broken streak
          const broken = 0.3 + 0.9 * smooth(0.35, 0.8, noise(x * 0.6, y * 1.4 - t * 1.2, 0));
          for (const i of lightsAt[x]) {
            const [lx, ly, ls, , about] = lights[i];
            const dx = Math.abs(x + 0.5 - lx - wob * 0.6);
            if (dx > 3.5 || y < about) continue;
            const along = Math.exp(-Math.abs(y - (2 * about - ly)) / (2 + 5 * breeze + depth * 3));
            const s2 = ls * along * Math.exp(-dx / (0.45 + 1.1 * breeze + depth)) * broken;
            (cr += s2), (cg += s2 * 0.6), (cb += s2 * 0.25);
          }
          for (const [wx, wy] of walking) {
            const dx = Math.abs(x + 0.5 - wx - wob * 0.6);
            if (dx > 3) continue;
            const along = Math.exp(-Math.abs(y - (2 * SHORE - wy)) / (2 + 8 * breeze));
            const s2 = 0.6 * along * Math.exp(-dx / (0.6 + breeze)) * broken;
            (cr += s2), (cg += s2 * 0.62), (cb += s2 * 0.26);
          }
          fade = smooth(H + 3, H - 10, y);
          fl = 0.03;
        } else {
          (cr = R[k]), (cg = G[k]), (cb = B[k]);
          if (m === SKY && r >= C0 && r < C1) {
            const sx = x + cdrift, ix = Math.floor(sx), fx = sx - ix;
            const i0 = (r - C0) * CW + (ix % CW), i1 = (r - C0) * CW + ((ix + 1) % CW);
            const c = ccov[i0] + (ccov[i1] - ccov[i0]) * fx;
            if (c > 0.01) {
              const l = clit[i0] + (clit[i1] - clit[i0]) * fx;
              const near = Math.exp(-Math.hypot(x - MOON[0], (r - MOON[1]) * 1.3) / 30);
              const sun = l * (0.25 + 0.75 * near);
              const a = c * 0.8;
              (cr = mix(cr, mix(0.03, 0.42, sun), a)), (cg = mix(cg, mix(0.04, 0.46, sun), a)), (cb = mix(cb, mix(0.08, 0.58, sun), a));
            }
          }
          if (m === WINDOW || m === LAMP) {
            // the lamps breathe
            const f = 0.88 + 0.12 * noise(k * 0.37, t * 2.3, 0);
            (cr *= f), (cg *= f), (cb *= f);
          }
        }
        if (extra[k]) {
          (cr = lr[k]), (cg = lg[k]), (cb = lb[k]);
          fl = extra[k] === 2 ? 0.35 : 0;
        }
        // lamplight on the wharf round the tavern door and the walkers
        if (m === WHARF || (m === TOWN && y > QUAY - 10)) {
          const dd = Math.hypot(x - 143, (r - 57) * 1.5);
          const g = Math.exp(-dd / 3) * 0.25;
          (cr += g), (cg += g * 0.6), (cb += g * 0.25);
          for (const [wx, wy] of walking) {
            const g2 = Math.exp(-Math.hypot(x + 0.5 - wx, (y - wy) * 1.4) / 2.2) * 0.4;
            (cr += g2), (cg += g2 * 0.62), (cb += g2 * 0.26);
          }
        }

        cr = tone[Math.min(1024, (cr * 256) | 0)], cg = tone[Math.min(1024, (cg * 256) | 0)], cb = tone[Math.min(1024, (cb * 256) | 0)];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.05) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }
    // windows going dark for a while, then lit again
    for (const [k, ph, sp] of blinkers) {
      if (noise(t * sp + ph, ph, 0) < 0.4) {
        out[k] = "·";
        if (color) color[k] = nearest(0.12, 0.08, 0.06);
      }
    }
    // the moon, full, with its seas faintly darker
    for (let r = MOON[1] - 5; r <= MOON[1] + 5; r++)
      for (let x = MOON[0] - 5; x <= MOON[0] + 5; x++) {
        const dx = x + 0.5 - MOON[0], dy = r + 0.5 - MOON[1];
        if (dx * dx + dy * dy >= 4.6 * 4.6) continue;
        const k = r * W + x;
        const sea = fbm(x * 0.5, r * 0.5, 2, 0) > 0.58;
        out[k] = "●";
        if (color) color[k] = sea ? nearest(0.78, 0.82, 0.86) : nearest(0.97, 0.97, 0.94);
      }
    // stars twinkle
    for (const [k, ph, sp] of stars) {
      const s = Math.sin(t * sp + ph);
      if (s > -0.2) {
        out[k] = s > 0.75 ? "•" : "·";
        if (color) color[k] = nearest(0.82, 0.86, 1);
      }
    }
    // the fort's flag streams from its staff
    for (let i = 1; i <= 8; i++) {
      const x = FLAG[0] + i, wave = Math.sin(i * 0.9 - t * 4) * 0.6 * (i / 8);
      for (let j = 0; j < 4 - (i > 6 ? 1 : 0); j++) {
        const r = Math.round(FLAG[1] + j + wave);
        const k = r * W + x;
        const shade = 0.75 + 0.35 * Math.sin(i * 0.9 - t * 4 + 1.2);
        out[k] = shade > 0.8 ? "●" : "•";
        if (color) color[k] = nearest(0.75 * shade, 0.18 * shade, 0.14 * shade);
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
