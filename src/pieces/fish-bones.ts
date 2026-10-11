/*
 * fish-bones: the skeleton of a fish, side-on and still swimming. A wave runs
 * down its spine from head to tail, so the ribs rise, fall and lean in turn
 * and the forked tail sweeps after them; its jaw drops open and snaps shut,
 * and a red spark sits in its eye socket.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in two flat colours. The skull and jaw are outlines, curves through
 * a few points, filled, the jaw turned about its hinge; the ribs and the rays
 * of the tail are single-pixel curves riding the wave. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "fish bones",
  category: "scenes",
  note: "a fish skeleton swimming on: ribs rippling, jaw snapping, eye lit",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, and the red in its eye
  palette: ["#e8e2d0", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, RED = 2;

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
type Pt = [number, number];
// A filled outline: a pixel is inside if a ray to its left crosses the edges an odd number of times.
const poly = (p: Uint8Array, pts: Pt[], k: number) => {
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (const [x, y] of pts) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, y1); y++)
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, x1); x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < xi + ((xj - xi) * (y + 0.5 - yi)) / (yj - yi)) inside = !inside;
      }
      if (inside) set(p, x, y, k);
    }
};
// A smooth curve through points, as many more points.
const curve = (pts: Pt[]): Pt[] => {
  const out: Pt[] = [];
  const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++)
    for (let n = 0; n < 6; n++) {
      const u = n / 6, a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
      const f = (k: 0 | 1) => 0.5 * (2 * b[k] + (c[k] - a[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u * u + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * u * u * u);
      out.push([f(0), f(1)]);
    }
  out.push(pts[pts.length - 1]);
  return out;
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

// ---- the fish, nose to the left

// The skull: over the crown from the snout to the back of the head, then forward along the mouth, tooth by tooth.
const CROWN: Pt[] = [[2, 36], [2.5, 32], [6, 26], [12, 20], [20, 15.5], [28, 14], [33, 16], [35.5, 22], [36, 30], [35, 37]];
const TEETH = [23, 19, 15, 11, 7]; // the middle column of each upper tooth; the lower ones sit between
const SKULL: Pt[] = [...curve(CROWN), [26, 37], ...TEETH.flatMap((x): Pt[] => [[x + 2, 37], [x + 0.5, 40], [x - 1, 37]]), [3, 37]];
// The jaw: along its teeth from the hinge to the chin, and back under.
const HINGE: Pt = [33, 40];
const JAW: Pt[] = [
  [35, 39], [27, 41.2], ...[25, 21, 17, 13, 9].flatMap((x): Pt[] => [[x + 2, 41.2], [x + 0.5, 38.4], [x - 1, 41.2]]), [5, 41.2],
  ...curve([[5, 42.5], [8, 46], [15, 48.5], [24, 48.5], [31, 46], [35, 42]]),
];
const EYE: Pt = [17.5, 26.5];
// The gill: a line down the back of the skull, as [column, row]s.
const GILL: Pt[] = [[30, 18], [30, 19], [31, 20], [31, 21], [31, 22], [32, 23], [32, 24], [32, 25], [32, 26], [32, 27], [32, 28], [32, 29], [31, 30], [31, 31], [31, 32], [30, 33], [30, 34]];
const CRACK: Pt[] = [[22, 15], [22, 16], [23, 17], [22, 18], [22, 19], [21, 20], [24, 18]];
const CY = 33; // the spine's pixel row at rest
const SPINE0 = 37, RIB0 = 39, STEP = 4; // where the spine starts, the first rib's column, and the columns between ribs
const RIBS = [16, 19, 19, 17, 14, 11, 8]; // how long each pair is, head to tail
const TAIL = RIB0 + RIBS.length * STEP - 1;
// The tail fin, from the end of the spine: its forked outline, and the turn in degrees of each slit between its rays.
const FIN: Pt[] = [[0, -2], [4, -8], [9, -14], [13, -18], [12.5, -10], [9.5, -3], [7.5, 0], [9.5, 3], [12.5, 10], [13, 18], [9, 14], [4, 8], [0, 2]];
const SLITS = [-47, -33, 33, 47];
const SWIM = 1.2, LOOP = 2 * SWIM; // one wave down the spine, and one snap of the jaw every two

export default function fishBones(): Frame {
  // what never moves: the skull, its socket, the spark in it, a gill line, a crack, a nostril
  const still = new Uint8Array(W * H);
  poly(still, SKULL, BONE);
  disc(still, EYE[0], EYE[1], 5.6, 5.6, 0);
  disc(still, EYE[0], EYE[1], 2.1, 2.1, RED);
  for (const [x, y] of [...GILL, ...CRACK, [6, 31], [7, 32]]) set(still, x, y, 0);

  // the jaw at each angle it has been asked for, as the pixels it covers
  const jaws = new Map<number, number[]>();
  const jaw = (open: number) => {
    let at = jaws.get(open);
    if (!at) {
      const q = new Uint8Array(W * H), c = Math.cos(open), s = Math.sin(open);
      poly(q, JAW.map(([x, y]): Pt => [HINGE[0] + (x - HINGE[0]) * c + (y - HINGE[1]) * s, HINGE[1] - (x - HINGE[0]) * s + (y - HINGE[1]) * c]), BONE);
      at = [];
      for (let i = 0; i < q.length; i++) if (q[i]) at.push(i);
      jaws.set(open, at);
    }
    return at;
  };

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);

    // the jaw: it swings open about its hinge, hangs, and snaps shut
    const open = (u < 0.5 ? 0 : u < 0.8 ? (u - 0.5) / 0.3 : u < 1.3 ? 1 : u < 1.4 ? 0.4 : 0) * 0.34;
    for (const i of jaw(Math.round(open * 50) / 50)) p[i] = BONE;

    // the wave down the spine: every column of it rides the wave, more the nearer the tail
    const wave = (x: number) => (2 * Math.PI * t) / SWIM - (x - SPINE0) * 0.2;
    const lift = (x: number) => Math.round((0.4 + (x - SPINE0) * 0.11) * Math.sin(wave(x)));
    for (let x = SPINE0; x <= TAIL + 2; x++) rect(p, x, CY - 1 + lift(x), 1, 2, BONE);
    // the ribs: a knuckle on the spine and a thin curve up and down from it, leaning as the wave passes
    RIBS.forEach((len, i) => {
      const x = RIB0 + i * STEP, y = CY + lift(x), lean = 4 + 1.6 * Math.cos(wave(x));
      rect(p, x - 1, y - 2, 3, 4, BONE);
      for (const side of [-1, 1]) {
        const n = side < 0 ? len : len - 2;
        for (let j = 0; j <= n; j++) {
          const rx = x + Math.round(lean * (j / len) ** 1.7), ry = side < 0 ? y - 3 - j : y + 2 + j;
          set(p, rx, ry, BONE);
          if (j < 3) set(p, rx + 1, ry, BONE);
        }
      }
    });
    // the tail: a forked fin on the end of the spine, slit between its rays, sweeping last
    const y = CY + lift(TAIL + 1), sway = 0.16 * Math.sin(wave(TAIL + 6));
    const c = Math.cos(sway), s = Math.sin(sway);
    rect(p, TAIL, y - 2, 3, 4, BONE);
    poly(p, FIN.map(([fx, fy]): Pt => [TAIL + 1.5 + fx * c - fy * s, y + fx * s + fy * c]), BONE);
    for (const deg of SLITS) {
      const a = (deg * Math.PI) / 180 + sway;
      for (let j = 11; j <= (Math.abs(deg) > 40 ? 34 : 24); j++) set(p, Math.floor(TAIL + 1.5 + (Math.cos(a) * j) / 2), Math.floor(y + (Math.sin(a) * j) / 2), 0);
    }
    return emit(p, color);
  };
}
