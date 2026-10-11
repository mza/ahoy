/*
 * pirate cove: a hidden cove at sunset. A ship lies careened on the beach,
 * heeled over so her crew can scrape her hull, her masts reaching toward the
 * sun as it goes down into a burning sea. Palms lean from the headlands, a
 * campfire throws sparks into the dusk, and the surf rolls in and slides back.
 *
 * Shaded in colour cell by cell, then drawn as a halftone: each cell is a dot
 * sized by its brightness, ordered-dithered, in the palette colour nearest its
 * hue, with the colour brightened or dimmed to make up for the dot's size.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "pirate cove",
  category: "scenes",
  note: "a ship careened on the beach of a hidden cove, a campfire at sunset",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#0a0510",
  palette: [
    "#1a0f2e", "#25143d", "#33194c", "#45205a", "#5a2765", "#723070", "#8c3a76", "#a8467a",
    "#c4547a", "#dc6677", "#ee7e72", "#f7996e", "#fcb46c", "#ffcd72", "#ffe39a", "#fff3cc", "#fffbee",
    "#2a1622", "#3b1d29", "#4f2630", "#683238", "#86423e", "#a65644", "#c66c4c",
    "#e88a3e", "#f3a23a", "#ffbe48", "#ffd86a",
    "#c23a24", "#e2542a", "#8a2a2a",
    "#120a16", "#1c1020", "#28152b", "#341b33",
    "#4a3a6a", "#6a4c86", "#8a60a0",
    "#3a2a3a", "#5a3e4a", "#7a5458", "#9c6c66", "#c08a78",
    "#f0d8c8", "#ffffff",
  ],
} satisfies Meta;

const W = 200, H = 100;
const HZ = 54; // the sea horizon
const SUN = [124, 52];
const FIRE = [146, 89];
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const SKY = 0, SEA = 1, LAND = 2, SAND = 3, HULL = 4, RIG = 5, PALM = 6, FLAME = 7, CREW = 8;

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

function seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax, dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  const ex = ax + dx * k - px, ey = ay + dy * k - py;
  return [Math.sqrt(ex * ex + ey * ey), k];
}

// where the beach meets the water: furthest out in the middle of the cove
const shoreAt = (x: number) => 73 + 9 * Math.pow((x - 108) / 100, 2) + 1.2 * Math.sin(x * 0.07);

// palms: foot, height, lean, how far their fronds droop, how they sway
const PALMS: [number, number, number, number, number][] = [
  [10, 26, 0.9, 1, 0.3], [24, 30, -0.35, 1.1, 1.7], [38, 22, 0.55, 0.9, 2.6],
  [178, 24, -0.5, 1, 0.9], [190, 30, -0.9, 1.1, 2.2],
  [166, 44, -1.25, 1.2, 4.1], // the tall one leaning in from the right, nearest of all
];

export default function pirateCove(): Frame {
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
  const warmth = new Float32Array(N); // how much of the fire's light each cell takes

  // --- sky: violet overhead burning down to gold at the sun ----------------
  const skyAt = (x: number, y: number): [number, number, number] => {
    const v = clamp(y / HZ);
    let a = smooth(0, 0.55, v);
    let r = mix(0.16, 0.42, a), g = mix(0.08, 0.15, a), b = mix(0.3, 0.42, a);
    a = smooth(0.45, 0.85, v);
    r = mix(r, 0.86, a), g = mix(g, 0.36, a), b = mix(b, 0.38, a);
    a = smooth(0.75, 1, v);
    r = mix(r, 1, a), g = mix(g, 0.62, a), b = mix(b, 0.3, a);
    const dx = x - SUN[0], dy = (y - SUN[1]) * 1.6;
    const d = Math.sqrt(dx * dx + dy * dy);
    const glow = Math.exp(-d / 10) * 0.6 + Math.exp(-d / 40) * 0.3;
    r += glow, g += glow * 0.72, b += glow * 0.35;
    const veil = 0.9 + 0.2 * fbm(x * 0.03, y * 0.09, 3, 0);
    return [r * veil, g * veil, b * veil];
  };

  // the headlands that close the cove: high and wooded on the left, lower on the right
  const leftTop = (x: number) => 30 + Math.pow(clamp(x / 52), 1.3) * 28 + 3 * fbm(x * 0.08, 1, 3, 0);
  const rightTop = (x: number) => HZ + 2 - Math.pow(clamp((x - 156) / 44), 1.2) * 22 + 2.5 * fbm(x * 0.08, 5, 3, 0);

  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const k = r * W + x, y = r + 0.5, xc = x + 0.5;
      let m = SKY, cr = 0, cg = 0, cb = 0, fl = 0.08, warm = 0;
      if (y < HZ) [cr, cg, cb] = skyAt(xc, y);
      else if (y < shoreAt(xc)) m = SEA;
      else {
        m = SAND;
        // sand rose in the afterglow, cooler and darker toward us
        const near = smooth(shoreAt(xc), H, y);
        const tex = 0.85 + 0.3 * fbm(xc * 0.2, y * 0.5, 3, 0) + 0.12 * (hash(x, r) - 0.5);
        (cr = mix(0.4, 0.09, near) * tex), (cg = mix(0.19, 0.04, near) * tex), (cb = mix(0.22, 0.08, near) * tex);
        // wet sand at the waterline mirrors the sky
        const wet = smooth(shoreAt(xc) + 3, shoreAt(xc), y);
        (cr = mix(cr, 0.85, wet * 0.5)), (cg = mix(cg, 0.45, wet * 0.5)), (cb = mix(cb, 0.42, wet * 0.5));
        warm = 1;
      }
      const lt = leftTop(xc), rt = rightTop(xc);
      if ((xc < 56 && y >= lt && y < shoreAt(xc) + 2) || (xc > 152 && y >= rt && y < shoreAt(xc) + 2)) {
        m = LAND;
        const tex = fbm(xc * 0.25, y * 0.35, 3, 0);
        const top = xc < 100 ? lt : rt;
        // dark scrub and rock, its crest rimmed by the sun behind
        (cr = 0.09 + 0.05 * tex), (cg = 0.04 + 0.02 * tex), (cb = 0.1 + 0.04 * tex);
        const rim = smooth(top + 1.6, top, y) * (xc < 100 ? smooth(20, 52, xc) : smooth(196, 158, xc));
        (cr += rim * 0.7), (cg += rim * 0.32), (cb += rim * 0.2);
        fl = 0.03;
      }
      mat[k] = m;
      (R[k] = cr), (G[k] = cg), (B[k] = cb);
      floorA[k] = fl;
      warmth[k] = warm;
    }

  const put = (x: number, r: number, m: number, cr: number, cg: number, cb: number, fl = 0.03, warm = 0.5) => {
    if (x < 0 || x >= W || r < 0 || r >= H) return;
    const k = r * W + x;
    (mat[k] = m), (R[k] = cr), (G[k] = cg), (B[k] = cb), (floorA[k] = fl), (warmth[k] = warm);
  };

  // --- the careened ship: heeled over toward the sun, her bottom bared to us --
  const O = [26, 84]; // her keel at the bow
  const AU = [0.995, 0.1]; // along the keel, bow to stern
  const AV = [0.62, -0.785]; // from the keel up toward her deck, and her masts
  const LEN = 62, DEPTH = 15;
  const det = AU[0] * AV[1] - AU[1] * AV[0];
  const local = (x: number, y: number): [number, number] => {
    const dx = x - O[0], dy = y - O[1];
    return [(dx * AV[1] - dy * AV[0]) / det, (AU[0] * dy - AU[1] * dx) / det];
  };
  const world = (u: number, v: number): [number, number] => [O[0] + u * AU[0] + v * AV[0], O[1] + u * AU[1] + v * AV[1]];
  // the depth of her hull at u: a long curve from the forefoot, square at the stern
  const hullV = (u: number) => DEPTH * (0.55 + 0.45 * smooth(0, 0.3, u / LEN)) + 3 * smooth(0.72, 0.92, u / LEN);
  const keelV = (u: number) => 3.2 * Math.pow(smooth(0.22, 0, u / LEN), 1.4);
  for (let r = 40; r < H; r++)
    for (let x = 0; x < 110; x++) {
      const [u, v] = local(x + 0.5, r + 0.5);
      if (u < 0 || u > LEN || v < keelV(u) || v > hullV(u)) continue;
      // strakes of planking along her length, weed and tar on the bared bottom, the bilge rounding
      // into shadow; the sun behind rims her deck edge and the fire lights her near side
      const strake = Math.floor(v * 0.9), seam = v * 0.9 - strake < 0.25 ? 0.3 : 1;
      const plank = (0.8 + 0.4 * hash(strake, Math.floor((u + strake * 3) / 7))) * seam;
      const bilge = 0.5 + 0.5 * Math.sin(Math.PI * clamp((v - keelV(u)) / (hullV(u) - keelV(u))));
      let cr = 0.2 * plank * bilge, cg = 0.085 * plank * bilge, cb = 0.08 * plank * bilge;
      if (v < keelV(u) + 3.2) (cr = 0.12 * plank), (cg = 0.15 * plank), (cb = 0.09 * plank);
      if (v < keelV(u) + 0.9) (cr = 0.03), (cg = 0.02), (cb = 0.02);
      const rim = smooth(hullV(u) - 1.3, hullV(u), v);
      (cr += rim * 0.75), (cg += rim * 0.36), (cb += rim * 0.2);
      put(x, r, HULL, cr, cg, cb, 0.03, 0.7);
    }
  // the shadow she casts on the sand beneath her
  for (let r = 70; r < H; r++)
    for (let x = 0; x < 110; x++) {
      const k = r * W + x;
      if (mat[k] !== SAND) continue;
      let d = 9;
      for (let j = 1; j <= 6; j++) if (r - j >= 0 && mat[k - j * W] === HULL) (d = Math.min(d, j));
      if (d < 9) {
        const sh = 0.35 + 0.1 * d;
        (R[k] *= sh), (G[k] *= sh), (B[k] *= sh);
      }
    }
  // masts, yards and the slack rigging run down to stakes in the sand
  const rig: [number, number, number, number, number][] = [];
  for (const [u, len, yard] of [[14, 36, 9], [31, 46, 12], [48, 32, 7]]) {
    const [fx, fy] = world(u, hullV(u)), [tx, ty] = world(u, hullV(u) + len);
    rig.push([fx, fy, tx, ty, 0.75]);
    for (let i = 0; i < 3; i++) {
      const [cx, cy] = world(u, hullV(u) + len * (0.35 + i * 0.25));
      const hw = yard * (1 - i * 0.25);
      rig.push([cx - AU[0] * hw, cy - AU[1] * hw, cx + AU[0] * hw, cy + AU[1] * hw, 0.5]);
    }
    rig.push([tx, ty, mix(fx, 120, 0.3) + 14, shoreAt(110) + 4, 0.3]);
  }
  rig.push([...world(0, hullV(0)), ...world(-16, hullV(0) + 7), 0.55] as [number, number, number, number, number]);
  for (const [ax, ay, bx, by, wd] of rig)
    for (let r = Math.floor(Math.min(ay, by) - 1); r <= Math.ceil(Math.max(ay, by) + 1); r++)
      for (let x = Math.floor(Math.min(ax, bx) - 1); x <= Math.ceil(Math.max(ax, bx) + 1); x++) {
        if (x < 0 || x >= W || r < 0 || r >= H || mat[r * W + x] === HULL) continue;
        if (seg(x + 0.5, r + 0.5, ax, ay, bx, by)[0] < wd) put(x, r, RIG, 0.05, 0.025, 0.05, 0, 0.2);
      }

  // the palm trunks, fixed; their fronds are drawn each frame as they sway
  const crowns: [number, number, number, number, number, number][] = [];
  for (const [px, ph, lean, droop, sway] of PALMS) {
    const by = px < 100 ? leftTop(px) + 1 : px > 160 && px < 175 ? 96 : rightTop(px) + 1;
    const tx = px + lean * ph * 0.5, ty = by - ph;
    const thick = ph > 40 ? 1.4 : 0.9;
    for (let i = 0; i <= 60; i++) {
      const s = i / 60;
      // a curving trunk, bending more toward its crown
      const x = px + (tx - px) * Math.pow(s, 1.6), y = by + (ty - by) * s;
      const wd = thick * (1 - 0.4 * s);
      for (let r = Math.floor(y - wd); r <= y + wd; r++)
        for (let xx = Math.floor(x - wd); xx <= x + wd; xx++)
          if (Math.hypot(xx + 0.5 - x, r + 0.5 - y) < wd) {
            const ring = 0.7 + 0.4 * (Math.floor(s * ph * 0.9) & 1);
            put(xx, r, PALM, 0.05 * ring, 0.025 * ring, 0.045 * ring, 0, ph > 40 ? 0.7 : 0.1);
          }
    }
    crowns.push([tx, ty, ph, droop, sway, ph > 40 ? 0.7 : 0.1]);
  }

  // men scraping the hull, and two sat by the fire: foot, height, how they move
  const crew: [number, number, number, number][] = [[44, 90, 4, 1], [58, 89, 4, 1], [71, 88, 4, 1], [140, 91, 3, 0], [153, 91, 3, 0]];
  for (const [cx, cy, h] of crew)
    for (let r = Math.floor(cy - h); r < cy; r++) {
      put(cx, r, CREW, 0.03, 0.02, 0.03, 0, 0.8);
      if (r < cy - h + 1) put(cx + 1, r, CREW, 0.03, 0.02, 0.03, 0, 0.8);
    }

  // the fire's light: how far each cell sits from it
  const glow = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - FIRE[0], dy = (r + 0.5 - FIRE[1]) * 1.6;
      const d = Math.sqrt(dx * dx + dy * dy);
      glow[r * W + x] = Math.exp(-d / 4) * 0.55 + Math.exp(-d / 14) * 0.3 + Math.exp(-d / 40) * 0.08;
    }

  // clouds: long streaks, dark violet on top, burning underneath; they wrap so they drift forever
  const CW = 520, C0 = 6, C1 = 50;
  const cdens = (x: number, y: number) =>
    fbm(x * 0.012, y * 0.12, 4, CW * 0.012) - 0.3 * (1 - smooth(C0, C0 + 10, y) * smooth(C1, C1 - 8, y));
  const ccov = new Float32Array(CW * (C1 - C0)), clit = new Float32Array(CW * (C1 - C0));
  for (let r = C0; r < C1; r++)
    for (let x = 0; x < CW; x++) {
      const y = r + 0.5, d = cdens(x, y);
      ccov[(r - C0) * CW + x] = smooth(0.55, 0.7, d);
      clit[(r - C0) * CW + x] = clamp(0.5 + (d - cdens(x, y + 2.4)) * 7);
    }

  // sparks: each rises from the fire, drifts on the breeze and dies
  const sparks: [number, number, number, number][] = [];
  for (let i = 0; i < 46; i++) sparks.push([hash(i, 201) * 3.5, 6 + hash(i, 202) * 8, hash(i, 203) * 6.28, 10 + hash(i, 204) * 18]);

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;
  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }
  const extra = new Uint8Array(N);
  const er = new Float32Array(N), eg = new Float32Array(N), eb = new Float32Array(N);
  const ef = new Float32Array(N);
  const paint = (x: number, r: number, cr: number, cg: number, cb: number, fl: number) => {
    if (x < 0 || x >= W || r < 0 || r >= H) return;
    const k = r * W + x;
    (extra[k] = 1), (er[k] = cr), (eg[k] = cg), (eb[k] = cb), (ef[k] = fl);
  };

  return (t, { color } = {}) => {
    const flick = 0.8 + 0.12 * Math.sin(t * 9.1) * Math.sin(t * 3.7 + 1) + 0.16 * (noise(t * 5, 2.2, 0) - 0.5) * 2;
    const cdrift = (((t * 0.7) % CW) + CW) % CW;
    // a wave rolls in every few seconds, breaks on the sand and slides back
    const SURF = 7;
    extra.fill(0);

    // palm fronds, swaying
    for (const [tx, ty, ph, droop, sway, warm] of crowns) {
      const n = 9, L = ph > 40 ? 17 : 11;
      for (let f = 0; f < n; f++) {
        const base = -Math.PI * 0.95 + (f / (n - 1)) * Math.PI * 0.9 + (hash(f, ph) - 0.5) * 0.25;
        const s0 = Math.sin(t * 1.3 + sway + f * 0.6) * 0.07 + Math.sin(t * 0.47 + sway) * 0.05;
        for (let i = 1; i <= 22; i++) {
          const s = i / 22;
          const a = base + s0 * s * 2;
          const x = tx + Math.cos(a) * L * s, y = ty + Math.sin(a) * L * s + droop * L * 0.55 * s * s;
          // leaflets fan off each frond, longest midway
          const fan = Math.sin(s * Math.PI) * 2.6;
          for (const off of (i & 1 ? [-fan, 0, fan] : [0])) {
            const xx = Math.round(x - Math.sin(a) * off * 0.6), yy = Math.round(y + Math.abs(off) * 0.9);
            paint(xx, yy, 0.05, 0.03, 0.05, 0);
            if (xx >= 0 && xx < W && yy >= 0 && yy < H) ef[yy * W + xx] = -1 - warm;
          }
        }
      }
      for (let r = Math.floor(ty - 1); r <= ty + 1; r++) for (let x = Math.floor(tx - 1); x <= tx + 1; x++) paint(x, r, 0.06, 0.03, 0.04, 0);
    }
    // the scrapers' poles working at the hull
    for (let i = 0; i < 3; i++) {
      const [cx, cy, h] = crew[i];
      const reach = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 2.1);
      const ex = cx + 1 + 3 + 2 * reach, ey = cy - h - 3 - 2 * reach;
      for (let s = 0; s <= 6; s++) {
        const x = Math.round(mix(cx + 1, ex, s / 6)), r = Math.round(mix(cy - h + 1, ey, s / 6));
        paint(x, r, 0.03, 0.02, 0.03, 0);
      }
    }
    // the fire: a core, its tongues, and the sparks it throws
    for (let r = FIRE[1] - 9; r <= FIRE[1]; r++)
      for (let x = FIRE[0] - 5; x <= FIRE[0] + 5; x++) {
        const dx = x + 0.5 - FIRE[0], up = FIRE[1] + 0.5 - r;
        const tongue = 4.5 + 3.5 * noise(x * 0.7, t * 6, 0) * flick;
        const width = 3.6 * (1 - up / (tongue + 1));
        if (Math.abs(dx) > width || up > tongue) continue;
        const heat = clamp(1 - up / tongue) * clamp(1 - Math.abs(dx) / (width + 0.5) * 0.7);
        paint(x, r, 1, mix(0.32, 0.92, heat), mix(0.08, 0.55, heat * heat), 0.25 + 0.5 * heat);
      }
    for (const x of [FIRE[0] - 3, FIRE[0] - 1, FIRE[0] + 1, FIRE[0] + 3]) paint(x, FIRE[1], 0.12, 0.05, 0.03, 0);
    for (const [ox, sp, ph, life] of sparks) {
      const age = ((t * sp + ph * 9) % life) / life;
      const y = FIRE[1] - 6 - age * life * 2.4;
      const x = FIRE[0] + (ox - 1.75) + Math.sin(age * 9 + ph) * 2.5 + age * 8;
      const heat = 1 - age;
      if (heat < 0.15) continue;
      paint(Math.round(x), Math.round(y), 1, 0.45 + 0.4 * heat, 0.15 + 0.3 * heat * heat, 0.15 + 0.4 * heat);
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr: number, cg: number, cb: number, fl = floorA[k], wm = warmth[k];
        if (m === SEA) {
          // the sky mirrored, darker and violet, broken into bands of swell
          const depth = (y - HZ) / (shoreAt(x) - HZ);
          const band = noise(x * 0.04 + t * 0.05, y * (0.9 - depth * 0.5) - t * 0.35, 0);
          const sr = Math.max(0, Math.min(HZ - 1, Math.round(2 * HZ - y - 1 - (band - 0.5) * 4)));
          const [sr0, sg0, sb0] = skyAt(x + 0.5, sr + 0.5);
          const dim = mix(0.75, 0.45, depth) * (0.8 + 0.4 * band);
          (cr = sr0 * dim * 0.9), (cg = sg0 * dim * 0.85), (cb = sb0 * dim + 0.03);
          // the sun's road of fire on the water
          const road = Math.exp(-Math.abs(x + 0.5 - SUN[0]) / (2 + depth * 22));
          const glit = road * smooth(0.45, 0.85, noise(x * 0.35, y * 1.6 - t * 1.1, 0)) * (1.1 - depth * 0.4);
          (cr += glit), (cg += glit * 0.66), (cb += glit * 0.3);
          // surf: two lines of breakers rolling in toward the sand
          const sh = shoreAt(x);
          for (const off of [0, 0.5]) {
            const ph = ((t / SURF + off) % 1 + 1) % 1;
            const front = sh - 9 + 9 * ph;
            const broken = smooth(0.38, 0.62, noise(x * 0.12 + off * 31, ph * 3 + off * 7, 0));
            const foam = Math.exp(-Math.abs(y - front) / 0.7) * Math.sin(Math.PI * ph) * broken * smooth(0.25, 0.7, ph + 0.2 * off);
            (cr += foam * 0.9), (cg += foam * 0.7), (cb += foam * 0.65);
          }
          fl = 0.06;
          wm = 0.15;
        } else {
          (cr = R[k]), (cg = G[k]), (cb = B[k]);
          if (m === SKY && r >= C0 && r < C1) {
            const sx = x + cdrift, ix = Math.floor(sx), fx = sx - ix;
            const i0 = (r - C0) * CW + (ix % CW), i1 = (r - C0) * CW + ((ix + 1) % CW);
            const c = ccov[i0] + (ccov[i1] - ccov[i0]) * fx;
            if (c > 0.01) {
              const l = clit[i0] + (clit[i1] - clit[i0]) * fx;
              const sun = l * (0.4 + 0.6 * smooth(C0, C1, y)) * (0.6 + 0.6 * Math.exp(-Math.abs(x - SUN[0]) / 70));
              const a = c * 0.85;
              (cr = mix(cr, mix(0.2, 1.0, sun), a)), (cg = mix(cg, mix(0.07, 0.5, sun), a)), (cb = mix(cb, mix(0.22, 0.3, sun), a));
            }
          }
          if (m === SAND) {
            // the wash of the last wave sliding back down the sand
            const sh = shoreAt(x), ph = ((t / SURF) % 1 + 1) % 1;
            const wash = smooth(0.85, 1, ph) + smooth(0.35, 0, ph) * 0.8;
            const reach = sh + 2.5 * wash;
            if (y < reach) {
              const sheen = smooth(reach, sh, y) * 0.5;
              (cr = mix(cr, 0.9, sheen)), (cg = mix(cg, 0.55, sheen)), (cb = mix(cb, 0.5, sheen));
            }
          }
        }
        if (extra[k]) {
          (cr = er[k]), (cg = eg[k]), (cb = eb[k]);
          // a frond takes as much firelight as its palm does
          if (ef[k] < 0) (wm = -ef[k] - 1), (fl = 0);
          else (fl = ef[k]), (wm = 0);
        }
        if (wm > 0) {
          const g = glow[k] * flick * wm;
          (cr += g * 1.0), (cg += g * 0.5), (cb += g * 0.18);
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
    // the sun, half down into the sea, flattened by the air
    for (let r = SUN[1] - 8; r < HZ; r++)
      for (let x = SUN[0] - 9; x <= SUN[0] + 9; x++) {
        const dx = x + 0.5 - SUN[0], dy = (r + 0.5 - SUN[1]) * 1.15;
        if (dx * dx + dy * dy > 7.5 * 7.5) continue;
        const k = r * W + x;
        // banded where the haze lies across it
        const band = Math.sin((r + t * 0.4) * 1.9) > 0.85 && r > SUN[1] - 2;
        out[k] = band ? "•" : "●";
        if (color) color[k] = nearest(1, band ? 0.75 : 0.9, band ? 0.45 : 0.62);
      }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
