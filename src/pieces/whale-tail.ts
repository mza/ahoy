/*
 * whale-tail: a whale's flukes standing out of the sea, broad and even, water
 * streaming off them. They hang there, slide back under with a splash, the
 * sea rolls on empty for a moment, and they rise again.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in four flat colours. The flukes are one mirrored outline, a curve
 * through a few points, filled, shaded down their right-hand edges and flecked
 * with barnacles; the water is thin lines; the waves are one-pixel crests that
 * roll a pixel at a time. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "whale tail",
  category: "scenes",
  note: "a whale's flukes rise dripping from the waves and slide back under",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // whale iron and its shade, sea blue, and bone for spray, foam and barnacles
  palette: ["#8a94a6", "#59616f", "#3a7ca5", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, SHADE = 2, BLUE = 3, BONE = 4;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
};
// A filled outline: a pixel is inside if a ray to its left crosses the edges an odd number of times.
const poly = (p: Uint8Array, pts: [number, number][], k: number) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < xi + ((xj - xi) * (y + 0.5 - yi)) / (yj - yi)) inside = !inside;
      }
      if (inside) set(p, x, y, k);
    }
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

// ---- the tail

const CX = 40, TOP = 2, SEA = 46; // the sea's top pixel row: the tail shows above it
type Pt = [number, number];
// Half the outline, as [pixels out from the middle, pixels down]: from the notch along the trailing edge
// to the tip, and from the tip back along the leading edge and down the stalk. Each is a curve through its points.
const TRAIL: Pt[] = [[0, 10], [1, 8], [4, 5], [11, 2], [20, 0], [29, 1], [35, 5], [39, 11], [41, 20]];
const LEAD: Pt[] = [[41, 20], [37, 15], [30, 12], [22, 13], [15, 17], [10, 24], [7, 32], [5.5, 41], [6, 50], [8, 62]];
const curve = (pts: Pt[]): Pt[] => {
  const out: Pt[] = [];
  const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++)
    for (let n = 0; n < 6; n++) {
      const u = n / 6, a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
      const f = (k: 0 | 1) => 0.5 * (2 * b[k] + (c[k] - a[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u * u + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * u * u * u);
      out.push([f(0), f(1)]);
    }
  return out;
};
// Barnacles and scars, as [pixels out from the middle, pixels down]: little clusters, mostly near the tips.
const FLECKS: Pt[] = [
  [-33, 8], [-31, 6], [-36, 13], [-26, 5], [-20, 9], [-12, 6], [32, 6], [35, 11], [28, 8], [21, 5], [10, 13], [-1, 24], [2, 34],
];
const HANG = 2.6, SINK = 1.5, GONE = 1.3, RISE = 1.8;
const LOOP = HANG + SINK + GONE + RISE;
const DEEP = SEA; // how far down the tail goes

export default function whaleTail(): Frame {
  // what never changes shape: the tail, lit from the left, its right-hand edges in shade
  const tail = new Uint8Array(W * H);
  const half = [...curve(TRAIL), ...curve(LEAD), LEAD[LEAD.length - 1]];
  poly(tail, [...half.map(([x, y]): Pt => [CX + 0.5 + x, TOP + y]), ...half.reverse().map(([x, y]): Pt => [CX + 0.5 - x, TOP + y])], IRON);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tail[y * W + x] === IRON && !tail[y * W + x + 1]) tail[y * W + x] = SHADE;
  // a second pixel of shade down the stalk and under the right fluke, where it turns from the light
  for (let y = TOP + 14; y < H; y++) for (let x = CX; x < W - 1; x++) if (tail[y * W + x] === IRON && tail[y * W + x + 1] === SHADE) tail[y * W + x] = SHADE, x++;
  for (const [x, y] of FLECKS) if (tail[(TOP + y) * W + CX + x] === IRON) tail[(TOP + y) * W + CX + x] = BONE;
  // the under edge of the flukes, column by column, for the water to run off
  const under: number[] = [];
  for (let x = 0; x < W; x++) {
    let y = -1;
    for (let j = 0; j < H; j++) if (tail[j * W + x]) y = j;
    under.push(Math.abs(x - CX) > 9 ? y : -1);
  }

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    // how far the tail has sunk, in whole pixels
    let k = 0;
    if (u >= HANG && u < HANG + SINK) k = ((u - HANG) / SINK) ** 2;
    else if (u >= HANG + SINK && u < LOOP - RISE) k = 1;
    else if (u >= LOOP - RISE) k = (1 - (u - (LOOP - RISE)) / RISE) ** 2;
    const dy = Math.round(k * DEEP);

    for (let y = 0; y + dy < SEA - 1; y++) for (let x = 0; x < W; x++) if (tail[y * W + x]) p[(y + dy) * W + x] = tail[y * W + x];

    // water running off the flukes: thin lines falling to the sea, thick and fast while it is fresh out
    const wet = u < 1.2 || u > LOOP - RISE;
    for (let x = 2; x < W - 1; x += wet ? 2 : 3) {
      if (under[x] < 0) continue;
      const from = under[x] + dy + 2, fall = SEA - 2 - from, h = (x * 7) % 5;
      if (fall < 3) continue;
      const f = (t * (0.9 + h * 0.07) + ((x * 37) % 17) / 17) % 1, len = 2 + h;
      const y = from + Math.round((fall + len) * f * f) - len;
      for (let j = Math.max(y, from); j < Math.min(y + len, from + fall); j++) set(p, x, j, BONE);
      // and a bead of it gathering on the edge
      if (f < 0.25) set(p, x, from - 1, BONE);
    }

    // rings of foam where the stalk breaks the sea
    if (dy < DEEP - 8) {
      let a = W, b = -1;
      for (let x = 0; x < W; x++) if (p[(SEA - 2) * W + x]) (a = Math.min(a, x)), (b = Math.max(b, x));
      if (b >= 0) {
        const r = Math.floor(t * 5) % 3;
        for (const s of [-1, 1]) {
          const x = s < 0 ? a - 2 : b + 2;
          for (let i = 0; i < 4 + r; i++) set(p, x + s * i, SEA - 1, BONE);
          for (let i = 6 + r; i < 8 + 2 * r; i++) set(p, x + s * i, SEA - 1, BONE);
          set(p, x + s * (1 + r), SEA - 3, BONE);
        }
      }
    }

    // the splash as the flukes go under: drops thrown up and out, falling back
    const s = (u - (HANG + SINK * 0.72)) / 1.2;
    if (s > 0 && s < 1) {
      for (let i = 0; i < 44; i++) {
        const side = i % 2 ? 1 : -1, n = i >> 1, h = (n * 7) % 11;
        const x = CX + side * Math.round(2 + n * 1.5 + s * (2 + h * 1.6));
        const y = SEA - 2 - Math.round((5 + h * 2.4) * 4 * s * (1 - s));
        if (!p[y * W + x]) rect(p, x, y, 1, h % 3 ? 1 : 2, BONE);
      }
      // and the foam it leaves on the sea, spreading and breaking up
      const reach = Math.round(10 + 26 * s);
      if (dy >= DEEP - 2) for (let x = CX - reach; x <= CX + reach; x++) if ((x * 5 + Math.floor(s * 6)) % 7 < 5 - Math.floor(s * 4)) set(p, x, SEA - 1, BONE);
    }

    // the sea: three lines of waves, each rolling its own way, heavier on the crests, flecked with foam
    for (let band = 0; band < 3; band++) {
      const shift = Math.floor(t * (5 + band * 3)) * (band % 2 ? -1 : 1), base = SEA + 4 + band * 6;
      let last = -1;
      for (let x = -1; x < W; x++) {
        const a = ((x + shift + band * 5) / (16 + band * 3)) * 2 * Math.PI;
        const y = base + Math.round(-2 * Math.sin(a));
        if (last >= 0) for (let j = Math.min(y, last); j <= Math.max(y, last); j++) if (j !== last || y === last) set(p, x, j, BLUE);
        if (Math.sin(a) > 0.5) set(p, x, y + 1, BLUE);
        if (Math.sin(a) > 0.8 && Math.cos(a) > 0 && (x + shift) % 3 === 0) set(p, x, y - 2, BONE);
        last = y;
      }
    }
    return emit(p, color);
  };
}
