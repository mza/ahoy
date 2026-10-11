/*
 * henry-every: the flag credited to Henry Every, the "King of Pirates": a
 * skull in profile, facing right, in a knotted bandana and with a gold hoop
 * in its ear, over crossed bones. The tails of the bandana flutter out
 * behind, the earring swings and glints, and the jaw works a little, as if
 * it were muttering.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat
 * colours. The skull is an outline filled pixel by pixel, scowling under the
 * bandana, the jaw the same turned about its hinge; right-hand edges are in
 * shade. Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "henry every",
  category: "scenes",
  note: "a skull in profile in a red bandana and gold earring, muttering",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, the bandana's red and its shade, and gold
  palette: ["#e8e2d0", "#9c9682", "#e23a2e", "#9c2a22", "#f2b632"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, RED = 3, DARK = 4, GOLD = 5;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;

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

// A shape filled from its outline, a list of corners.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) p[y * W + x] = k;
    }
};
// One canvas laid over another, with a black gap cut around it first. With `solid` the gap is cut around the whole
// of each row of it, end to end, so nothing shows through the holes in it.
const over = (dst: Uint8Array, src: Uint8Array, gap = 1, solid = false) => {
  for (let y = 0; y < H; y++) {
    let lo = W, hi = -1;
    for (let x = 0; x < W; x++) if (src[y * W + x]) (lo = Math.min(lo, x)), (hi = x);
    for (let x = lo; x <= hi; x++) if (solid || src[y * W + x]) rect(dst, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  }
  for (let i = 0; i < src.length; i++) if (src[i]) dst[i] = src[i];
};
// A bone from one end to the other: a shaft `r` either side of its middle, and two round knuckles at each end.
const bone = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number, r = 2.3, knob = 3.2) => {
  const l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l;
  for (let i = 0; i <= l * 2; i++) disc(p, x0 + (ux * i) / 2, y0 + (uy * i) / 2, r, r, k);
  for (const [x, y, s] of [[x0, y0, -1], [x1, y1, 1]])
    for (const side of [-1, 1]) disc(p, x + ux * s * 1.3 - uy * side * (knob - 0.4), y + uy * s * 1.3 + ux * side * (knob - 0.4), knob, knob, k);
};
// A colour's right-hand edges in its shade, as if lit from the left; a gap one pixel wide casts none.
const shade = (p: Uint8Array, from: number, to: number) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (p[y * W + x] === from && (x > W - 3 || (!p[y * W + x + 1] && !p[y * W + x + 2]))) p[y * W + x] = to;
};
// The same for a shape with holes in it: only the last `n` pixels of each of its rows.
const rim = (p: Uint8Array, from: number, to: number, n = 1) => {
  for (let y = 0; y < H; y++) {
    let hi = W - 1;
    while (hi >= 0 && !p[y * W + hi]) hi--;
    for (let x = hi; x > hi - n && x >= 0 && p[y * W + x] === from; x--) p[y * W + x] = to;
  }
};

// ---- the skull, facing right

// It is laid out on a larger grid and brought down to size: a point of that grid as a place on the canvas.
const K = 0.8;
const px = (x: number) => 40 + (x - 40.5) * K, py = (y: number) => 1 + (y - 3) * K;
const at = (pts: number[][]) => pts.map(([x, y]) => [px(x), py(y)]);
// The face, from the forehead round by the brow, the nose and the top teeth to the base of the skull.
const FACE = at([[44, 5], [51, 9], [55, 14], [58.5, 16.5], [59.5, 19], [57.5, 21.5], [61.5, 26.5], [57, 27.5], [56.5, 30], [59, 31.5], [59, 38.5], [45, 38.5], [44, 34], [38, 33.5], [30, 28], [36, 8]]);
// The jaw, shut: up the ramus to the hinge, along the teeth, round a jutting chin and back to its angle.
const JAW = at([[36.5, 36], [39.5, 35], [42, 36.5], [43, 40.4], [58.5, 40.4], [59.5, 43], [61, 47], [57, 50], [48, 48.5], [41, 48], [37, 44.5]]);
const HINGE = [px(39.5), py(36)];
const OPEN = [0, 5, 10]; // how far the jaw hangs open in each of its positions, in degrees
// The mutter, a step every quarter second.
const MUTTER = [0, 0, 0, 0, 1, 2, 1, 0, 1, 2, 2, 1, 0, 0, 0, 0];
const TEETH = [46, 49, 52]; // the columns of the gaps between the teeth
// Where the bandana ends on column x: lower at the back of the head than over the brow.
const band = (x: number) => 9.6 + (54 - x) * 0.23;
// A crack in the back of the skull, under the bandana, and a crease in the cloth running up from the knot.
const CRACK = [[29, 18], [29, 19], [30, 20], [31, 20], [30, 21], [31, 22], [31, 23]];
const CREASE = [[26, 11], [27, 10], [28, 9], [29, 8], [29, 7], [30, 6]];
const KNOT = [21, 16]; // where the bandana is tied
const EAR = [30, 25]; // where the earring hangs from
const LOOP = 4;

export default function henryEvery(): Frame {
  const turned = (deg: number) => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return (x: number, y: number) => [HINGE[0] + (x - HINGE[0]) * c - (y - HINGE[1]) * s, HINGE[1] + (x - HINGE[0]) * s + (y - HINGE[1]) * c];
  };
  // the jaw in each position, its teeth parted by black lines
  const jaws = OPEN.map((deg) => {
    const shut = new Uint8Array(W * H), j = new Uint8Array(W * H), back = turned(-deg), fwd = turned(deg);
    poly(shut, JAW, BONE);
    // each pixel is the one it was turned from
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const [fx, fy] = back(x, y), sx = Math.round(fx), sy = Math.round(fy);
        if (sx >= 0 && sx < W && sy >= 0 && sy < H) j[y * W + x] = shut[sy * W + sx];
      }
    for (const x of TEETH) {
      const [ax, ay] = fwd(x, 31), [bx, by] = fwd(x, 33);
      line(j, ax, ay, bx, by, 0);
    }
    rim(j, BONE, SHADE);
    return j;
  });

  // the skull: a long cranium swelling out behind, and the face
  const sk = new Uint8Array(W * H);
  disc(sk, px(37), py(19), 17 * K, 15 * K, BONE);
  disc(sk, px(31), py(22), 12 * K, 11 * K, BONE);
  poly(sk, FACE, BONE);
  // room for the jaw to swing in
  for (const j of jaws) over(sk, j, 1, true);
  for (const j of jaws) for (let i = 0; i < j.length; i++) if (j[i]) sk[i] = 0;
  // the socket, under a brow that comes down hard towards the nose
  for (let y = 10; y <= 22; y++) for (let x = 42; x <= 54; x++) if (((x - 48) / 3.9) ** 2 + ((y - 16.6) / 3.8) ** 2 < 1 && y >= 13.4 + 0.42 * (x - 44.5)) sk[y * W + x] = 0;
  // the cheekbone's arch, the ear, the teeth and the crack
  line(sk, 40, 23, 46, 23, 0);
  line(sk, 46, 23, 47, 24, 0);
  rect(sk, 35, 21, 2, 2, 0);
  for (const x of TEETH) rect(sk, x, 26, 1, 4, 0);
  for (const [x, y] of CRACK) set(sk, x, y, 0);
  // the bandana: all of the skull above its edge, a pixel proud of the bone, a black line under it
  const cloth = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (sk[y * W + x] && y < band(x) - 1) rect(cloth, x - 1, y - 1, 3, 2, RED);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (cloth[y * W + x] && y < band(x) - 1) sk[y * W + x] = RED;
      else if (sk[y * W + x] && y < band(x)) sk[y * W + x] = 0;
      // the fold of its hem
      if (sk[y * W + x] === RED && x > 26 && x < 52 && Math.floor(band(x) - y) === 4) sk[y * W + x] = 0;
    }
  for (const [x, y] of CREASE) set(sk, x, y, 0);
  rim(sk, BONE, SHADE), rim(sk, RED, DARK, 2);

  // what never moves: the bones crossed below, one over the other, the skull above them, and the knot
  const still = new Uint8Array(W * H), b = new Uint8Array(W * H);
  bone(still, 10, 44.5, 69, 58, BONE, 2.3, 2.8);
  bone(b, 69, 44.5, 10, 58, BONE, 2.3, 2.8);
  shade(still, BONE, SHADE), shade(b, BONE, SHADE);
  over(still, b);
  for (let i = 0; i < sk.length; i++) if (sk[i]) still[i] = sk[i];
  disc(still, KNOT[0], KNOT[1], 3.4, 3.4, 0);
  disc(still, KNOT[0], KNOT[1], 2.4, 2.4, RED);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    const j = jaws[MUTTER[Math.floor(u / 0.25 + 1e-6) % MUTTER.length]];
    for (let i = 0; i < j.length; i++) if (j[i]) p[i] = j[i];

    // the tails of the bandana, streaming out behind: a wave runs down each, bigger towards its end
    const ph = (u / 0.8) * 2 * Math.PI;
    for (const [y0, slope, len, ink, lag] of [[KNOT[1] + 2, 0.5, 11, DARK, 1.3], [KNOT[1] - 2, -0.3, 13, RED, 0]])
      for (let i = 0; i <= len; i++) {
        const y = Math.round(y0 + slope * i + 1.7 * (i / len) * Math.sin(i * 0.65 - ph - lag));
        const thick = i < 2 ? 2 : i > len - 1 ? 1 : i > len - 3 ? 2 : 3;
        rect(p, KNOT[0] - 3 - i, y - (thick >> 1), 1, thick, ink);
      }

    // the earring: a hoop swinging from the ear, a glint going round it as it swings
    const a = 0.5 * Math.sin((u / 2) * 2 * Math.PI);
    const ex = Math.round(EAR[0] + 4.2 * Math.sin(-a)), ey = Math.round(EAR[1] + 4.2 * Math.cos(a));
    for (let y = ey - 4; y <= ey + 4; y++)
      for (let x = ex - 4; x <= ex + 4; x++) {
        const d = Math.hypot(x - ex, y - ey);
        if (d >= 2.4 && d < 3.8) set(p, x, y, GOLD);
      }
    set(p, EAR[0], EAR[1], GOLD);
    const g = Math.floor(u / 0.25 + 1e-6) % 8;
    if (g < 3) rect(p, ex - 3 + g, (ey + [0, 2, 3][g]) & ~1, 1, 2, BONE);
    return emit(p, color);
  };
}
