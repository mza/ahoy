/*
 * sloop: a small single-masted pirate sloop, seen side-on, bow to the right.
 * She bobs on three rows of waves that scroll past, and the black flag at her
 * masthead flaps.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * The ship is drawn once and set down a pixel higher or lower each frame; black
 * gaps keep sail, mast, hull and sea apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sloop",
  category: "scenes",
  note: "a pirate sloop bobbing on pixel waves, her black flag flapping",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // the flag's iron shade, sea blue, wood, bone
  palette: ["#59616f", "#3a7ca5", "#a8703a", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const FLAG = 1, SEA = 2, WOOD = 3, BONE = 4;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
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
// A filled polygon, by scanline.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) set(p, x, y, k);
  }
};
// One canvas set down on another, `dy` pixels lower; empty pixels leave what is there.
const blit = (p: Uint8Array, src: Uint8Array, dy: number) => {
  for (let y = 0; y < H; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= H) continue;
    for (let x = 0; x < W; x++) if (src[sy * W + x]) p[y * W + x] = src[sy * W + x];
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

// ---- the sloop and her sea

const MAST = 39;
// The flag, flying towards the bow: three shapes, played there and back.
const FLAGS = [
  ["#####......", "#########..", "##oo#######", "##oo#######", "###########", "..#########", "......#####"],
  ["...........", "###########", "##oo#######", "##oo#######", "###########", "###########", "..........."],
  ["......#####", "..#########", "##oo#######", "##oo#######", "###########", "#########..", "#####......"],
];
// One wave, eight pixels long; a row of sea is this over and over.
const WAVE = ["..####..", "########", "##....##"];
const SEA_TOP = 50;
const LOOP = 8;

export default function sloop(): Frame {
  // what never changes shape: hull, mast, bowsprit and sails
  const ship = new Uint8Array(W * H);
  // the hull: a raised stern at the left, the bow rising to a point at the right
  poly(ship, [[10, 35], [25, 35], [25, 40], [60, 40], [69, 36], [59, 53], [17, 53]], WOOD);
  // three ports along her side
  for (const x of [30, 40, 50]) rect(ship, x, 44, 3, 2, 0);
  line(ship, 66, 36, 77, 31, WOOD, 2);
  rect(ship, MAST, 1, 2, 39, WOOD);
  // the big mainsail aft of the mast, under its gaff, and the jib out to the bowsprit
  poly(ship, [[36, 10], [36, 33], [8, 33], [8, 30], [20, 5]], BONE);
  poly(ship, [[43, 9], [43, 33], [70, 33]], BONE);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    // she rides up a pixel and down a pixel on a two-second swell
    const bob = [0, 1, 0, -1][Math.floor(u * 2) % 4];
    blit(p, ship, bob);
    sprite(p, MAST + 3, 1 + bob, FLAGS[[0, 1, 2, 1][Math.floor(u * 6) % 4]], { "#": FLAG, o: BONE });
    // the sea closes over her keel: a black gap, then rows of waves, each sliding its own way
    rect(p, 0, SEA_TOP - 1, W, H - SEA_TOP + 1, 0);
    for (let r = 0; r < 3; r++) {
      const off = Math.floor(u * [3, -2, 5][r]) + r * 4;
      for (let x = 0; x < W; x++)
        for (let j = 0; j < 3; j++) if (WAVE[j][(((x + off) % 8) + 8) % 8] === "#") set(p, x, SEA_TOP + r * 5 + j, SEA);
    }
    return emit(p, color);
  };
}
