/*
 * profile-roger: the skull and crossbones with the skull seen from the side,
 * facing right: a long cranium swelling out at the back, a brow ridge, one
 * deep eye socket, the notch of the nose, a cheekbone, and a lower jaw hung
 * on its hinge behind the cheek. The jaw swings open and shut in a slow
 * chatter, and an ember smoulders in the socket.
 *
 * Pixel art in block elements, two square pixels a cell, in three flat
 * colours. The skull is an outline filled pixel by pixel, with its right-hand
 * edges in shade, and the jaw is the same outline turned about its hinge;
 * black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "profile roger",
  category: "scenes",
  note: "a skull in profile over crossed bones, its jaw chattering, eye aglow",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, and the ember's gold
  palette: ["#e8e2d0", "#9c9682", "#f2b632"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, GOLD = 3;

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
// A round-ended bar from one point to another, `r` either side of its middle.
const bar = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, r: number, k: number) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) disc(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, r, k);
};
// A bone from one end to the other: a shaft, and two round knuckles at each end.
const bone = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number) => {
  const l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l;
  bar(p, x0, y0, x1, y1, 1.9, k);
  for (const [x, y, s] of [[x0, y0, -1], [x1, y1, 1]])
    for (const side of [-1, 1]) disc(p, x + ux * s * 1.5 - uy * side * 3, y + uy * s * 1.5 + ux * side * 3, 2.7, 2.7, k);
};
// Bone's right-hand edges in its shade, as if lit from the left; a gap one pixel wide casts none.
const shade = (p: Uint8Array) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (p[y * W + x] === BONE && (x > W - 3 || (!p[y * W + x + 1] && !p[y * W + x + 2]))) p[y * W + x] = SHADE;
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

// ---- the skull, facing right

// The face, from the forehead round by the brow, the nose and the top teeth to the base of the skull.
const FACE = [[44, 9], [51, 13], [55.5, 18], [58.5, 20], [58.5, 22.5], [57, 24.5], [60.5, 29], [55.5, 30], [55, 32.5], [57.5, 33.5], [57, 40.5], [44.5, 40.5], [43.5, 36], [38, 35.5], [30, 30], [36, 12]];
// The jaw, shut: up the ramus to the hinge, along the teeth, round the chin and back to its angle.
const JAW = [[36.5, 37.5], [39, 36.5], [41.5, 38], [42.5, 42.5], [56.5, 42.5], [57.5, 46], [56, 50.5], [51, 51.5], [43, 49.5], [38, 49], [36, 46]];
const HINGE = [39, 38];
const OPEN = [0, 4, 8, 13]; // how far the jaw hangs open in each of its positions, in degrees
const CHATTER = [0, 1, 2, 3, 2, 1];
// A suture over the crown, and a crack behind it.
const SUTURE = [[41, 8], [41, 9], [40, 10], [40, 11], [39, 12], [40, 13], [39, 14], [38, 15], [38, 16], [37, 17], [38, 18], [37, 19], [36, 20], [36, 21]];
const CRACK = [[27, 12], [28, 13], [28, 14], [29, 15], [30, 15], [31, 16], [29, 16], [28, 17]];
const EMBER = [["g"], [".g.", "ggg", ".g."], ["gg", "gg"]];
const LOOP = 4.8;

export default function profileRoger(): Frame {
  const turned = (deg: number) => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return (x: number, y: number) => [HINGE[0] + (x - HINGE[0]) * c - (y - HINGE[1]) * s, HINGE[1] + (x - HINGE[0]) * s + (y - HINGE[1]) * c];
  };
  // the jaw in each position, its teeth parted by black lines
  const jaws = OPEN.map((deg) => {
    const shut = new Uint8Array(W * H), j = new Uint8Array(W * H), back = turned(-deg);
    poly(shut, JAW, BONE);
    for (let x = 46; x < 56; x += 3) rect(shut, x, 42, 1, 4, 0);
    // each pixel is the one it was turned from
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const [fx, fy] = back(x, y), sx = Math.round(fx), sy = Math.round(fy);
        if (sx >= 0 && sx < W && sy >= 0 && sy < H) j[y * W + x] = shut[sy * W + sx];
      }
    return j;
  });
  // what never moves: the bones, one over the other, and the skull over both, with room for the jaw to swing
  const still = new Uint8Array(W * H), b = new Uint8Array(W * H), sk = new Uint8Array(W * H);
  bone(still, 8, 9, 72, 57, BONE);
  bone(b, 72, 9, 8, 57, BONE);
  over(still, b);
  disc(sk, 37, 22, 16.5, 14.5, BONE);
  disc(sk, 31, 25, 11.5, 11, BONE);
  poly(sk, FACE, BONE);
  over(still, sk, 2, true);
  for (const j of jaws) over(still, j, 2, true);
  for (const j of jaws) for (let i = 0; i < j.length; i++) if (j[i]) still[i] = 0;
  // the socket under its brow, the cheekbone's arch, the ear, the teeth, the suture and the crack
  disc(still, 50, 25, 4.3, 4.6, 0);
  rect(still, 46, 20, 6, 1, BONE);
  line(still, 39, 31, 48, 31, 0);
  line(still, 48, 31, 50, 33, 0);
  rect(still, 40, 33, 6, 1, 0);
  rect(still, 36, 30, 2, 2, 0);
  for (let x = 47; x < 57; x += 3) rect(still, x, 37, 1, 4, 0);
  for (const [x, y] of [...SUTURE, ...CRACK]) set(still, x, y, 0);
  shade(still);
  jaws.forEach(shade);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    const j = jaws[CHATTER[Math.floor(u / 0.2 + 1e-6) % CHATTER.length]];
    for (let i = 0; i < j.length; i++) if (j[i]) p[i] = j[i];
    // the ember, small, flaring and settling
    const e = EMBER[[0, 1, 2, 1, 2, 0, 0, 2][Math.floor(u / 0.3 + 1e-6) % 8]];
    sprite(p, 50 - (e.length >> 1), 25 - (e.length >> 1), e, { g: GOLD });
    return emit(p, color);
  };
}
