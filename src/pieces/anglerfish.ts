/*
 * anglerfish: a deep-sea anglerfish, side on and facing left: a round dark
 * body, a huge jaw full of needle teeth, a tiny eye, ragged fins, and a lure
 * on a stalk dangling in front of its mouth. The lure glows and fades, and as
 * it brightens it lights the teeth and the edge of the face; the jaw gapes and
 * closes slowly, the fish drifts a pixel or two, and bubbles rise.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. The body is a disc with the mouth cut out of
 * it; the lower jaw is drawn apart and leaned up a pixel at a time to close
 * it. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "anglerfish",
  category: "scenes",
  note: "a deep-sea anglerfish, its glowing lure lighting needle teeth",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // the body, iron where the light catches it, the sea, the lure, bone
  palette: ["#59616f", "#8a94a6", "#3a7ca5", "#f2b632", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BODY = 1, RIM = 2, SEA = 3, GOLD = 4, BONE = 5;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
};
const disc = (p: Uint8Array, cx: number, cy: number, rx: number, ry: number, k: number) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) set(p, x, y, k);
};
const line = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number, thick = 1) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) rect(p, Math.round(x0 + ((x1 - x0) * i) / n - (thick - 1) / 2), Math.round(y0 + ((y1 - y0) * i) / n - (thick - 1) / 2), thick, thick, k);
};
// Rows of characters as pixels `scale` across: "." leaves the pixel alone, "_" empties it, others are looked up in `keys`.
const sprite = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>, scale = 1) => {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== ".") rect(p, x + i * scale, y + j * scale, scale, scale, c === "_" ? 0 : keys[c]);
    }),
  );
};
// The canvas as half blocks. A cell has one ink: where its two pixels differ, the one further down the palette.
const emit = (p: Uint8Array, color?: Uint8Array) => {
  const out: string[] = [];
  for (let y = 0; y < meta.rows; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      const a = p[2 * y * W + x], b = p[(2 * y + 1) * W + x];
      row += a && b ? "█" : a ? "▀" : b ? "▄" : " ";
      if (color) color[y * W + x] = Math.max(a, b, 1) - 1;
    }
    out.push(row);
  }
  return out.join("\n");
};
// Lay one canvas over another, with a black gap cut around everything on it.
const over = (p: Uint8Array, q: Uint8Array, gap = 1) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
};
// A filled polygon, a pixel at a time.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    pts.forEach(([x0, y0], i) => {
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    });
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) set(p, x, y, k);
  }
};
// A limb: a round brush of radius `r` dragged through the points.
const tube = (p: Uint8Array, pts: number[][], r: number, k: number) => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let j = 0; j <= n; j++) disc(p, Math.round(x0 + ((x1 - x0) * j) / n), Math.round(y0 + ((y1 - y0) * j) / n), r, r, k);
  }
};
const canvas = () => new Uint8Array(W * H);

// ---- the fish

const LOOP = 8;
const HX = 47; // the column the jaw hinges on
const lip = (x: number) => 40 - 0.8 * (HX - x); // the upper lip at a column
const UPPER = [[30, 8], [34, 7], [38, 6], [42, 4]]; // the upper teeth: a column and a length
const LOWER = [[18, 6], [21, 10], [24, 9], [27, 7], [32, 3], [36, 3], [40, 2], [44, 2]];
const LX = 11, LY = 18; // the lure

// A tooth: a needle `n` long from (x, y), down or up, two pixels wide at its root.
const tooth = (p: Uint8Array, x: number, y: number, n: number, dir: number, k: number) => {
  for (let i = 0; i < n; i++) set(p, x, y + dir * i, k);
  for (let i = 0; i < Math.min(2, n - 2); i++) set(p, x - dir, y + dir * i, k);
};

// The fish with its jaw closed by `shut` pixels at the chin and the lure at brightness `lit`, 0 to 2.
const fish = (shut: number, lit: number) => {
  const dim = (x: number) => (lit > 1 || (lit > 0 && x < 37) || x < 25 ? BONE : RIM);
  // the fins, behind: ragged along the back, a fan of a tail, one under the belly
  const q = canvas();
  poly(q, [[49, 14], [51, 6], [54, 11], [57, 4], [60, 11], [63, 6], [65, 13], [69, 10], [69, 20]], RIM);
  poly(q, [[72, 31], [78, 21], [77, 26], [79, 28], [76, 31], [79, 34], [76, 36], [79, 40], [77, 41], [78, 46], [72, 37]], RIM);
  poly(q, [[58, 50], [66, 47], [68, 55], [65, 53], [63, 58], [61, 54], [58, 56]], RIM);
  for (const [x, y] of [[53, 9], [59, 8], [64, 10]]) rect(q, x, y, 1, 5, 0);
  line(q, 74, 33, 78, 26, 0);
  line(q, 74, 35, 78, 41, 0);

  // the body, the mouth cut out of it
  const b = canvas();
  disc(b, 51, 33, 23, 20, BODY);
  poly(b, [[66, 22], [75, 29], [75, 38], [66, 46]], BODY);
  for (let y = 0; y < H; y++) for (let x = 0; x < HX; x++) if (y > lip(x)) b[y * W + x] = 0;
  for (const [x, n] of UPPER) tooth(b, x, Math.floor(lip(x)) + 1, n, 1, dim(x));
  // pits in its hide, and the crease behind the corner of the mouth
  for (const [x, y] of [[47, 17], [52, 20], [57, 21], [63, 28], [55, 30], [60, 44], [52, 48], [66, 36], [47, 27]]) set(b, x, y, 0);
  // the eye: tiny, and ringed
  disc(b, 41, 21, 2.4, 2.4, 0);
  rect(b, 40, 20, 3, 3, BONE);
  set(b, 40, 21, 0);
  // the fin on its side
  const f = canvas();
  poly(f, [[56, 36], [66, 34], [64, 38], [69, 40], [64, 42], [67, 46], [61, 45], [58, 42]], RIM);
  line(f, 59, 38, 64, 36, 0);
  line(f, 60, 41, 65, 43, 0);
  over(b, f);
  over(q, b);

  // the lower jaw, leaned up about its hinge
  const j = canvas();
  disc(j, 51, 33, 23, 20, BODY);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (y < 42 || x >= HX + 2 + (y - 42) * 0.6) j[y * W + x] = 0;
  poly(j, [[HX + 1, 42], [20, 39], [16, 40], [15, 44], [19, 49], [28, 52], [40, 53], [HX + 6, 53]], BODY);
  for (const [x, y] of [[24, 45], [33, 48], [41, 46]]) set(j, x, y, 0);
  for (const [x, n] of LOWER) tooth(j, x, Math.floor(39 + (x - 20) * 0.107) + (x < 20 ? 1 : 0), n, -1, dim(x));
  const k = canvas();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (j[y * W + x]) set(k, x, y - Math.round((shut * Math.max(0, HX - x)) / 30), j[y * W + x]);
  over(q, k);

  // the light of the lure along the edges that face it
  for (let y = 0; y < H; y++)
    for (let x = 2; x < HX; x++) if (q[y * W + x] === BODY && !q[y * W + x - 1] && !q[y * W + x - 2] && lit > 0 && Math.hypot(x - 41, y - 21) > 5) q[y * W + x] = RIM;
  // the whole fish a little to the left, and the stalk the lure hangs from
  q.copyWithin(0, 2);
  for (let i = 0; i <= 60; i++) {
    const s = i / 60;
    set(q, (1 - s) ** 2 * 40 + 2 * s * (1 - s) * 30 + s * s * LX, (1 - s) ** 2 * 14 + 2 * s * (1 - s) * -6 + s * s * (LY - 3), RIM);
  }
  return q;
};

// The lure: a gold bulb with a bone core, and rays about it as it brightens.
const lure = (p: Uint8Array, x: number, y: number, lit: number) => {
  const r = [2.3, 2.9, 3.5][lit];
  disc(p, x, y, r + 1, r + 1, 0);
  disc(p, x, y, r, r, GOLD);
  disc(p, x, y, [0.8, 1.3, 2.2][lit], [0.8, 1.3, 2.2][lit], BONE);
  if (lit > 0)
    for (let i = 0; i < 8; i++) {
      const c = Math.cos((i * Math.PI) / 4), s = Math.sin((i * Math.PI) / 4), a = r + 2.2, n = lit > 1 && i % 2 === 0 ? 3 : lit > 1 ? 1.5 : 0.5;
      if (i === 2) continue; // not across the stalk
      line(p, x + c * a, y - s * a, x + c * (a + n), y - s * (a + n), GOLD);
    }
};

export default function anglerfish(): Frame {
  // what can be drawn ahead: the fish at each gape and each brightness
  const fishes = [0, 1, 2, 3, 4, 5].map((shut) => [0, 1, 2].map((lit) => fish(shut, lit)));

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, turn = (u / LOOP) * 2 * Math.PI;
    const p = canvas();
    // bubbles, rising from the mouth
    for (const [x, at] of [[24, 0], [31, 14], [20, 27]]) {
      const y = 34 - ((u * 5 + at) % 40), bx = x + Math.round(Math.sin(y / 5 + at));
      if (y < 30) {
        disc(p, bx, y, 2.2, 2.2, SEA);
        if (y % 13 < 9) disc(p, bx, y, 1.1, 1.1, 0);
      }
    }
    const lit = Math.round(1 + Math.cos(turn * 4)), shut = Math.round(2.5 - 2.5 * Math.cos(turn));
    const ox = Math.round(Math.sin(turn)), oy = Math.round(Math.sin(turn * 2 + 0.6) * 0.9);
    const q = canvas(), src = fishes[shut][lit];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (src[y * W + x]) set(q, x + ox, y + oy, src[y * W + x]);
    over(p, q);
    lure(p, LX + ox, LY + oy, lit);
    return emit(p, color);
  };
}
