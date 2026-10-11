/*
 * sloop: a small single-masted pirate sloop, seen side-on, bow to the right.
 * She bobs on rows of swell that slide past, foam on the crests, and the black
 * flag at her masthead ripples.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours: plank seams, ports and a rail on the hull, a
 * reef band on the mainsail, stays from the masthead, the sails shaded down
 * their right-hand edges. The ship is drawn once and set down a pixel higher
 * or lower each frame. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sloop",
  category: "scenes",
  note: "a pirate sloop bobbing on the swell, her black flag rippling",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sea blue, the flag's iron shade, wood, bone's shade, bone
  palette: ["#3a7ca5", "#59616f", "#a8703a", "#b9b2a0", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const SEA = 1, FLAG = 2, WOOD = 3, SHADE = 4, BONE = 5;

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
// The top of the hull at each column: a sheer that rises to bow and stern, and a raised deck aft.
const deck = (x: number) => 39 - Math.round(4 * ((x - 40) / 31) ** 2);
const sheer = (x: number) => deck(x) - (x < 25 ? 3 : 0);
// A swell, sixteen pixels long: how far below its crest the water is at each pixel.
const SWELL = Array.from({ length: 16 }, (_, i) => Math.round(1 - Math.cos((i / 16) * 2 * Math.PI)));
// The skull on the flag.
const SKULL = [".ooo.", "o_o_o", "ooooo", ".o_o."];
const SEA_TOP = 51;
const LOOP = 8;

export default function sloop(): Frame {
  // what never changes shape: hull, spars, sails and rigging
  const ship = new Uint8Array(W * H);
  const hull = (x: number, y: number) =>
    x >= Math.max(9, 9 + Math.round((y - 33) * 0.45)) && x <= 71 - Math.round(14 * Math.max(0, (y - 35) / 19) ** 1.5) && y >= sheer(x) && y < 56;
  for (let y = 30; y < 56; y++) for (let x = 0; x < W; x++) if (hull(x, y)) set(ship, x, y, WOOD);
  // a rail and two plank seams following the sheer, three ports, two lights in the stern
  for (let x = 0; x < W; x++) for (const d of [2, 7, 12]) if (hull(x - 1, deck(x) + d) && hull(x + 1, deck(x) + d)) set(ship, x, deck(x) + d, 0);
  for (const x of [31, 41, 51]) rect(ship, x, deck(x) + 4, 2, 2, 0);
  for (const x of [14, 19]) rect(ship, x, deck(x), 2, 1, 0);
  line(ship, 67, 36, 79, 30, WOOD);
  line(ship, 67, 37, 79, 31, WOOD);
  // the mainsail aft of the mast, between gaff and boom, and the jib
  poly(ship, [[37, 11], [37, 31], [9, 32], [18, 6]], BONE);
  poly(ship, [[43, 8], [43, 31], [74, 31]], BONE);
  // a reef band across the mainsail, its points hanging from it, and a seam down each sail
  line(ship, 11, 25, 37, 24, 0);
  for (let x = 14; x < 36; x += 4) rect(ship, x, 27, 1, 2, 0);
  line(ship, 27, 9, 24, 23, SHADE), line(ship, 24, 26, 23, 31, SHADE);
  line(ship, 52, 16, 52, 30, SHADE);
  for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) if (ship[y * W + x] === BONE && !ship[y * W + x + 1]) ship[y * W + x] = SHADE;
  // the stays: forestay to the bowsprit's tip, halyard to the gaff's peak
  line(ship, MAST + 2, 3, 78, 29, SHADE);
  line(ship, MAST - 1, 3, 18, 3, SHADE);
  line(ship, 38, 9, 17, 4, WOOD);
  line(ship, 38, 33, 7, 34, WOOD);
  rect(ship, MAST, 1, 2, 38, WOOD);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    // she rides up a pixel and down a pixel on a two-second swell
    const bob = [0, 1, 0, -1][Math.floor(u * 2) % 4];
    blit(p, ship, bob);
    // the flag, a ripple running out along it, the skull riding the cloth
    const ph = Math.floor(u * 8);
    for (let i = 0; i < 13; i++) {
      const dy = Math.round(Math.sin(((i - ph) / 8) * 2 * Math.PI) * 1.4 * (i / 12));
      rect(p, MAST + 3 + i, 2 + bob + dy, 1, i > 10 ? 6 : 8, FLAG);
      if (i >= 3 && i < 8) SKULL.forEach((row, j) => row[i - 3] !== "." && set(p, MAST + 3 + i, 4 + bob + dy + j, row[i - 3] === "o" ? BONE : 0));
    }
    // the sea closes over her keel: a black gap, then rows of swell, each sliding its own way, foam on some crests
    rect(p, 0, SEA_TOP - 1, W, H - SEA_TOP + 1, 0);
    for (let r = 0; r < 4; r++) {
      const off = Math.floor(u * [4, -2, 6, -4][r]) + r * 5;
      for (let x = 0; x < W; x++) {
        const i = (((x + off) % 16) + 16) % 16, y = SEA_TOP + r * 3 + (r > 0 ? 2 + (SWELL[i] >> 1) : SWELL[i]);
        set(p, x, y, SEA);
        if (r === 0) set(p, x, y + 1, SEA);
        if (i < 3 && (Math.floor((x + off) / 16) + r) % 3 === 0) set(p, x, y, BONE);
      }
    }
    return emit(p, color);
  };
}
