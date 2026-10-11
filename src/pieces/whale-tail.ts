/*
 * whale-tail: a whale's flukes standing out of the sea, broad and even, water
 * streaming off them. They hang there, slide back under with a splash, the
 * sea rolls on empty for a moment, and they rise again.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * The flukes are one mirrored outline, filled; the waves are stepped bands
 * that scroll a pixel at a time. Black gaps keep the shapes apart, so it reads
 * in one ink too.
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
  // spray bone, whale iron and its shade, sea blue
  palette: ["#e8e2d0", "#8a94a6", "#59616f", "#3a7ca5"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, IRON = 2, SHADE = 3, BLUE = 4;

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
// Half the outline, as [pixels out from the middle, pixels down]: the notch, the trailing edge out to
// the tip, back along the leading edge, and down the stalk.
const HALF: [number, number][] = [
  [0, 9], [4, 5], [12, 2], [22, 1], [31, 3], [36, 7], [39, 12], [40, 19], [34, 14],
  [26, 13], [18, 16], [11, 22], [7, 30], [5, 38], [6, 48], [9, 62],
];
const DRIPS = [-36, -29, -21, -13, 13, 21, 29, 36]; // where water runs off, out from the middle
const HANG = 2.6, SINK = 1.5, GONE = 1.3, RISE = 1.8;
const LOOP = HANG + SINK + GONE + RISE;
const DEEP = SEA; // how far down the tail goes

export default function whaleTail(): Frame {
  // what never changes shape: the tail, lit from the left, its right edges in shade
  const tail = new Uint8Array(W * H);
  poly(tail, [...HALF.map(([x, y]): [number, number] => [CX + x, TOP + y]), ...HALF.slice(1).reverse().map(([x, y]): [number, number] => [CX - x, TOP + y])], IRON);
  for (let y = 0; y < H; y++)
    for (let x = W - 1; x >= 0; x--) if (tail[y * W + x] === IRON && y > 2 && tail[(y - 3) * W + x] && (!tail[y * W + x + 1] || !tail[y * W + x + 2])) tail[y * W + x] = SHADE;
  // the under edge of the flukes above each drip
  const under = DRIPS.map((d) => {
    let y = 0;
    for (let j = 0; j < H; j++) if (tail[j * W + CX + d]) y = j;
    return y;
  });

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    // how far the tail has sunk, in whole pixels
    let k = 0;
    if (u >= HANG && u < HANG + SINK) k = ((u - HANG) / SINK) ** 2;
    else if (u >= HANG + SINK && u < LOOP - RISE) k = 1;
    else if (u >= LOOP - RISE) k = (1 - (u - (LOOP - RISE)) / RISE) ** 2;
    const dy = Math.round(k * DEEP);

    for (let y = 0; y + dy < SEA - 2; y++) for (let x = 0; x < W; x++) if (tail[y * W + x]) p[(y + dy) * W + x] = tail[y * W + x];

    // water running off the flukes: short streaks falling to the sea, more of them while it is fresh out
    const wet = u < 1.4 || u > LOOP - RISE;
    DRIPS.forEach((d, i) => {
      for (let n = 0; n < (wet ? 2 : 1); n++) {
        const from = under[i] + dy + 3, fall = SEA - 5 - from;
        if (fall < 4) continue;
        const f = (t * 1.1 + i * 0.37 + n * 0.5) % 1;
        const y = from + Math.round(fall * f * f);
        rect(p, CX + d, y, 2, 3, BONE);
      }
    });

    // foam where the tail breaks the sea, a gap away on either side
    if (dy < DEEP - 8) {
      const row = SEA - 3;
      let a = W, b = -1;
      for (let x = 0; x < W; x++) if (p[row * W + x] === IRON || p[row * W + x] === SHADE) (a = Math.min(a, x)), (b = Math.max(b, x));
      if (b >= 0) {
        const flip = Math.floor(t * 4) % 2;
        rect(p, a - 7, SEA - 2, 5, 2, BONE);
        rect(p, b + 3, SEA - 2, 5, 2, BONE);
        rect(p, a - 5 - 2 * flip, SEA - 4, 2, 2, BONE);
        rect(p, b + 4 + 2 * flip, SEA - 4, 2, 2, BONE);
      }
    }

    // the splash as the flukes go under: drops thrown up and out, falling back
    const s = (u - (HANG + SINK * 0.72)) / 1.1;
    if (s > 0 && s < 1) {
      for (let i = 0; i < 16; i++) {
        const side = i % 2 ? 1 : -1, n = i >> 1;
        const x = CX + side * (3 + n * 4 + Math.round(s * (3 + n * 2)));
        const y = SEA - 3 - Math.round((8 + ((n * 7) % 5) * 4) * 4 * s * (1 - s));
        rect(p, x, y, 2, n % 3 ? 2 : 4, BONE);
      }
      // and the foam it leaves on the sea, spreading and thinning
      const reach = Math.round(8 + 24 * s);
      if (dy >= DEEP - 2) for (let x = CX - reach; x < CX + reach; x += 6) if (s < 0.5 || ((x - CX + 600) / 6) % 2 < 1) rect(p, x + 1, SEA - 2, 4, 2, BONE);
    }

    // the sea: three bands of stepped waves, each rolling its own way
    for (let band = 0; band < 3; band++) {
      const shift = Math.floor(t * (6 + band * 3)) * (band % 2 ? -1 : 1);
      for (let x = 0; x < W; x++) {
        const y = SEA + 3 + band * 6 + Math.round(1.4 * Math.sin(((x + shift + band * 5) / 16) * 2 * Math.PI));
        rect(p, x, y, 1, 2, BLUE);
      }
    }
    return emit(p, color);
  };
}
