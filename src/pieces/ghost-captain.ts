/*
 * ghost-captain: a grinning skull in a captain's tricorn, gold-trimmed, with a
 * clay pipe clenched in its teeth. Smoke rings rise from the pipe and spread
 * as they go, the pipe's ember glows, and embers flicker in its eyes.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat colours.
 * Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ghost captain",
  category: "scenes",
  note: "a skull in a tricorn puffing smoke rings from a clay pipe",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, the hat's felt, smoke, gold, ember
  palette: ["#e8e2d0", "#59616f", "#8a94a6", "#f2b632", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, FELT = 2, SMOKE = 3, GOLD = 4, EMBER = 5;

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

// ---- the captain

// The tricorn: its crown, a gold band round it, and a brim turned up to a point at each end, gold along its edge.
const HAT = [
  "............hhhh............",
  "..........hhhhhhhh..........",
  ".........hhhhhhhhhh.........",
  "g........hhhhhhhhhh........g",
  "gg......hhhhhhhhhhhh......gg",
  "hgg.....gggggggggggg.....ggh",
  "hhgg..gg____________gg..gghh",
  "hhhgggghhhhhhhhhhhhhhgggghhh",
  ".hhhhhhhhhhhhhhhhhhhhhhhhhh.",
  "..hhhhhhhhhhhhhhhhhhhhhhhh..",
  "....hhhhhhhhhhhhhhhhhhhh....",
];
// The skull from its brow down, the crown of it under the hat.
const SKULL = [
  ".#############.",
  "###############",
  "###############",
  "##___#####___##",
  "##____###____##",
  "##____###____##",
  "###__##_##__###",
  ".#####___#####.",
  "..###########..",
  "...#_#_#_#_#...",
  "...#########...",
];
const KEYS = { "#": BONE, h: FELT, g: GOLD };
const HX = 4, HY = 4; // the hat's top left pixel, two to each of its own
const SX = 10, SY = 28; // the skull's, three to each
const BOWL = [66, 45]; // the pipe bowl's top left pixel
const EYES = [[SX + 10, SY + 13], [SX + 31, SY + 13]]; // the middle of each socket
const LOOP = 6, RINGS = 3;

// A number from 0 to 1 for each whole number, the same every time.
const hash = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export default function ghostCaptain(): Frame {
  // what never moves: the hat, the skull and the pipe
  const still = new Uint8Array(W * H);
  sprite(still, HX, HY, HAT, KEYS, 2);
  sprite(still, SX, SY, SKULL, KEYS, 3);
  // the pipe: a black gap through the teeth, the stem out to the right, and the bowl standing on its end
  line(still, SX + 31, SY + 28, BOWL[0] + 2, BOWL[1] + 11, 0, 4);
  rect(still, BOWL[0] - 2, BOWL[1] - 2, 11, 16, 0);
  rect(still, BOWL[0], BOWL[1] + 2, 7, 11, BONE);
  rect(still, BOWL[0] - 1, BOWL[1] + 2, 9, 2, BONE);
  line(still, SX + 31, SY + 28, BOWL[0] + 2, BOWL[1] + 11, BONE, 2);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);
    // only onto empty pixels: the smoke passes behind everything
    const puff = (x: number, y: number, k: number) => {
      x = Math.round(x), y = Math.round(y);
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (x + i >= 0 && x + i < W && y + j >= 0 && y + j < H && !p[(y + j) * W + x + i]) p[(y + j) * W + x + i] = k;
    };

    // smoke rings: each rises from the bowl, drifts and widens, and breaks up as it goes
    for (let i = 0; i < RINGS; i++) {
      const age = (u + (i * LOOP) / RINGS) % LOOP, k = age / LOOP;
      const cx = BOWL[0] + 3 + 3 * Math.sin(k * 5 + i), cy = BOWL[1] - 4 - k * 40;
      const rx = 3 + 7 * Math.sqrt(k), ry = rx * 0.45, n = Math.ceil(rx * 5);
      for (let j = 0; j < n; j++) {
        if (k > 0.55 && hash(i * 131 + j) < (k - 0.55) * 2) continue;
        const a = (j / n) * 2 * Math.PI;
        puff(cx + rx * Math.cos(a) - 1, cy + ry * Math.sin(a) - 1, k > 0.7 ? FELT : SMOKE);
      }
    }
    // the ember in the bowl, flickering
    for (let x = 0; x < 5; x += 1) {
      const f = hash(Math.floor(u * 10) * 31 + x);
      rect(p, BOWL[0] + 1 + x, BOWL[1], 1, 2, f > 0.5 ? GOLD : EMBER);
    }
    // embers in the eyes: they smoulder, flare now and then, and go dark for a blink
    const blink = u > 4.1 && u < 4.35, flare = Math.sin(u * 2.1) * Math.sin(u * 5.3 + 1) > 0.35;
    if (!blink)
      for (const [x, y] of EYES) {
        rect(p, x, y, 3, 3, flare ? GOLD : EMBER);
        if (flare) rect(p, x - 3, y, 9, 3, EMBER), rect(p, x, y - 3, 3, 9, EMBER), rect(p, x, y, 3, 3, GOLD);
      }
    return emit(p, color);
  };
}
